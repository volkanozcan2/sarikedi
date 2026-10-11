/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const {start} = require('../../server/src/index');
const {validLesson} = require('./helpers');

const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), `sk-${name}-`));

const get = (port, urlPath) => new Promise((resolve, reject) => {
    http.get({host: '127.0.0.1', port: port, path: urlPath}, res => {
        let data = '';
        res.on('data', chunk => {
            data += chunk;
        });
        res.on('end', () => resolve({status: res.statusCode, body: data}));
    }).on('error', reject);
});

describe('start', () => {
    test('veri klasörünü kurar, tohum dersleri ekler ve istekleri yanıtlar', () => {
        const dataDir = tmp('data');
        const seedDir = tmp('seed');
        fs.writeFileSync(path.join(seedDir, 'ders.json'), JSON.stringify(validLesson()));
        fs.writeFileSync(path.join(seedDir, 'bozuk.json'), '{bozuk');
        const logs = [];
        let running;
        return start({
            env: {PORT: '0', DATA_DIR: dataDir, SEED_DIR: seedDir},
            log: message => logs.push(message)
        }).then(result => {
            running = result;
            expect(fs.existsSync(path.join(dataDir, 'sarikedi.db'))).toBe(true);
            expect(fs.existsSync(path.join(dataDir, 'uploads'))).toBe(true);
            expect(logs.join('\n')).toContain('1 ders eklendi');
            expect(logs.join('\n')).toContain('bozuk.json');
            const port = running.server.address().port;
            return get(port, '/api/lessons');
        }).then(res => {
            expect(res.status).toBe(200);
            expect(JSON.parse(res.body).map(l => l.id)).toEqual(['ilk-ders']);
            return running.close();
        });
    });

    test('ikinci başlatmada mevcut ders ezilmez, tohum atlanır', () => {
        const dataDir = tmp('data');
        const seedDir = tmp('seed');
        fs.writeFileSync(path.join(seedDir, 'ders.json'), JSON.stringify(validLesson()));
        const env = {PORT: '0', DATA_DIR: dataDir, SEED_DIR: seedDir};
        const logs = [];
        return start({env, log: () => {}})
            .then(first => {
                first.store.replace('ilk-ders', validLesson({title: 'Panelden düzenlendi'}));
                return first.close();
            })
            .then(() => start({env, log: message => logs.push(message)}))
            .then(second => {
                expect(second.store.get('ilk-ders').title).toBe('Panelden düzenlendi');
                expect(logs.join('\n')).toContain('0 ders eklendi');
                return second.close();
            });
    });

    test('tohum klasöründeki assets/ dosyaları yükleme klasörüne kopyalanır ve sunulur (mevcut dosya ezilmez)', () => {
        const dataDir = tmp('data');
        const seedDir = tmp('seed');
        fs.mkdirSync(path.join(seedDir, 'assets'));
        fs.writeFileSync(path.join(seedDir, 'assets', 'bos-proje.sb3'), 'PK\x03\x04 yeni içerik');
        fs.writeFileSync(path.join(seedDir, 'assets', 'notlar.txt.json'), '{}');
        fs.mkdirSync(path.join(dataDir, 'uploads'), {recursive: true});
        fs.writeFileSync(path.join(dataDir, 'uploads', 'mevcut.png'), 'eski');
        fs.writeFileSync(path.join(seedDir, 'assets', 'mevcut.png'), 'yeni');
        let running;
        return start({env: {PORT: '0', DATA_DIR: dataDir, SEED_DIR: seedDir}, log: () => {}}).then(result => {
            running = result;
            expect(fs.readFileSync(path.join(dataDir, 'uploads', 'bos-proje.sb3'), 'utf8')).toContain('yeni içerik');
            expect(fs.readFileSync(path.join(dataDir, 'uploads', 'mevcut.png'), 'utf8')).toBe('eski');
            return get(running.server.address().port, '/uploads/bos-proje.sb3');
        }).then(res => {
            expect(res.status).toBe(200);
            return running.close();
        });
    });

    test('üretimde eksik gizli bilgiyle başlamayı reddeder', () => start({env: {NODE_ENV: 'production'}, log: () => {}})
        .then(
            () => {
                throw new Error('reddedilmeliydi');
            },
            error => expect(error.message).toContain('Ayar hatası')
        ));
});
