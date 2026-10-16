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
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png verisi 0123456789')]);

const setup = () => {
    const store = openStore(':memory:');
    const config = testConfig({projectsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sk-shared-'))});
    const clock = {t: 5000000};
    const app = createApp({
        store: store,
        config: config,
        now: () => clock.t,
        userRateLimiter: createRateLimiter({max: 100, now: () => clock.t}),
        rateLimiter: createRateLimiter({max: 100, now: () => clock.t})
    });
    return {app, store, config, clock};
};

const admin = app => {
    const agent = request.agent(app);
    return agent.post('/api/admin/login').send({password: PASSWORD}).then(() => agent);
};

// iki öğretmen; ilkinin sınıfında Pamuk ve Tekir, ikincinin sınıfında Zeytin
const world = app => {
    const ctx = {};
    const makeTeacher = (name, className) => {
        const agent = request.agent(app);
        let id;
        return request(app).post('/api/auth/register-teacher')
            .send({username: name, realName: `${name} Hoca`, school: 'Okul', password: 'sifre123'})
            .then(res => {
                id = res.body.user.id;
                return admin(app);
            })
            .then(a => a.post(`/api/admin/teachers/${id}/approve`).send({approved: true}))
            .then(() => agent.post('/api/auth/login').send({username: name, password: 'sifre123'}))
            .then(() => agent.post('/api/teacher/classes').send({name: className}))
            .then(res => ({agent, id, code: res.body.code}));
    };
    const makeStudent = (name, code) => {
        const agent = request.agent(app);
        return agent.post('/api/auth/register-student')
            .send({classCode: code, username: name, realName: `${name} Gerçek`, password: 'gizli12'})
            .then(res => ({agent, id: res.body.user.id}));
    };
    return makeTeacher('ayse', '5-A')
        .then(t => {
            ctx.ayse = t;
            return makeTeacher('mehmet', '6-B');
        })
        .then(t => {
            ctx.mehmet = t;
            return makeStudent('Pamuk', ctx.ayse.code);
        })
        .then(s => {
            ctx.pamuk = s;
            return makeStudent('Tekir', ctx.ayse.code);
        })
        .then(s => {
            ctx.tekir = s;
            return makeStudent('Zeytin', ctx.mehmet.code);
        })
        .then(s => {
            ctx.zeytin = s;
            return ctx;
        });
};

const save = (agent, title) => agent.post(`/api/projects?title=${encodeURIComponent(title)}`)
    .set('Content-Type', 'application/octet-stream')
    .send(SB3)
    .expect(201)
    .then(res => res.body.id);

const share = (agent, id, body) => agent.post(`/api/projects/${id}/share`).send(body || {shared: true});

describe('paylaşım ve görünürlük', () => {
    test('girişsiz kullanıcı paylaşılanları göremez', () => {
        const {app} = setup();
        return request(app).get('/api/shared').expect(401);
    });

    test('paylaşılmamış proje listede yok; paylaşınca aynı sınıftakiler ve öğretmen görür, başka sınıf görmez', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu')
            .then(id => w.tekir.agent.get('/api/shared').expect(200)
                .then(res => {
                    expect(res.body).toEqual([]);
                    return share(w.pamuk.agent, id).expect(200);
                })
                .then(() => w.tekir.agent.get('/api/shared').expect(200))
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    expect(res.body[0]).toMatchObject({title: 'Pamuk oyunu', likes: 0, liked: false, comments: 0});
                    expect(res.body[0].owner).toEqual({username: 'Pamuk', role: 'student'});
                    expect(JSON.stringify(res.body)).not.toContain('Gerçek');
                    return w.ayse.agent.get('/api/shared').expect(200);
                })
                .then(res => {
                    expect(res.body).toHaveLength(1);
                    return w.zeytin.agent.get('/api/shared').expect(200);
                })
                .then(res => {
                    expect(res.body).toEqual([]);
                    return w.mehmet.agent.get('/api/shared').expect(200);
                })
                .then(res => expect(res.body).toEqual([]))));
    });

    test('başka sınıftan doğrudan erişim (detay, dosya) 404', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu')
            .then(id => share(w.pamuk.agent, id).expect(200)
                .then(() => w.zeytin.agent.get(`/api/shared/${id}`).expect(404))
                .then(() => w.zeytin.agent.get(`/api/shared/${id}/file`).expect(404))
                .then(() => w.tekir.agent.get(`/api/shared/${id}`).expect(200))
                .then(() => w.tekir.agent.get(`/api/shared/${id}/file`).expect(200))));
    });

    test('öğretmen kendi öğrencisinin projesini siler; başka öğretmen silemez', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu')
            .then(id => w.mehmet.agent.delete(`/api/teacher/projects/${id}`).expect(404)
                .then(() => w.zeytin.agent.delete(`/api/teacher/projects/${id}`).expect(403))
                .then(() => w.ayse.agent.delete(`/api/teacher/projects/${id}`).expect(204))
                .then(() => w.pamuk.agent.get('/api/projects').expect(200))
                .then(res => expect(res.body).toEqual([]))));
    });

    test('öğrenci tüm siteye açamaz; öğretmen kendi öğrencisinin projesini tüm siteye açar/kapatır', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu')
            .then(id => share(w.pamuk.agent, id, {shared: true, scope: 'site'}).expect(200)
                .then(res => {
                    expect(res.body.scope).toBe('class');
                    return w.mehmet.agent.post(`/api/teacher/projects/${id}/scope`).send({scope: 'site'})
                        .expect(404);
                })
                .then(() => w.ayse.agent.post(`/api/teacher/projects/${id}/scope`).send({scope: 'site'})
                    .expect(200))
                .then(() => w.zeytin.agent.get('/api/shared').expect(200))
                .then(res => {
                    expect(res.body.map(p => p.title)).toEqual(['Pamuk oyunu']);
                    return w.ayse.agent.post(`/api/teacher/projects/${id}/unshare`).expect(200);
                })
                .then(() => w.zeytin.agent.get('/api/shared').expect(200))
                .then(res => expect(res.body).toEqual([]))));
    });

    test('öğretmenin kendi projesi: sınıfına ya da tüm siteye paylaşılabilir', () => {
        const {app} = setup();
        return world(app).then(w => save(w.ayse.agent, 'Hoca örneği')
            .then(id => share(w.ayse.agent, id, {shared: true, scope: 'class'}).expect(200)
                .then(() => w.pamuk.agent.get('/api/shared').expect(200))
                .then(res => {
                    expect(res.body[0].owner).toEqual({username: 'ayse', role: 'teacher'});
                    return w.zeytin.agent.get('/api/shared').expect(200);
                })
                .then(res => {
                    expect(res.body).toEqual([]);
                    return share(w.ayse.agent, id, {shared: true, scope: 'site'}).expect(200);
                })
                .then(() => w.zeytin.agent.get('/api/shared').expect(200))
                .then(res => expect(res.body).toHaveLength(1))));
    });

    test('paylaşımı kapatınca ve proje silinince listeden kalkar', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu')
            .then(id => share(w.pamuk.agent, id).expect(200)
                .then(() => share(w.pamuk.agent, id, {shared: false}).expect(200))
                .then(() => w.tekir.agent.get('/api/shared').expect(200))
                .then(res => {
                    expect(res.body).toEqual([]);
                    return share(w.pamuk.agent, id).expect(200);
                })
                .then(() => w.pamuk.agent.delete(`/api/projects/${id}`).expect(204))
                .then(() => w.tekir.agent.get('/api/shared').expect(200))
                .then(res => expect(res.body).toEqual([]))));
    });
});

