/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const {start} = require('../../server/src/index');

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
    test('veri klasörünü kurar ve istekleri yanıtlar', () => {
        const dataDir = tmp('data');
        let running;
        return start({env: {PORT: '0', DATA_DIR: dataDir}, log: () => {}}).then(result => {
            running = result;
            expect(fs.existsSync(path.join(dataDir, 'sarikedi.db'))).toBe(true);
            expect(fs.existsSync(path.join(dataDir, 'projects'))).toBe(true);
            return get(running.server.address().port, '/api/health');
        }).then(res => {
            expect(res.status).toBe(200);
            expect(JSON.parse(res.body)).toEqual({ok: true});
            return running.close();
        });
    });

    test('ikinci başlatmada mevcut veri korunur', () => {
        const dataDir = tmp('data');
        const env = {PORT: '0', DATA_DIR: dataDir};
        return start({env, log: () => {}})
            .then(first => {
                first.store.setRevokedBefore(12345);
                return first.close();
            })
            .then(() => start({env, log: () => {}}))
            .then(second => {
                expect(second.store.getRevokedBefore()).toBe(12345);
                return second.close();
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
