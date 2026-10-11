/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const {openStore} = require('../../server/src/db');
const {createApp} = require('../../server/src/app');
const {PASSWORD, testConfig} = require('./helpers');

const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), `sk-${name}-`));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64, 1)]);

const setup = configOverrides => {
    const uploadsDir = tmp('uploads');
    const store = openStore(':memory:');
    const config = testConfig(Object.assign({uploadsDir}, configOverrides));
    const app = createApp({store, config});
    return {app, uploadsDir};
};

const admin = ctx => {
    const agent = request.agent(ctx.app);
    return agent.post('/api/admin/login').send({password: PASSWORD}).expect(200).then(() => agent);
};

const upload = (agent, body) => agent.post('/api/admin/upload').set('Content-Type', 'application/octet-stream').send(body);

describe('yükleme', () => {
    test('png yüklenir, rastgele adla saklanır ve sunulur', () => {
        const ctx = setup();
        let agent;
        return admin(ctx).then(a => {
            agent = a;
            return upload(agent, PNG).expect(201);
        }).then(res => {
            expect(res.body.url).toMatch(/^\/uploads\/[0-9a-f]{24}\.png$/);
            expect(fs.readdirSync(ctx.uploadsDir)).toHaveLength(1);
            return request(ctx.app).get(res.body.url)
                .expect(200)
                .expect('Content-Type', /image\/png/)
                .expect('X-Content-Type-Options', 'nosniff')
                .expect('Cache-Control', /immutable/);
        }).then(res => expect(Buffer.compare(res.body, PNG)).toBe(0));
    });

    test('sb3 (zip) yüklenir', () => {
        const ctx = setup();
        return admin(ctx).then(agent => upload(agent, ZIP).expect(201))
            .then(res => expect(res.body.url).toMatch(/\.sb3$/));
    });

    test('istemcinin bildirdiği tür ve dosya adı yok sayılır, içerik belirler', () => {
        const ctx = setup();
        return admin(ctx).then(agent => agent.post('/api/admin/upload?name=../../etc/passwd.html')
            .set('Content-Type', 'text/html').send(PNG).expect(201))
            .then(res => {
                expect(res.body.url).toMatch(/^\/uploads\/[0-9a-f]{24}\.png$/);
                expect(fs.readdirSync(ctx.uploadsDir).every(f => /^[0-9a-f]{24}\.png$/.test(f))).toBe(true);
            });
    });

    test('SVG, HTML ve çalıştırılabilir içerik 415', () => {
        const ctx = setup();
        return admin(ctx).then(agent => Promise.all([
            upload(agent, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')).expect(415),
            upload(agent, Buffer.from('<!doctype html><script>alert(1)</script>')).expect(415),
            upload(agent, Buffer.concat([Buffer.from('MZ'), Buffer.alloc(40)])).expect(415)
        ])).then(results => {
            results.forEach(res => expect(res.body.error).toContain('Desteklenmeyen dosya türü'));
            expect(fs.readdirSync(ctx.uploadsDir)).toHaveLength(0);
        });
    });

    test('boş ya da çok küçük gövde 400', () => {
        const ctx = setup();
        return admin(ctx).then(agent => upload(agent, Buffer.alloc(0)).expect(400)
            .then(() => upload(agent, Buffer.from([0x89, 0x50])).expect(400)))
            .then(res => expect(res.body.error).toBe('Dosya boş ya da çok küçük'));
    });

    test('görsel 5 MB sınırını aşarsa 413, dosya yazılmaz', () => {
        const ctx = setup();
        const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
        return admin(ctx).then(agent => upload(agent, big).expect(413))
            .then(res => {
                expect(res.body.error).toBe('Dosya çok büyük');
                expect(fs.readdirSync(ctx.uploadsDir)).toHaveLength(0);
            });
    });

    test('girişsiz yükleme 401; farklı Origin 403', () => {
        const ctx = setup();
        return upload(request(ctx.app), PNG).expect(401)
            .then(() => admin(ctx))
            .then(agent => upload(agent, PNG).set('Origin', 'https://kotu.example').expect(403));
    });

    test('/uploads dizin listelemez, olmayan ve gizli dosya 404, yol gezinmesi 404', () => {
        const ctx = setup();
        fs.writeFileSync(path.join(ctx.uploadsDir, '.gizli'), 'x');
        const notServed = res => expect([403, 404]).toContain(res.status);
        return Promise.all([
            request(ctx.app).get('/uploads/').expect(404),
            request(ctx.app).get('/uploads/yok.png').expect(404),
            request(ctx.app).get('/uploads/.gizli').expect(404),
            request(ctx.app).get('/uploads/..%2f..%2fpackage.json').expect(notServed),
            request(ctx.app).get('/uploads/%2e%2e/package.json').expect(notServed)
        ]);
    });
});

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
            .then(() => request(app).get('/uploads/yok.png').expect(404).expect('Cache-Control', 'no-store'));
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