describe('beğeni', () => {
    test('beğen / vazgeç; sayaç ve liked bayrağı', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu')
            .then(id => share(w.pamuk.agent, id).expect(200)
                .then(() => w.tekir.agent.post(`/api/shared/${id}/like`).expect(200))
                .then(res => {
                    expect(res.body).toEqual({liked: true, likes: 1});
                    return w.ayse.agent.post(`/api/shared/${id}/like`).expect(200);
                })
                .then(res => {
                    expect(res.body.likes).toBe(2);
                    return w.tekir.agent.get('/api/shared').expect(200);
                })
                .then(res => {
                    expect(res.body[0]).toMatchObject({likes: 2, liked: true});
                    return w.tekir.agent.post(`/api/shared/${id}/like`).expect(200);
                })
                .then(res => expect(res.body).toEqual({liked: false, likes: 1}))
                .then(() => w.zeytin.agent.post(`/api/shared/${id}/like`).expect(404))));
    });
});

describe('yorumlar', () => {
    const open = (app, ctx) => save(ctx.pamuk.agent, 'Pamuk oyunu').then(id => share(ctx.pamuk.agent, id)
        .expect(200)
        .then(() => id));

    test('yorum yaz, listele; görünen ad yalnızca takma ad', () => {
        const {app} = setup();
        return world(app).then(w => open(app, w).then(id => w.tekir.agent.post(`/api/shared/${id}/comments`)
            .send({body: 'Harika olmuş!'})
            .expect(201)
            .then(res => {
                expect(res.body).toMatchObject({body: 'Harika olmuş!', author: {username: 'Tekir', role: 'student'}});
                expect(JSON.stringify(res.body)).not.toContain('Gerçek');
                return w.pamuk.agent.get(`/api/shared/${id}`).expect(200);
            })
            .then(res => {
                expect(res.body.comments).toHaveLength(1);
                expect(res.body.comments[0].body).toBe('Harika olmuş!');
                expect(res.body.title).toBe('Pamuk oyunu');
                expect(res.body.mine).toBe(true);
                return w.tekir.agent.get('/api/shared').expect(200);
            })
            .then(res => expect(res.body[0].comments).toBe(1))));
    });

    test('boş, çok uzun yorum 400; başka sınıf yorum yazamaz', () => {
        const {app} = setup();
        return world(app).then(w => open(app, w).then(id => w.tekir.agent.post(`/api/shared/${id}/comments`)
            .send({body: '   '})
            .expect(400)
            .then(() => w.tekir.agent.post(`/api/shared/${id}/comments`).send({body: 'a'.repeat(301)})
                .expect(400))
            .then(() => w.zeytin.agent.post(`/api/shared/${id}/comments`).send({body: 'selam'})
                .expect(404))));
    });

    test('küfür filtresi: uygunsuz yorum reddedilir, temiz yorum geçer', () => {
        const {app} = setup();
        return world(app).then(w => open(app, w).then(id => w.tekir.agent.post(`/api/shared/${id}/comments`)
            .send({body: 'sen bir orospu çocuğusun'})
            .expect(400)
            .then(res => {
                expect(res.body.error).toContain('uygunsuz');
                return w.tekir.agent.post(`/api/shared/${id}/comments`).send({body: 'Çok güzel bir oyun, tebrikler'})
                    .expect(201);
            })));
    });

    test('hız sınırı: 10 dakikada en çok 10 yorum', () => {
        const {app, clock} = setup();
        return world(app).then(w => open(app, w).then(id => {
            let chain = Promise.resolve();
            for (let i = 0; i < 10; i++) {
                chain = chain.then(() => w.tekir.agent.post(`/api/shared/${id}/comments`).send({body: `yorum ${i}`})
                    .expect(201));
            }
            return chain
                .then(() => w.tekir.agent.post(`/api/shared/${id}/comments`).send({body: 'fazla'})
                    .expect(429))
                .then(() => {
                    clock.t += 11 * 60 * 1000;
                    return w.tekir.agent.post(`/api/shared/${id}/comments`).send({body: 'yeniden'}).expect(201);
                });
        }));
    });

    test('yorumu yazan, proje sahibi ve sınıfın öğretmeni silebilir; diğerleri silemez', () => {
        const {app} = setup();
        return world(app).then(w => open(app, w).then(id => {
            const post = body => w.tekir.agent.post(`/api/shared/${id}/comments`).send({body})
                .expect(201)
                .then(res => res.body.id);
            let a;
            let b;
            let c;
            return post('birinci').then(x => {
                a = x;
                return post('ikinci');
            })
                .then(x => {
                    b = x;
                    return post('üçüncü');
                })
                .then(x => {
                    c = x;
                    return w.ayse.agent.get(`/api/shared/${id}`);
                })
                .then(() => w.zeytin.agent.delete(`/api/shared/${id}/comments/${a}`).expect(404))
                .then(() => w.tekir.agent.delete(`/api/shared/${id}/comments/${a}`).expect(204))
                .then(() => w.pamuk.agent.delete(`/api/shared/${id}/comments/${b}`).expect(204))
                .then(() => w.ayse.agent.delete(`/api/shared/${id}/comments/${c}`).expect(204))
                .then(() => w.pamuk.agent.get(`/api/shared/${id}`).expect(200))
                .then(res => expect(res.body.comments).toEqual([]));
        }));
    });

    test('birinin yorumunu başka bir öğrenci silemez', () => {
        const {app} = setup();
        return world(app).then(w => open(app, w).then(id => w.pamuk.agent.post(`/api/shared/${id}/comments`)
            .send({body: 'sahibin yorumu'})
            .expect(201)
            .then(res => w.tekir.agent.delete(`/api/shared/${id}/comments/${res.body.id}`).expect(403))));
    });
});

