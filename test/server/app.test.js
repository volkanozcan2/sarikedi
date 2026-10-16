/** @jest-environment node */
const request = require('supertest');
const {openStore} = require('../../server/src/db');
const {createApp} = require('../../server/src/app');
const {createRateLimiter, createSessionToken} = require('../../server/src/auth');
const {PASSWORD, testConfig} = require('./helpers');

const setup = options => {
    const store = openStore(':memory:');
    const config = testConfig(options && options.config);
    const clock = {t: 1000000};
    const app = createApp({
        store: store,
        config: config,
        now: () => clock.t,
        rateLimiter: createRateLimiter({max: 5, windowMs: 900000, now: () => clock.t})
    });
    return {app, store, config, clock};
};

const login = (agent, password) => agent.post('/api/admin/login').send({password: password || PASSWORD});

describe('herkese açık API', () => {
    test('health', () => {
        const {app} = setup();
        return request(app).get('/api/health')
            .expect(200)
            .then(res => expect(res.body).toEqual({ok: true}));
    });

    test('bilinmeyen /api yolu JSON 404', () => {
        const {app} = setup();
        return request(app).get('/api/yok').expect(404)
            .then(res => expect(res.body.error).toBe('Bulunamadı'));
    });

    test('güvenlik başlıkları', () => {
        const {app} = setup();
        return request(app).get('/api/health')
            .expect('X-Content-Type-Options', 'nosniff')
            .expect('Referrer-Policy', 'same-origin')
            .then(res => expect(res.headers['x-powered-by']).toBeUndefined());
    });
});

describe('gizli anahtar zorunluluğu', () => {
    test('kısa ya da boş SESSION_SECRET ile uygulama kurulamaz (boş anahtarla imzalı çerez açılmaz)', () => {
        const store = openStore(':memory:');
        ['', 'kisa', 'x'.repeat(31)].forEach(secret => {
            expect(() => createApp({store, config: testConfig({sessionSecret: secret})})).toThrow('SESSION_SECRET');
        });
        store.close();
    });
});

describe('giriş: genel bütçe ve IPv6', () => {
    const proxied = limiterOptions => {
        const store = openStore(':memory:');
        const clock = {t: 1000000};
        const app = createApp({
            store: store,
            config: testConfig({trustProxy: true}),
            now: () => clock.t,
            rateLimiter: createRateLimiter(Object.assign({max: 5, windowMs: 900000, now: () => clock.t}, limiterOptions))
        });
        return {app, clock};
    };
    const from = (app, ip, password) => request(app).post('/api/admin/login').set('X-Forwarded-For', ip)
        .send({password: password || PASSWORD});

    test('çok sayıda farklı IP\'den gelen hatalar genel bütçeyi tüketir, yeni IP de 429 alır', () => {
        const {app} = proxied({globalMax: 3, globalWindowMs: 60000});
        return from(app, '203.0.113.1', 'yanlis').expect(401)
            .then(() => from(app, '203.0.113.2', 'yanlis').expect(401))
            .then(() => from(app, '203.0.113.3', 'yanlis').expect(401))
            .then(() => from(app, '203.0.113.4').expect(429));
    });

    test('aynı /64 içindeki IPv6 adresleri tek anahtardır', () => {
        const {app} = proxied({});
        const attempts = [1, 2, 3, 4, 5].map(n => `2001:db8:1:2:${n}::1`);
        return attempts.reduce((chain, ip) => chain.then(() => from(app, ip, 'yanlis').expect(401)), Promise.resolve())
            .then(() => from(app, '2001:db8:1:2:ffff::9').expect(429))
            .then(() => from(app, '2001:db8:1:3::1').expect(200));
    });
});

