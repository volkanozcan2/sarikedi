/** @jest-environment node */
const request = require('supertest');
jest.setTimeout(30000);
const {openStore} = require('../../server/src/db');
const {createApp} = require('../../server/src/app');
const {createRateLimiter} = require('../../server/src/auth');
const {PASSWORD, testConfig} = require('./helpers');

const setup = () => {
    const store = openStore(':memory:');
    const clock = {t: 1000000};
    const app = createApp({
        store: store,
        config: testConfig(),
        now: () => clock.t,
        rateLimiter: createRateLimiter({max: 5, windowMs: 900000, now: () => clock.t}),
        userRateLimiter: createRateLimiter({max: 5, windowMs: 900000, now: () => clock.t})
    });
    return {app, store, clock};
};

const teacherBody = overrides => Object.assign({
    username: 'ayse', realName: 'Ayşe Yılmaz', school: 'Atatürk İlkokulu', password: 'sifre123'
}, overrides);

const adminAgent = app => {
    const agent = request.agent(app);
    return agent.post('/api/admin/login').send({password: PASSWORD})
        .expect(200)
        .then(() => agent);
};

// kayıtlı, onaylı, giriş yapmış öğretmen ve açılmış bir sınıf
const teacherWithClass = app => {
    let teacherId;
    const teacher = request.agent(app);
    return request(app).post('/api/auth/register-teacher').send(teacherBody())
        .expect(201)
        .then(res => {
            teacherId = res.body.user.id;
            return adminAgent(app);
        })
        .then(admin => admin.post(`/api/admin/teachers/${teacherId}/approve`).send({approved: true})
            .expect(200))
        .then(() => teacher.post('/api/auth/login').send({username: 'ayse', password: 'sifre123'})
            .expect(200))
        .then(() => teacher.post('/api/teacher/classes').send({name: '5-A'})
            .expect(201))
        .then(res => ({teacher, teacherId, klass: res.body}));
};

const registerStudent = (app, code, overrides) => request(app).post('/api/auth/register-student')
    .send(Object.assign({classCode: code, username: 'Pamuk', realName: 'Ali Veli', password: 'gizli12'}, overrides));

describe('öğretmen kaydı ve onay', () => {
    test('kayıt 201 döner, çerez vermez, parola özeti sızmaz; onay bekler', () => {
        const {app} = setup();
        return request(app).post('/api/auth/register-teacher').send(teacherBody())
            .expect(201)
            .then(res => {
                expect(res.body.user).toMatchObject({role: 'teacher', username: 'ayse', approved: false});
                expect(res.headers['set-cookie']).toBeUndefined();
                expect(JSON.stringify(res.body)).not.toMatch(/scrypt|password/);
            });
    });

    test('tekrar eden kullanıcı adı 409, geçersiz alan ve kısa şifre 400', () => {
        const {app} = setup();
        return request(app).post('/api/auth/register-teacher').send(teacherBody())
            .expect(201)
            .then(() => request(app).post('/api/auth/register-teacher').send(teacherBody({username: 'AYSE'}))
                .expect(409))
            .then(() => request(app).post('/api/auth/register-teacher').send(teacherBody({username: 'x'}))
                .expect(400))
            .then(() => request(app).post('/api/auth/register-teacher').send(teacherBody({password: '123'}))
                .expect(400)
                .then(res => expect(res.body.errors.join(' ')).toContain('Şifre')));
    });

    test('onaylanmamış öğretmen giriş yapamaz (pending); onaylanınca yapar', () => {
        const {app} = setup();
        let id;
        return request(app).post('/api/auth/register-teacher').send(teacherBody())
            .then(res => {
                id = res.body.user.id;
                return request(app).post('/api/auth/login').send({username: 'ayse', password: 'sifre123'})
                    .expect(403);
            })
            .then(res => {
                expect(res.body.pending).toBe(true);
                return adminAgent(app);
            })
            .then(admin => admin.post(`/api/admin/teachers/${id}/approve`).send({approved: true})
                .expect(200))
            .then(() => request(app).post('/api/auth/login').send({username: 'ayse', password: 'sifre123'})
                .expect(200)
                .then(res => expect(res.body.user.approved).toBe(true)));
    });

    test('yönetici uç noktaları yönetici girişi ister', () => {
        const {app} = setup();
        return request(app).get('/api/admin/accounts').expect(401)
            .then(() => request(app).post('/api/admin/teachers/1/approve').send({approved: true})
                .expect(401));
    });

    test('yönetici tüm öğretmen, sınıf ve öğrencileri görür; öğretmeni siler', () => {
        const {app} = setup();
        return teacherWithClass(app).then(ctx => registerStudent(app, ctx.klass.code)
            .expect(201)
            .then(() => adminAgent(app))
            .then(admin => admin.get('/api/admin/accounts').expect(200)
                .then(res => {
                    const teacher = res.body.teachers[0];
                    expect(teacher.username).toBe('ayse');
                    expect(teacher.classes[0].students[0]).toMatchObject({username: 'Pamuk', realName: 'Ali Veli'});
                    expect(JSON.stringify(res.body)).not.toMatch(/scrypt/);
                    return admin.delete(`/api/admin/teachers/${ctx.teacherId}`).expect(204);
                })
                .then(() => admin.get('/api/admin/accounts').expect(200))
                .then(res => expect(res.body.teachers).toEqual([]))));
    });
});

