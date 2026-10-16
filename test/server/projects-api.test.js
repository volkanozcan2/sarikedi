/** @jest-environment node */
const request = require('supertest');
jest.setTimeout(30000);
const fs = require('fs');
const os = require('os');
const path = require('path');
const {openStore} = require('../../server/src/db');
const {createApp} = require('../../server/src/app');
const {createRateLimiter} = require('../../server/src/auth');
const {PASSWORD, testConfig} = require('./helpers');

const SB3 = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('sahte sb3 içeriği 0123456789')]);

const setup = () => {
    const store = openStore(':memory:');
    const config = testConfig({projectsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sk-projects-'))});
    const app = createApp({
        store: store,
        config: config,
        userRateLimiter: createRateLimiter({max: 50}),
        rateLimiter: createRateLimiter({max: 50})
    });
    return {app, store, config};
};

// onaylı öğretmen + sınıf + iki öğrenci (aynı sınıfta)
const classroom = app => {
    const admin = request.agent(app);
    const teacher = request.agent(app);
    let teacherId;
    let code;
    return request(app).post('/api/auth/register-teacher')
        .send({username: 'ayse', realName: 'Ayşe Yılmaz', school: 'Okul', password: 'sifre123'})
        .then(res => {
            teacherId = res.body.user.id;
            return admin.post('/api/admin/login').send({password: PASSWORD});
        })
        .then(() => admin.post(`/api/admin/teachers/${teacherId}/approve`).send({approved: true}))
        .then(() => teacher.post('/api/auth/login').send({username: 'ayse', password: 'sifre123'}))
        .then(() => teacher.post('/api/teacher/classes').send({name: '5-A'}))
        .then(res => {
            code = res.body.code;
            const make = name => {
                const agent = request.agent(app);
                return agent.post('/api/auth/register-student')
                    .send({classCode: code, username: name, realName: `${name} Gerçek`, password: 'gizli12'})
                    .then(() => agent);
            };
            return Promise.all([make('Pamuk'), make('Tekir')]);
        })
        .then(students => ({teacher, pamuk: students[0], tekir: students[1], admin}));
};

const save = (agent, title, body) => agent.post(`/api/projects?title=${encodeURIComponent(title)}`)
    .set('Content-Type', 'application/octet-stream')
    .send(body || SB3);

describe('proje kaydetme (hesabıma)', () => {
    test('girişsiz kullanıcı proje listeleyemez/kaydedemez', () => {
        const {app} = setup();
        return request(app).get('/api/projects').expect(401)
            .then(() => request(app).post('/api/projects?title=x').send(SB3)
                .expect(401));
    });

    test('kaydet, listele, indir, güncelle, yeniden adlandır, sil', () => {
        const {app} = setup();
        return classroom(app).then(({pamuk}) => save(pamuk, 'Yıldız oyunum').expect(201)
            .then(res => {
                expect(res.body).toMatchObject({title: 'Yıldız oyunum', shared: false});
                expect(res.body.size).toBe(SB3.length);
                const id = res.body.id;
                return pamuk.get('/api/projects').expect(200)
                    .then(list => {
                        expect(list.body.map(p => p.id)).toEqual([id]);
                        return pamuk.get(`/api/projects/${id}/file`).expect(200)
                            .buffer(true)
                            .parse((r, cb) => {
                                const chunks = [];
                                r.on('data', c => chunks.push(c));
                                r.on('end', () => cb(null, Buffer.concat(chunks)));
                            });
                    })
                    .then(file => {
                        expect(Buffer.compare(file.body, SB3)).toBe(0);
                        const bigger = Buffer.concat([SB3, Buffer.from('daha uzun')]);
                        return pamuk.put(`/api/projects/${id}`).set('Content-Type', 'application/octet-stream')
                            .send(bigger)
                            .expect(200)
                            .then(updated => {
                                expect(updated.body.size).toBe(bigger.length);
                                return pamuk.post(`/api/projects/${id}/rename`).send({title: 'Yeni ad'})
                                    .expect(200);
                            });
                    })
                    .then(renamed => {
                        expect(renamed.body.title).toBe('Yeni ad');
                        return pamuk.delete(`/api/projects/${id}`).expect(204);
                    })
                    .then(() => pamuk.get('/api/projects').expect(200))
                    .then(list => expect(list.body).toEqual([]));
            }));
    });

    test('sb3 olmayan dosya, boş dosya, kötü başlık, aşırı büyük dosya reddedilir', () => {
        const {app} = setup();
        return classroom(app).then(({pamuk}) => save(pamuk, 'x', Buffer.from('bu bir zip değil, düz metin')).expect(415)
            .then(() => save(pamuk, 'x', Buffer.from([0x50])).expect(400))
            .then(() => pamuk.post('/api/projects').set('Content-Type', 'application/octet-stream')
                .send(SB3)
                .expect(400))
            .then(() => save(pamuk, 'a'.repeat(61)).expect(400))
            .then(() => save(pamuk, 'büyük', Buffer.concat([SB3, Buffer.alloc(10 * 1024 * 1024)])).expect(413)));
    });

    test('kullanıcı başına en çok 20 proje', () => {
        const {app} = setup();
        return classroom(app).then(({pamuk}) => {
            let chain = Promise.resolve();
            for (let i = 0; i < 20; i++) chain = chain.then(() => save(pamuk, `proje ${i}`).expect(201));
            return chain.then(() => save(pamuk, 'fazla').expect(409));
        });
    });

    test('başkasının projesi görülemez, indirilemez, silinemez', () => {
        const {app} = setup();
        return classroom(app).then(({pamuk, tekir}) => save(pamuk, 'gizli').expect(201)
            .then(res => {
                const id = res.body.id;
                return tekir.get('/api/projects').expect(200)
                    .then(list => {
                        expect(list.body).toEqual([]);
                        return tekir.get(`/api/projects/${id}/file`).expect(404);
                    })
                    .then(() => tekir.delete(`/api/projects/${id}`).expect(404))
                    .then(() => tekir.put(`/api/projects/${id}`).set('Content-Type', 'application/octet-stream')
                        .send(SB3)
                        .expect(404));
            }));
    });

    test('öğretmen de proje kaydedebilir; dosyalar sunucu klasöründe id adıyla durur', () => {
        const {app, config} = setup();
        return classroom(app).then(({teacher}) => save(teacher, 'öğretmen projesi').expect(201)
            .then(res => {
                const files = fs.readdirSync(config.projectsDir);
                expect(files).toEqual([`${res.body.id}.sb3`]);
            }));
    });

    test('öğrenci çıkarılınca ya da öğretmen silinince projeleri ve dosyaları da silinir', () => {
        const {app, config} = setup();
        return classroom(app).then(ctx => {
            let studentId;
            return ctx.pamuk.get('/api/auth/me').then(res => {
                studentId = res.body.user.id;
                return save(ctx.pamuk, 'silinecek').expect(201);
            })
                .then(() => {
                    expect(fs.readdirSync(config.projectsDir)).toHaveLength(1);
                    return ctx.teacher.delete(`/api/teacher/students/${studentId}`).expect(204);
                })
                .then(() => {
                    expect(fs.readdirSync(config.projectsDir)).toHaveLength(0);
                    return save(ctx.tekir, 'ikinci').expect(201);
                })
                .then(() => save(ctx.teacher, 'hoca projesi').expect(201))
                .then(() => {
                    expect(fs.readdirSync(config.projectsDir)).toHaveLength(2);
                    return ctx.teacher.get('/api/auth/me');
                })
                .then(res => ctx.admin.delete(`/api/admin/teachers/${res.body.user.id}`).expect(204))
                .then(() => expect(fs.readdirSync(config.projectsDir)).toHaveLength(0));
        });
    });
});