describe('yönetici girişi', () => {
    test('doğru şifre çerez verir ve /me çalışır', () => {
        const {app} = setup();
        const agent = request.agent(app);
        return login(agent)
            .expect(200)
            .then(res => {
                expect(res.body).toEqual({admin: true});
                const cookie = res.headers['set-cookie'][0];
                expect(cookie).toContain('sk_admin=');
                expect(cookie).toContain('HttpOnly');
                expect(cookie).toContain('SameSite=Strict');
                expect(cookie).not.toContain('Secure');
                return agent.get('/api/admin/me').expect(200);
            })
            .then(res => expect(res.body).toEqual({admin: true}));
    });

    test('üretimde çerez Secure', () => {
        const {app} = setup({config: {secureCookies: true}});
        return login(request(app)).expect(200)
            .then(res => expect(res.headers['set-cookie'][0]).toContain('Secure'));
    });

    test('yanlış şifre 401; sınırsız deneme yok: 6. istek 429', () => {
        const {app} = setup();
        const agent = request.agent(app);
        const attempts = [1, 2, 3, 4, 5];
        return attempts.reduce((chain, n) => chain.then(() => login(agent, `yanlis-${n}`).expect(401)), Promise.resolve())
            .then(() => login(agent, PASSWORD).expect(429))
            .then(res => {
                expect(res.headers['retry-after']).toBeDefined();
                expect(res.body.error).toContain('Çok fazla deneme');
            });
    });

    test('başarılı giriş hata sayacını sıfırlar; süre dolunca engel kalkar', () => {
        const {app, clock} = setup();
        const agent = request.agent(app);
        return login(agent, 'yanlis').expect(401)
            .then(() => login(agent, 'yanlis').expect(401))
            .then(() => login(agent).expect(200))
            .then(() => [1, 2, 3, 4, 5].reduce((chain, n) => chain.then(() => login(agent, `y${n}`).expect(401)),
                Promise.resolve()))
            .then(() => login(agent).expect(429))
            .then(() => {
                clock.t += 900001;
                return login(agent).expect(200);
            });
    });

    test('şifre ayarlanmamışsa 503', () => {
        const {app} = setup({config: {adminPasswordHash: ''}});
        return login(request(app)).expect(503);
    });

    test('şifre eksik/yanlış türde ya da çok uzunsa 401', () => {
        const {app} = setup();
        const agent = request.agent(app);
        return agent.post('/api/admin/login').send({}).expect(401)
            .then(() => agent.post('/api/admin/login').send({password: 12345}).expect(401))
            .then(() => agent.post('/api/admin/login').send({password: 'x'.repeat(5000)}).expect(401))
            .then(() => agent.post('/api/admin/login').type('form').send('password=' + PASSWORD).expect(401));
    });

    test('çıkış çerezi geçersiz kılar', () => {
        const {app} = setup();
        const agent = request.agent(app);
        return login(agent).expect(200)
            .then(() => agent.post('/api/admin/logout').expect(200))
            .then(() => agent.get('/api/admin/me').expect(401));
    });

    test('belirtecin süresi dolunca çerez geçersiz olur', () => {
        const {app, clock} = setup();
        const agent = request.agent(app);
        let cookie;
        return login(agent).expect(200)
            .then(res => {
                cookie = res.headers['set-cookie'][0].split(';')[0];
                clock.t += 12 * 60 * 60 * 1000 + 1;
                return request(app).get('/api/admin/me').set('Cookie', cookie).expect(401);
            });
    });

    test('sahte, değiştirilmiş ve başka anahtarla imzalı çerezler reddedilir', () => {
        const {app, clock} = setup();
        const valid = createSessionToken('x'.repeat(40), clock.t + 12 * 60 * 60 * 1000);
        const forgedSecret = createSessionToken('y'.repeat(40), clock.t + 12 * 60 * 60 * 1000);
        const expired = createSessionToken('x'.repeat(40), clock.t - 1);
        const tampered = `${Number(valid.split('.')[0]) + 99999}.${valid.split('.')[1]}`;
        return Promise.all([
            request(app).get('/api/admin/me').set('Cookie', `sk_admin=${valid}`).expect(200),
            request(app).get('/api/admin/me').set('Cookie', `sk_admin=${forgedSecret}`).expect(401),
            request(app).get('/api/admin/me').set('Cookie', `sk_admin=${expired}`).expect(401),
            request(app).get('/api/admin/me').set('Cookie', `sk_admin=${tampered}`).expect(401),
            request(app).get('/api/admin/me').set('Cookie', 'sk_admin=').expect(401),
            request(app).get('/api/admin/me').set('Cookie', 'baska=1; sk_admin=bozuk').expect(401),
            request(app).get('/api/admin/me').expect(401)
        ]);
    });

    test('farklı Origin ile yazma isteği 403', () => {
        const {app} = setup();
        return request(app).post('/api/admin/login').set('Origin', 'https://kotu.example')
            .send({password: PASSWORD}).expect(403)
            .then(res => expect(res.body.error).toBe('İstek kaynağı geçersiz'));
    });

    test('bozuk Origin başlığı 403', () => {
        const {app} = setup();
        return request(app).post('/api/admin/login').set('Origin', 'bu bir url degil')
            .send({password: PASSWORD}).expect(403);
    });
});