describe('öğrenci kaydı ve oturum', () => {
    test('sınıf koduyla kayıt oturum açar; /auth/me kullanıcıyı verir', () => {
        const {app} = setup();
        return teacherWithClass(app).then(ctx => {
            const student = request.agent(app);
            return student.post('/api/auth/register-student')
                .send({classCode: ctx.klass.code, username: 'Pamuk', realName: 'Ali Veli', password: 'gizli12'})
                .expect(201)
                .then(res => {
                    expect(res.body.user).toMatchObject({role: 'student', username: 'Pamuk'});
                    return student.get('/api/auth/me').expect(200);
                })
                .then(res => expect(res.body.user.username).toBe('Pamuk'));
        });
    });

    test('yanlış kod 404, aynı takma ad 409', () => {
        const {app} = setup();
        return teacherWithClass(app).then(ctx => registerStudent(app, 'YOKYOK').expect(404)
            .then(() => registerStudent(app, ctx.klass.code).expect(201))
            .then(() => registerStudent(app, ctx.klass.code, {username: 'pamuk'}).expect(409)));
    });

    test('girişsiz /auth/me boş kullanıcı döner; çıkış çerezi temizler', () => {
        const {app} = setup();
        const agent = request.agent(app);
        return agent.get('/api/auth/me').expect(200)
            .then(res => {
                expect(res.body.user).toBeNull();
                return teacherWithClass(app);
            })
            .then(ctx => ctx.teacher.post('/api/auth/logout').expect(200)
                .then(() => ctx.teacher.get('/api/auth/me').expect(200))
                .then(res => expect(res.body.user).toBeNull()));
    });

    test('yanlış şifre genel mesajla 401 (kullanıcı var mı sızmaz)', () => {
        const {app} = setup();
        return teacherWithClass(app).then(() => request(app).post('/api/auth/login')
            .send({username: 'ayse', password: 'yanlis'})
            .expect(401)
            .then(res => {
                expect(res.body.error).toBe('Kullanıcı adı ya da şifre yanlış');
                return request(app).post('/api/auth/login').send({username: 'yok-boyle', password: 'yanlis'})
                    .expect(401);
            })
            .then(res => expect(res.body.error).toBe('Kullanıcı adı ya da şifre yanlış')));
    });

    test('art arda yanlış denemeler 429 ile durdurulur', () => {
        const {app} = setup();
        const attempt = () => request(app).post('/api/auth/login').send({username: 'biri', password: 'yanlis'});
        return attempt().expect(401)
            .then(() => attempt().expect(401))
            .then(() => attempt().expect(401))
            .then(() => attempt().expect(401))
            .then(() => attempt().expect(401))
            .then(() => attempt().expect(429));
    });

    test('farklı kaynaktan gelen yazma isteği reddedilir', () => {
        const {app} = setup();
        return request(app).post('/api/auth/register-teacher').set('Origin', 'http://kotu.example')
            .send(teacherBody())
            .expect(403);
    });
});

