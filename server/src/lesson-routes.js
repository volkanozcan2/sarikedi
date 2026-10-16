/**
 * Rehberli dersler için HTTP katmanı. Dersi yalnızca onaylı öğretmenler oluşturur/düzenler; görünürlük kuralları
 * lessons.js içindedir. Ders iki istekte kaydedilir: önce üstveri ve adımlar (JSON), sonra başlangıç projesi (.sb3).
 */

const express = require('express');
const path = require('path');
const {createLessons} = require('./lessons');
const {NotFoundError} = require('./errors');

const integer = value => ((/^\d{1,12}$/).test(String(value)) ? Number(value) : null);

// repodaki hazır dersler (sunucu imajına server/ klasörüyle birlikte girer)
const BUILTIN_DIR = path.join(__dirname, '..', 'builtin-lessons');

const mountLessonRoutes = ({api, store, config, sameOrigin, jsonBody, currentUser, accounts, now}) => {
    // testler config.builtinLessonsDir ile başka bir klasör verebilir ya da null ile kapatabilir
    const builtinDir = 'builtinLessonsDir' in config ? config.builtinLessonsDir : BUILTIN_DIR;
    const options = {dir: path.join(config.projectsDir, 'lessons')};
    if (now) options.now = () => new Date(now()).toISOString();
    const lessons = createLessons(store.db, options);
    try {
        if (builtinDir) lessons.syncBuiltins(builtinDir);
    } catch (error) {
        console.error('Hazır dersler yüklenemedi:', error.message); // eslint-disable-line no-console
    }
    const rawProject = express.raw({type: () => true, limit: '11mb'});

    const requireTeacher = (req, res, next) => {
        const user = currentUser(req);
        if (!user) return res.status(401).json({error: 'Giriş gerekli'});
        if (user.role !== 'teacher') return res.status(403).json({error: 'Ders yalnızca öğretmenler oluşturabilir'});
        req.user = user;
        return next();
    };

    // sınıf seçildiyse öğretmenin kendi sınıfı olmalı; boş ise ders herkese açık
    const classFor = (teacherId, value) => {
        if (value === null || typeof value === 'undefined' || value === '') return null;
        const classId = integer(value);
        const mine = accounts.listClasses(teacherId).some(klass => klass.id === classId);
        if (!mine) throw new NotFoundError('Sınıf bulunamadı');
        return classId;
    };

    const withNames = (viewer, lesson) => {
        const teacher = accounts.getUser(lesson.teacherId);
        const klass = lesson.classId && teacher ?
            accounts.listClasses(teacher.id).find(item => item.id === lesson.classId) : null;
        return Object.assign({}, lesson, {
            teacherName: lesson.builtin ? 'SARIKEDİ' : (teacher ? teacher.realName : ''),
            className: klass ? klass.name : null,
            mine: Boolean(viewer && viewer.id === lesson.teacherId && viewer.role === 'teacher')
        });
    };

    const router = express.Router();
    router.use(sameOrigin);

    router.get('/', (req, res) => {
        const viewer = currentUser(req);
        res.set('Cache-Control', 'no-store');
        res.json(lessons.list(viewer).map(lesson => withNames(viewer, lesson)));
    });
    router.get('/:id', (req, res) => {
        const viewer = currentUser(req);
        res.set('Cache-Control', 'no-store');
        res.json(withNames(viewer, lessons.get(viewer, integer(req.params.id))));
    });
    router.get('/:id/file', (req, res) => {
        const file = lessons.filePath(currentUser(req), integer(req.params.id));
        res.set('Cache-Control', 'no-store');
        res.type('application/octet-stream');
        res.sendFile(file);
    });
    router.post('/', requireTeacher, jsonBody, (req, res) => {
        const body = req.body || {};
        const lesson = lessons.create(req.user.id, classFor(req.user.id, body.classId), body);
        res.status(201).json(withNames(req.user, lesson));
    });
    router.put('/:id', requireTeacher, jsonBody, (req, res) => {
        const body = req.body || {};
        const lesson = lessons.update(req.user.id, integer(req.params.id), classFor(req.user.id, body.classId), body);
        res.json(withNames(req.user, lesson));
    });
    router.put('/:id/file', requireTeacher, rawProject, (req, res) => {
        res.json(withNames(req.user, lessons.saveFile(req.user.id, integer(req.params.id), req.body)));
    });
    router.delete('/:id', requireTeacher, (req, res) => {
        lessons.remove(req.user.id, integer(req.params.id));
        res.status(204).end();
    });
    api.use('/lessons', router);
    return lessons;
};

module.exports = {mountLessonRoutes};
