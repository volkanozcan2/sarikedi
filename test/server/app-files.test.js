/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const {openStore} = require('../../server/src/db');
const {createApp} = require('../../server/src/app');
const {testConfig} = require('./helpers');

const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), `sk-${name}-`));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);

const setup = configOverrides => {
    const store = openStore(':memory:');
    const config = testConfig(configOverrides);
    const app = createApp({store, config});
    return {app};
};

describe('statik GUI', () => {
    const makeStatic = () => {
        const dir = tmp('static');
        fs.mkdirSync(path.join(dir, 'chunks'));
        fs.mkdirSync(path.join(dir, 'static', 'assets'), {recursive: true});
        fs.writeFileSync(path.join(dir, 'index.html'), '<html>merhaba</html>');
        fs.writeFileSync(path.join(dir, 'gui.js'), 'console.log(1)');
        fs.writeFileSync(path.join(dir, 'chunks', 'a.abc123.js'), 'console.log(2)');
        fs.writeFileSync(path.join(dir, 'static', 'assets', 'x.png'), PNG);
        fs.writeFileSync(path.join(dir, '.env'), 'GIZLI=1');
        return dir;
    };

    test('staticDir verilmemişse GUI sunulmaz', () => {
        const {app} = setup();
        return request(app).get('/').expect(404);
    });

    test('index.html, no-cache; hash\'li dosyalar immutable', () => {
        const {app} = setup({staticDir: makeStatic()});
        return request(app).get('/').expect(200).expect('Cache-Control', 'no-cache')
            .then(res => {
                expect(res.text).toContain('merhaba');
                return request(app).get('/gui.js').expect(200).expect('Cache-Control', 'no-cache');
            })
            .then(() => request(app).get('/chunks/a.abc123.js').expect(200)
                .expect('Cache-Control', 'public, max-age=31536000, immutable'))
            .then(() => request(app).get('/static/assets/x.png').expect(200)
                .expect('Cache-Control', 'public, max-age=31536000, immutable'));
    });

    test('olmayan dosya 404 döner ve önbelleğe alınmaz (Cloudflare/tarayıcı 404\'ü saklamasın)', () => {
        const {app} = setup({staticDir: makeStatic()});
        return request(app).get('/chunks/yok.abc123.js').expect(404).expect('Cache-Control', 'no-store')
            .then(() => request(app).get('/uploads/yok.png').expect(404).expect('Cache-Control', 'no-store')); // /uploads artık sunulmaz
    });

    test('gizli dosyalar ve yol gezinmesi sunulmaz; /api statik dosyadan önce gelir', () => {
        const {app} = setup({staticDir: makeStatic()});
        const notServed = res => expect([403, 404]).toContain(res.status);
        return Promise.all([
            request(app).get('/.env').expect(404),
            request(app).get('/..%2f..%2fpackage.json').expect(notServed),
            request(app).get('/api/health').expect(200),
            request(app).get('/api/yok').expect(404)
        ]);
    });
});