describe('çıkış oturumu gerçekten bitirir', () => {
    test('çıkıştan sonra eski çerez (kopyalanmış olsa bile) 401, yeni giriş çalışır', () => {
        const {app, clock} = setup();
        const agent = request.agent(app);
        let oldCookie;
        return login(agent).expect(200)
            .then(res => {
                oldCookie = res.headers['set-cookie'][0].split(';')[0];
                return request(app).get('/api/admin/me').set('Cookie', oldCookie).expect(200);
            })
            .then(() => {
                clock.t += 10;
                return agent.post('/api/admin/logout').expect(200);
            })
            .then(() => {
                clock.t += 10;
                return request(app).get('/api/admin/me').set('Cookie', oldCookie).expect(401);
            })
            .then(() => login(agent).expect(200))
            .then(() => agent.get('/api/admin/me').expect(200));
    });

    test('çerezsiz ya da geçersiz çerezle çıkış istekleri zarar vermez', () => {
        const {app} = setup();
        return request(app).post('/api/admin/logout').expect(200)
            .then(() => request(app).post('/api/admin/logout').set('Cookie', 'sk_admin=bozuk').expect(200));
    });
});

describe('yönetici uçları', () => {
    const adminAgent = () => {
        const ctx = setup();
        const agent = request.agent(ctx.app);
        return login(agent).expect(200).then(() => Object.assign({agent}, ctx));
    };

    test('girişsiz tüm yönetici uçları 401', () => {
        const {app} = setup();
        return Promise.all([
            request(app).get('/api/admin/me').expect(401),
            request(app).get('/api/admin/accounts').expect(401),
            request(app).post('/api/admin/teachers/1/approve').expect(401),
            request(app).delete('/api/admin/teachers/1').expect(401)
        ]);
    });

    test('girişli yönetici hesap listesini görür', () => adminAgent()
        .then(ctx => ctx.agent.get('/api/admin/accounts').expect(200))
        .then(res => expect(Array.isArray(res.body.teachers)).toBe(true)));

    test('yönetici yazmaları farklı Origin ile 403', () => adminAgent()
        .then(ctx => ctx.agent.post('/api/admin/teachers/1/approve').set('Origin', 'https://kotu.example')
            .expect(403)));

    test('eski yönetici ders uçları artık yok (404); yeni ders listesi açık', () => adminAgent().then(ctx => Promise.all([
        request(ctx.app).get('/api/lessons')
            .expect(200),
        ctx.agent.get('/api/admin/lessons').expect(404)
    ])));

    test('beklenmeyen hata 500 ve ayrıntı sızdırmaz', () => {
        return adminAgent().then(ctx => {
            ctx.store.accounts.adminOverview = () => {
                throw new Error('gizli veritabanı yolu /srv/secret.db');
            };
            const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
            return ctx.agent.get('/api/admin/accounts').expect(500).then(res => {
                quiet.mockRestore();
                expect(res.body).toEqual({error: 'Sunucu hatası'});
                expect(JSON.stringify(res.body)).not.toContain('secret');
            });
        });
    });
});
