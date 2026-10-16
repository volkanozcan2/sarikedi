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
const STEPS = [{type: 'addBlock', opcode: 'motion_movesteps', label: '10 adım git'}, {type: 'note', text: 'Bitti'}];

const setup = () => {
    const store = openStore(':memory:');
    const config = testConfig({projectsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sk-lessons-'))});
    const app = createApp({
        store: store,
        config: config,
        userRateLimiter: createRateLimiter({max: 50}),
        rateLimiter: createRateLimiter({max: 50})
    });
    return {app, store, config};
};

// onaylı öğretmen + sınıfı + o sınıfta bir öğrenci; ayrıca başka sınıfta bir öğrenci
const school = app => {
    const admin = request.agent(app);
    const teacher = request.agent(app);
    const other = request.agent(app);
    const ids = {};
    const register = (agent, username) => request(app).post('/api/auth/register-teacher')
        .send({username: username, realName: `${username} Hoca`, school: 'Okul', password: 'sifre123'})
        .then(res => {
            ids[username] = res.body.user.id;
            return admin.post(`/api/admin/teachers/${ids[username]}/approve`).send({approved: true});
        })
        .then(() => agent.post('/api/auth/login').send({username: username, password: 'sifre123'}));
    const student = (code, name) => {
        const agent = request.agent(app);
        return agent.post('/api/auth/register-student')
            .send({classCode: code, username: name, realName: `${name} Gerçek`, password: 'gizli12'})
            .then(() => agent);
    };
    const result = {teacher, other};
    return admin.post('/api/admin/login').send({password: PASSWORD})
        .then(() => register(teacher, 'ayse'))
        .then(() => register(other, 'mehmet'))
        .then(() => teacher.post('/api/teacher/classes').send({name: '5-A'}))
        .then(res => {
            result.classId = res.body.id;
            return student(res.body.code, 'Pamuk');
        })
        .then(agent => {
            result.pamuk = agent;
            return other.post('/api/teacher/classes').send({name: '6-B'});
        })
        .then(res => {
            result.otherClassId = res.body.id;
            return student(res.body.code, 'Tekir');
        })
        .then(agent => {
            result.tekir = agent;
            result.admin = admin;
            result.ids = ids;
            return result;
        });
};

const createLesson = (agent, fields) => agent.post('/api/lessons')
    .send(Object.assign({title: 'Kedi yürüsün', description: 'İlk ders', steps: STEPS}, fields));
const upload = (agent, id, body) => agent.put(`/api/lessons/${id}/file`)
    .set('Content-Type', 'application/octet-stream')
    .send(body || SB3);

describe('rehberli dersler', () => {
    test('öğretmen ders oluşturur, başlangıç projesini yükler; girişsiz ziyaretçi herkese açık dersi görür', () => {
        const {app} = setup();
        let id;
        return school(app)
            .then(s => createLesson(s.teacher)
                .then(res => {
                    expect(res.status).toBe(201);
                    expect(res.body).toMatchObject({title: 'Kedi yürüsün', stepCount: 2, classId: null,
                        hasFile: false, mine: true, teacherName: 'ayse Hoca'});
                    id = res.body.id;
                    // proje yüklenmeden ders başkasına görünmez
                    return request(app).get('/api/lessons');
                })
                .then(res => {
                    expect(res.body).toEqual([]);
                    return upload(s.teacher, id);
                }))
            .then(res => {
                expect(res.status).toBe(200);
                expect(res.body.hasFile).toBe(true);
                return request(app).get('/api/lessons');
            })
            .then(res => {
                expect(res.body.map(l => l.title)).toEqual(['Kedi yürüsün']);
                expect(res.body[0].mine).toBe(false);
                return request(app).get(`/api/lessons/${id}`);
            })
            .then(res => {
                expect(res.body.steps).toEqual(STEPS);
                return request(app).get(`/api/lessons/${id}/file`);
            })
            .then(res => {
                expect(res.status).toBe(200);
                expect(Buffer.from(res.body).equals(SB3)).toBe(true);
            });
    });

    test('sınıfa özel ders yalnızca o sınıfın öğrencisine ve öğretmenine görünür', () => {
        const {app} = setup();
        let s;
        let id;
        return school(app)
            .then(result => {
                s = result;
                return createLesson(s.teacher, {classId: s.classId});
            })
            .then(res => {
                id = res.body.id;
                expect(res.body.className).toBe('5-A');
                return upload(s.teacher, id);
            })
            .then(() => s.pamuk.get('/api/lessons'))
            .then(res => {
                expect(res.body.map(l => l.id)).toEqual([id]);
                return s.tekir.get('/api/lessons');
            })
            .then(res => {
                expect(res.body).toEqual([]);
                return s.tekir.get(`/api/lessons/${id}`);
            })
            .then(res => {
                expect(res.status).toBe(404);
                return request(app).get(`/api/lessons/${id}/file`);
            })
            .then(res => {
                expect(res.status).toBe(404);
                return s.other.get('/api/lessons');
            })
            .then(res => expect(res.body).toEqual([]));
    });

    test('öğrenci ders oluşturamaz; öğretmen başkasının sınıfını seçemez, başkasının dersini değiştiremez', () => {
        const {app} = setup();
        let s;
        let id;
        return school(app)
            .then(result => {
                s = result;
                return createLesson(s.pamuk);
            })
            .then(res => {
                expect(res.status).toBe(403);
                return createLesson(request(app));
            })
            .then(res => {
                expect(res.status).toBe(401);
                return createLesson(s.teacher, {classId: s.otherClassId});
            })
            .then(res => {
                expect(res.status).toBe(404);
                return createLesson(s.teacher);
            })
            .then(res => {
                id = res.body.id;
                return s.other.put(`/api/lessons/${id}`).send({title: 'Ele geçirdim', steps: STEPS});
            })
            .then(res => {
                expect(res.status).toBe(404);
                return upload(s.other, id);
            })
            .then(res => {
                expect(res.status).toBe(404);
                return s.other.delete(`/api/lessons/${id}`);
            })
            .then(res => expect(res.status).toBe(404));
    });

    test('doğrulama: boş ad, adımsız ders ve geçersiz dosya reddedilir', () => {
        const {app} = setup();
        let s;
        return school(app)
            .then(result => {
                s = result;
                return createLesson(s.teacher, {title: '  '});
            })
            .then(res => {
                expect(res.status).toBe(400);
                return createLesson(s.teacher, {steps: []});
            })
            .then(res => {
                expect(res.status).toBe(400);
                return createLesson(s.teacher);
            })
            .then(res => upload(s.teacher, res.body.id, Buffer.from('bu bir zip değil, sadece yazı')))
            .then(res => expect(res.status).toBe(415));
    });

    test('öğretmen dersini düzenler ve siler; dosyası da gider', () => {
        const {app, config} = setup();
        let s;
        let id;
        return school(app)
            .then(result => {
                s = result;
                return createLesson(s.teacher);
            })
            .then(res => {
                id = res.body.id;
                return upload(s.teacher, id);
            })
            .then(() => s.teacher.put(`/api/lessons/${id}`)
                .send({title: 'Yeni ad', description: '', steps: [STEPS[0]], classId: s.classId}))
            .then(res => {
                expect(res.status).toBe(200);
                expect(res.body).toMatchObject({title: 'Yeni ad', stepCount: 1, classId: s.classId});
                expect(fs.existsSync(path.join(config.projectsDir, 'lessons', `${id}.sb3`))).toBe(true);
                return s.teacher.delete(`/api/lessons/${id}`);
            })
            .then(res => {
                expect(res.status).toBe(204);
                expect(fs.existsSync(path.join(config.projectsDir, 'lessons', `${id}.sb3`))).toBe(false);
                return s.teacher.get('/api/lessons');
            })
            .then(res => expect(res.body).toEqual([]));
    });

    test('yönetici öğretmeni silince dersleri de silinir', () => {
        const {app} = setup();
        let s;
        return school(app)
            .then(result => {
                s = result;
                return createLesson(s.teacher);
            })
            .then(res => upload(s.teacher, res.body.id))
            .then(() => s.admin.delete(`/api/admin/teachers/${s.ids.ayse}`))
            .then(res => {
                expect(res.status).toBe(204);
                return request(app).get('/api/lessons');
            })
            .then(res => expect(res.body).toEqual([]));
    });
});

describe('hazır dersler (repodaki klasörden)', () => {
    const makeDir = (title, steps) => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-builtin-'));
        fs.writeFileSync(path.join(dir, 'arayuz.json'), JSON.stringify({title, description: 'Tur', steps}));
        fs.writeFileSync(path.join(dir, 'arayuz.sb3'), SB3);
        return dir;
    };
    const boot = dir => {
        const store = openStore(':memory:');
        const config = testConfig({builtinLessonsDir: dir});
        const make = () => createApp({
            store, config, userRateLimiter: createRateLimiter({max: 50}), rateLimiter: createRateLimiter({max: 50})
        });
        return {store, config, make};
    };

    test('açılışta yüklenir, herkese görünür, öğretmen düzenleyemez/silemez; içerik değişince güncellenir', () => {
        const dir = makeDir('Arayüz turu', STEPS);
        const {make} = boot(dir);
        const app = make();
        let id;
        return request(app).get('/api/lessons')
            .then(res => {
                expect(res.body).toHaveLength(1);
                expect(res.body[0]).toMatchObject({title: 'Arayüz turu', builtin: true, teacherName: 'SARIKEDİ',
                    hasFile: true, mine: false});
                id = res.body[0].id;
                return request(app).get(`/api/lessons/${id}/file`);
            })
            .then(res => {
                expect(Buffer.from(res.body).equals(SB3)).toBe(true);
                return school(app);
            })
            .then(s => s.teacher.delete(`/api/lessons/${id}`)
                .then(res => {
                    expect(res.status).toBe(404);
                    return s.teacher.put(`/api/lessons/${id}`).send({title: 'X', steps: STEPS});
                }))
            .then(res => {
                expect(res.status).toBe(404);
                // repo dosyası değişti: aynı veritabanıyla yeniden açılış
                fs.writeFileSync(path.join(dir, 'arayuz.json'),
                    JSON.stringify({title: 'Arayüz turu 2', description: '', steps: [STEPS[0]]}));
                return request(make()).get('/api/lessons');
            })
            .then(res => {
                expect(res.body).toHaveLength(1);
                expect(res.body[0]).toMatchObject({id: id, title: 'Arayüz turu 2', stepCount: 1});
                // klasörden kaldırılınca silinir
                fs.rmSync(path.join(dir, 'arayuz.json'));
                return request(make()).get('/api/lessons');
            })
            .then(res => expect(res.body).toEqual([]));
    });
});