describe('öğretmen paneli', () => {
    test('öğrenci ve girişsiz kullanıcı öğretmen uç noktalarını kullanamaz', () => {
        const {app} = setup();
        return teacherWithClass(app).then(ctx => {
            const student = request.agent(app);
            return request(app).get('/api/teacher/classes').expect(401)
                .then(() => student.post('/api/auth/register-student')
                    .send({classCode: ctx.klass.code, username: 'Pamuk', realName: 'Ali Veli', password: 'gizli12'})
                    .expect(201))
                .then(() => student.get('/api/teacher/classes').expect(403));
        });
    });

    test('sınıf listesi, öğrenci listesi, yeni sınıf', () => {
        const {app} = setup();
        return teacherWithClass(app).then(ctx => registerStudent(app, ctx.klass.code).expect(201)
            .then(() => ctx.teacher.get('/api/teacher/classes').expect(200))
            .then(res => {
                expect(res.body).toEqual([expect.objectContaining({name: '5-A', studentCount: 1})]);
                return ctx.teacher.get(`/api/teacher/classes/${ctx.klass.id}/students`).expect(200);
            })
            .then(res => {
                expect(res.body[0]).toMatchObject({username: 'Pamuk', realName: 'Ali Veli'});
                return ctx.teacher.post('/api/teacher/classes').send({name: '5-B'}).expect(201);
            })
            .then(res => expect(res.body.code).not.toBe(ctx.klass.code)));
    });

    test('şifre sıfırlama: eski şifre ve eski oturum geçersiz, yeni şifre çalışır', () => {
        const {app} = setup();
        return teacherWithClass(app).then(ctx => {
            const student = request.agent(app);
            let studentId;
            return student.post('/api/auth/register-student')
                .send({classCode: ctx.klass.code, username: 'Pamuk', realName: 'Ali Veli', password: 'gizli12'})
                .expect(201)
                .then(res => {
                    studentId = res.body.user.id;
                    return ctx.teacher.post(`/api/teacher/students/${studentId}/reset-password`)
                        .send({password: 'yeni-sifre'})
                        .expect(200);
                })
                .then(() => student.get('/api/auth/me').expect(200))
                .then(res => {
                    expect(res.body.user).toBeNull();
                    return request(app).post('/api/auth/login').send({username: 'Pamuk', password: 'gizli12'})
                        .expect(401);
                })
                .then(() => request(app).post('/api/auth/login').send({username: 'Pamuk', password: 'yeni-sifre'})
                    .expect(200));
        });
    });

    test('başka öğretmenin öğrencisine dokunulamaz; öğrenci çıkarılabilir', () => {
        const {app} = setup();
        return teacherWithClass(app).then(ctx => {
            let studentId;
            return registerStudent(app, ctx.klass.code).expect(201)
                .then(res => {
                    studentId = res.body.user.id;
                    return request(app).post('/api/auth/register-teacher')
                        .send(teacherBody({username: 'mehmet'}))
                        .expect(201);
                })
                .then(res => adminAgent(app).then(admin => admin.post(`/api/admin/teachers/${res.body.user.id}/approve`)
                    .send({approved: true})
                    .expect(200)))
                .then(() => {
                    const other = request.agent(app);
                    return other.post('/api/auth/login').send({username: 'mehmet', password: 'sifre123'}).expect(200)
                        .then(() => other.delete(`/api/teacher/students/${studentId}`).expect(404));
                })
                .then(() => ctx.teacher.delete(`/api/teacher/students/${studentId}`).expect(204))
                .then(() => request(app).post('/api/auth/login').send({username: 'Pamuk', password: 'gizli12'})
                    .expect(401));
        });
    });
});