describe('bildirim', () => {
    test('iki farklı kişi bildirirse yorum gizlenir; öğretmen bildirimleri görür ve karar verir', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu').then(id => share(w.pamuk.agent, id).expect(200)
            .then(() => w.tekir.agent.post(`/api/shared/${id}/comments`).send({body: 'tartışmalı yorum'})
                .expect(201))
            .then(res => {
                const commentId = res.body.id;
                return w.pamuk.agent.post(`/api/shared/${id}/report`).send({commentId})
                    .expect(204)
                    .then(() => w.pamuk.agent.get(`/api/shared/${id}`).expect(200))
                    .then(detail => {
                        expect(detail.body.comments).toHaveLength(1);
                        return w.ayse.agent.post(`/api/shared/${id}/report`).send({commentId}).expect(204);
                    })
                    .then(() => w.pamuk.agent.get(`/api/shared/${id}`).expect(200))
                    .then(detail => {
                        expect(detail.body.comments).toEqual([]);
                        return w.ayse.agent.get('/api/teacher/reports').expect(200);
                    })
                    .then(reports => {
                        expect(reports.body).toEqual([expect.objectContaining({
                            kind: 'comment', body: 'tartışmalı yorum', projectTitle: 'Pamuk oyunu', reports: 2
                        })]);
                        return w.ayse.agent.post(`/api/teacher/comments/${commentId}/restore`).expect(200);
                    })
                    .then(() => w.pamuk.agent.get(`/api/shared/${id}`).expect(200))
                    .then(detail => expect(detail.body.comments).toHaveLength(1));
            })));
    });

    test('aynı kişinin tekrar bildirmesi sayılmaz; kendi yorumunu bildiremez', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu').then(id => share(w.pamuk.agent, id).expect(200)
            .then(() => w.tekir.agent.post(`/api/shared/${id}/comments`).send({body: 'yorum'})
                .expect(201))
            .then(res => {
                const commentId = res.body.id;
                return w.pamuk.agent.post(`/api/shared/${id}/report`).send({commentId}).expect(204)
                    .then(() => w.pamuk.agent.post(`/api/shared/${id}/report`).send({commentId}).expect(204))
                    .then(() => w.pamuk.agent.get(`/api/shared/${id}`).expect(200))
                    .then(detail => {
                        expect(detail.body.comments).toHaveLength(1);
                        return w.tekir.agent.post(`/api/shared/${id}/report`).send({commentId}).expect(400);
                    });
            })));
    });
});

describe('küçük resim', () => {
    test('sahibi PNG yükler; paylaşılınca görünebilen herkes alır, görünmeyen alamaz', () => {
        const {app} = setup();
        return world(app).then(w => save(w.pamuk.agent, 'Pamuk oyunu').then(id => w.pamuk.agent
            .put(`/api/projects/${id}/thumbnail`).set('Content-Type', 'application/octet-stream')
            .send(PNG)
            .expect(204)
            .then(() => share(w.pamuk.agent, id).expect(200))
            .then(() => w.tekir.agent.get(`/api/shared/${id}/thumbnail`).expect(200)
                .expect('Content-Type', /png/))
            .then(() => w.zeytin.agent.get(`/api/shared/${id}/thumbnail`).expect(404))
            .then(() => w.pamuk.agent.put(`/api/projects/${id}/thumbnail`).set('Content-Type', 'application/octet-stream')
                .send(Buffer.from('png değil'))
                .expect(415))));
    });
});
