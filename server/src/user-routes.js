/**
 * Öğretmen / öğrenci hesapları için API: kayıt, giriş, oturum, öğretmen paneli ve yönetici onayı.
 * Yetki kuralları accounts.js içindedir; burası HTTP, çerez ve hız sınırı katmanıdır.
 */

const express = require('express');
const auth = require('./auth');
const {ValidationError, NotFoundError} = require('./errors');
const {createProjects} = require('./projects');
const {createSocial} = require('./social');
const {isInappropriate} = require('./moderation');
const {mountLessonRoutes} = require('./lesson-routes');

const COOKIE_NAME = 'sk_user';
const SESSION_MS = 24 * 60 * 60 * 1000;
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 100;
const HASH_CONCURRENCY = 3;
const HASH_QUEUE_LIMIT = 200;
const GENERIC_LOGIN_ERROR = 'Kullanıcı adı ya da şifre yanlış';

// Aynı anda en çok HASH_CONCURRENCY parola işlemi; bir sınıf birden giriş yapınca kuyruğa alınır
const createHashQueue = () => {
    let running = 0;
    const waiting = [];
    const next = () => {
        if (running >= HASH_CONCURRENCY || waiting.length === 0) return;
        const job = waiting.shift();
        running += 1;
        job.task().then(job.resolve, job.reject)
            .then(() => {
                running -= 1;
                next();
            });
        next();
    };
    return task => new Promise((resolve, reject) => {
        if (waiting.length >= HASH_QUEUE_LIMIT) {
            reject(Object.assign(new Error('Sunucu meşgul'), {busy: true}));
            return;
        }
        waiting.push({task, resolve, reject});
        next();
    });
};

const integer = value => ((/^\d{1,12}$/).test(String(value)) ? Number(value) : null);

const checkPassword = password => {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
        throw new ValidationError(
            [`Şifre ${MIN_PASSWORD}-${MAX_PASSWORD} karakter olmalı`],
            'Kayıt bilgileri geçersiz'
        );
    }
};

const mountUserRoutes = ({
    api, admin, store, config, now, sameOrigin, jsonBody, parseCookies, limiter, registerLimiter
}) => {
    const accounts = store.accounts;
    const social = createSocial(store.db, {now: now});
    const projects = createProjects(store.db, {dir: config.projectsDir, onRemove: id => social.clearProject(id)});
    const queue = createHashQueue();

    const setSession = (res, user) => {
        const epoch = accounts.getEpoch(user.id);
        const token = auth.createUserToken(config.sessionSecret, user.id, epoch, now() + SESSION_MS);
        res.cookie(COOKIE_NAME, token, {
            httpOnly: true, sameSite: 'lax', secure: config.secureCookies, path: '/', maxAge: SESSION_MS
        });
    };

    // Geçerli oturumdaki kullanıcı ya da null (imza, süre, şifre sıfırlama dönemi ve onay durumu denetlenir)
    const currentUser = req => {
        const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
        const session = auth.verifyUserToken(token, config.sessionSecret, now());
        if (!session) return null;
        const user = accounts.getUser(session.userId);
        if (!user || accounts.getEpoch(user.id) !== session.epoch) return null;
        if (user.role === 'teacher' && !user.approved) return null;
        return user;
    };

    const requireRole = role => (req, res, next) => {
        const user = currentUser(req);
        if (!user) return res.status(401).json({error: 'Giriş gerekli'});
        if (user.role !== role) return res.status(403).json({error: 'Bu işlem için yetkin yok'});
        req.user = user;
        return next();
    };

    const hashed = password => queue(() => auth.hashPasswordAsync(password));
    const busy = (res, error, next) => {
        if (error && error.busy) {
            res.set('Retry-After', '2');
            return res.status(429).json({error: 'Sunucu meşgul. Biraz sonra tekrar dene.'});
        }
        return next(error);
    };

    const rateKey = req => auth.normalizeIp(req.ip);

    // ---- kayıt ve oturum ----
    api.post('/auth/register-teacher', sameOrigin, jsonBody, (req, res, next) => {
        if (registerLimiter.isBlocked(rateKey(req))) return res.status(429).json({error: 'Çok fazla kayıt denemesi'});
        const body = req.body || {};
        try {
            checkPassword(body.password);
        } catch (error) {
            return next(error);
        }
        return hashed(body.password).then(passwordHash => {
            const user = accounts.registerTeacher({
                username: body.username, realName: body.realName, school: body.school, passwordHash: passwordHash
            });
            registerLimiter.fail(rateKey(req));
            res.status(201).json({user: user, pending: true});
        })
            .catch(error => busy(res, error, next));
    });

    api.post('/auth/register-student', sameOrigin, jsonBody, (req, res, next) => {
        if (registerLimiter.isBlocked(rateKey(req))) return res.status(429).json({error: 'Çok fazla kayıt denemesi'});
        const body = req.body || {};
        try {
            checkPassword(body.password);
        } catch (error) {
            return next(error);
        }
        return hashed(body.password).then(passwordHash => {
            const user = accounts.registerStudent({
                classCode: body.classCode, username: body.username, realName: body.realName, passwordHash: passwordHash
            });
            registerLimiter.fail(rateKey(req));
            setSession(res, user);
            res.status(201).json({user: user});
        })
            .catch(error => busy(res, error, next));
    });

    api.post('/auth/login', sameOrigin, jsonBody, (req, res, next) => {
        const body = req.body || {};
        const key = `${rateKey(req)}|${String(body.username || '').toLocaleLowerCase('tr')}`;
        if (limiter.isBlocked(key)) {
            res.set('Retry-After', String(limiter.retryAfterSec(key)));
            return res.status(429).json({error: 'Çok fazla deneme. Biraz sonra tekrar dene.'});
        }
        const row = accounts.findForLogin(body.username);
        const check = row ?
            queue(() => auth.verifyPasswordAsync(body.password, row.password_hash)) : Promise.resolve(false);
        return check.then(ok => {
            if (!ok) {
                limiter.fail(key);
                return res.status(401).json({error: GENERIC_LOGIN_ERROR});
            }
            limiter.success(key);
            const user = accounts.getUser(row.id);
            if (user.role === 'teacher' && !user.approved) {
                return res.status(403).json({
                    error: 'Hesabın henüz onaylanmadı. Onaylanınca giriş yapabilirsin.',
                    pending: true
                });
            }
            setSession(res, user);
            return res.json({user: user});
        })
            .catch(error => busy(res, error, next));
    });

    api.post('/auth/logout', sameOrigin, (req, res) => {
        res.clearCookie(COOKIE_NAME, {path: '/'});
        res.json({user: null});
    });

    api.get('/auth/me', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json({user: currentUser(req)});
    });

    // ---- öğretmen paneli ----
    const teacher = express.Router();
    teacher.use(sameOrigin);
    teacher.use(requireRole('teacher'));

    teacher.get('/classes', (req, res) => res.json(accounts.listClasses(req.user.id)));

    teacher.post('/classes', jsonBody, (req, res) => {
        res.status(201).json(accounts.createClass(req.user.id, (req.body || {}).name));
    });

    teacher.get('/classes/:id/students', (req, res) => {
        res.json(accounts.listStudents(req.user.id, integer(req.params.id)));
    });

    teacher.post('/students/:id/reset-password', jsonBody, (req, res, next) => {
        try {
            checkPassword((req.body || {}).password);
        } catch (error) {
            return next(error);
        }
        return hashed(req.body.password).then(hash => {
            accounts.resetStudentPassword(req.user.id, integer(req.params.id), hash);
            res.json({ok: true});
        })
            .catch(error => busy(res, error, next));
    });

    teacher.delete('/students/:id', (req, res) => {
        accounts.removeStudent(req.user.id, integer(req.params.id)).forEach(id => {
            projects.removeAllOf(id);
            social.clearUser(id);
        });
        res.status(204).end();
    });

    api.use('/teacher', teacher);

    // ---- yönetici: hesaplar ----
    admin.get('/accounts', (req, res) => res.json(accounts.adminOverview()));

    admin.post('/teachers/:id/approve', jsonBody, (req, res) => {
        accounts.setApproved(integer(req.params.id), Boolean((req.body || {}).approved));
        res.json({ok: true});
    });

    admin.post('/teachers/:id/reset-password', jsonBody, (req, res, next) => {
        try {
            checkPassword((req.body || {}).password);
        } catch (error) {
            return next(error);
        }
        return hashed(req.body.password).then(hash => {
            accounts.setTeacherPassword(integer(req.params.id), hash);
            res.json({ok: true});
        })
            .catch(error => busy(res, error, next));
    });

    admin.delete('/teachers/:id', (req, res) => {
        accounts.removeTeacher(integer(req.params.id)).forEach(id => {
            projects.removeAllOf(id);
            social.clearUser(id);
            lessonStore.removeAllOf(id); // eslint-disable-line no-use-before-define
        });
        res.status(204).end();
    });

    // ---- projelerim ----
    const rawProject = express.raw({type: () => true, limit: '11mb'});
    const rawThumbnail = express.raw({type: () => true, limit: '400kb'});
    const mine = express.Router();
    mine.use(sameOrigin);
    mine.use((req, res, next) => {
        const user = currentUser(req);
        if (!user) return res.status(401).json({error: 'Giriş gerekli'});
        req.user = user;
        return next();
    });
    mine.get('/', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json(projects.list(req.user.id));
    });
    mine.post('/', rawProject, (req, res) => {
        res.status(201).json(projects.create(req.user.id, req.query.title, req.body));
    });
    mine.put('/:id', rawProject, (req, res) => {
        res.json(projects.update(req.user.id, integer(req.params.id), req.body));
    });
    mine.post('/:id/rename', jsonBody, (req, res) => {
        res.json(projects.rename(req.user.id, integer(req.params.id), (req.body || {}).title));
    });
    mine.get('/:id/file', (req, res) => {
        const file = projects.fileOwnedBy(req.user.id, integer(req.params.id));
        res.set('Cache-Control', 'no-store');
        res.type('application/octet-stream');
        res.sendFile(file);
    });
    mine.delete('/:id', (req, res) => {
        projects.remove(req.user.id, integer(req.params.id));
        res.status(204).end();
    });
    api.use('/projects', mine);

    // ---- paylaşım kuralları ----
    // Kim bu paylaşılan projeyi görebilir? Sahibi; kapsam "site" ise girişli herkes; "class" ise aynı sınıf ve
    // öğretmeni (öğretmenin kendi projesi için: öğretmeni ve öğretmenin sınıflarındaki öğrenciler).
    const canView = (viewer, project) => {
        if (!project || !project.shared) return false;
        if (viewer.id === project.userId) return true;
        if (project.scope === 'site') return true;
        const owner = accounts.getUser(project.userId);
        if (!owner) return false;
        if (owner.role === 'student') {
            return viewer.role === 'student' ?
                viewer.classId === owner.classId : accounts.classTeacher(owner.classId) === viewer.id;
        }
        return viewer.role === 'student' && accounts.classTeacher(viewer.classId) === owner.id;
    };

    // projeyi öğrencisi olarak yöneten öğretmen (öğretmenin kendi projesinde sahibi)
    const moderatorOf = project => {
        const owner = accounts.getUser(project.userId);
        if (!owner) return null;
        return owner.role === 'teacher' ? owner.id : accounts.classTeacher(owner.classId);
    };

    const ownerView = project => {
        const owner = accounts.getUser(project.userId);
        return {username: owner.username, role: owner.role};
    };

    const projectCard = (viewer, project) => Object.assign({
        id: project.id,
        title: project.title,
        owner: ownerView(project),
        scope: project.scope,
        hasThumbnail: project.hasThumbnail,
        comments: social.commentCount(project.id),
        updatedAt: project.updatedAt
    }, social.likeInfo(project.id, viewer.id));

    const commentView = (viewer, project, row) => ({
        id: row.id,
        body: row.body,
        author: {username: row.author_name, role: row.author_role},
        createdAt: new Date(row.created_ms).toISOString(),
        mine: row.user_id === viewer.id,
        canDelete: row.user_id === viewer.id || project.userId === viewer.id || moderatorOf(project) === viewer.id
    });

    const visibleProject = (viewer, id) => {
        const project = projects.get(integer(id));
        if (!project || !canView(viewer, project)) throw new NotFoundError('Proje bulunamadı');
        return project;
    };

    mine.post('/:id/share', jsonBody, (req, res) => {
        const body = req.body || {};
        // öğrenci projesi yalnızca sınıfına açılır; tüm siteye açmayı öğretmeni yapar
        const scope = req.user.role === 'teacher' && body.scope === 'site' ? 'site' : 'class';
        res.json(projects.setShared(req.user.id, integer(req.params.id), Boolean(body.shared), scope));
    });

    mine.put('/:id/thumbnail', rawThumbnail, (req, res) => {
        projects.saveThumbnail(req.user.id, integer(req.params.id), req.body);
        res.status(204).end();
    });

    const shared = express.Router();
    shared.use(sameOrigin);
    shared.use((req, res, next) => {
        const user = currentUser(req);
        if (!user) return res.status(401).json({error: 'Giriş gerekli'});
        req.user = user;
        return next();
    });

    shared.get('/', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json(projects.listShared(300).filter(project => canView(req.user, project))
            .slice(0, 100)
            .map(project => projectCard(req.user, project)));
    });

    shared.get('/:id', (req, res) => {
        res.set('Cache-Control', 'no-store');
        const project = visibleProject(req.user, req.params.id);
        res.json(Object.assign(projectCard(req.user, project), {
            comments: social.listComments(project.id).map(row => commentView(req.user, project, row)),
            commentCount: social.commentCount(project.id),
            mine: project.userId === req.user.id,
            canModerate: moderatorOf(project) === req.user.id
        }));
    });

    shared.get('/:id/file', (req, res) => {
        const project = visibleProject(req.user, req.params.id);
        res.set('Cache-Control', 'no-store');
        res.type('application/octet-stream');
        res.sendFile(projects.filePath(project.id));
    });

    shared.get('/:id/thumbnail', (req, res) => {
        const project = visibleProject(req.user, req.params.id);
        if (!project.hasThumbnail) throw new NotFoundError('Küçük resim yok');
        res.set('Cache-Control', 'no-cache');
        res.type('image/png');
        res.sendFile(projects.thumbnailPath(project.id));
    });

    shared.post('/:id/like', (req, res) => {
        const project = visibleProject(req.user, req.params.id);
        res.json(social.toggleLike(project.id, req.user.id));
    });

    shared.post('/:id/comments', jsonBody, (req, res) => {
        const project = visibleProject(req.user, req.params.id);
        const body = (req.body || {}).body;
        if (typeof body === 'string' && isInappropriate(body)) {
            throw new ValidationError(['Yorumun uygunsuz sözcükler içeriyor'], 'Yorumun uygunsuz sözcükler içeriyor');
        }
        const id = social.addComment(project.id, req.user.id, body);
        res.status(201).json(commentView(req.user, project, social.commentRow(id)));
    });

    shared.delete('/:id/comments/:commentId', (req, res) => {
        const project = visibleProject(req.user, req.params.id);
        const row = social.commentRow(integer(req.params.commentId));
        if (!row || row.project_id !== project.id) throw new NotFoundError('Yorum bulunamadı');
        if (!commentView(req.user, project, row).canDelete) {
            return res.status(403).json({error: 'Bu yorumu silemezsin'});
        }
        social.deleteComment(row.id);
        return res.status(204).end();
    });

    shared.post('/:id/report', jsonBody, (req, res) => {
        const project = visibleProject(req.user, req.params.id);
        const commentId = (req.body || {}).commentId ? integer(req.body.commentId) : 0;
        if (commentId) {
            const row = social.commentRow(commentId);
            if (!row || row.project_id !== project.id) throw new NotFoundError('Yorum bulunamadı');
            if (row.user_id === req.user.id) {
                return res.status(400).json({error: 'Kendi yorumunu bildiremezsin'});
            }
        } else if (project.userId === req.user.id) {
            return res.status(400).json({error: 'Kendi projeni bildiremezsin'});
        }
        social.report(project.id, commentId, req.user.id);
        return res.status(204).end();
    });

    api.use('/shared', shared);

    // ---- öğretmen: moderasyon ----
    const ownProject = (teacherUser, id) => {
        const project = projects.get(integer(id));
        if (!project || moderatorOf(project) !== teacherUser.id || project.userId === teacherUser.id) {
            throw new NotFoundError('Proje bulunamadı');
        }
        return project;
    };

    teacher.post('/projects/:id/scope', jsonBody, (req, res) => {
        const project = ownProject(req.user, req.params.id);
        const scope = (req.body || {}).scope === 'site' ? 'site' : 'class';
        res.json(projects.moderate(project.id, {scope: scope, shared: true}));
    });

    teacher.delete('/projects/:id', (req, res) => {
        const project = ownProject(req.user, req.params.id);
        projects.remove(project.userId, project.id);
        res.status(204).end();
    });

    teacher.post('/projects/:id/unshare', (req, res) => {
        const project = ownProject(req.user, req.params.id);
        res.json(projects.moderate(project.id, {shared: false}));
    });

    teacher.get('/reports', (req, res) => {
        const ids = accounts.studentIdsOf(req.user.id).concat([req.user.id])
            .reduce((all, userId) => all.concat(projects.list(userId).map(project => project.id)), []);
        const titles = {};
        ids.forEach(id => {
            titles[id] = projects.get(id).title;
        });
        res.json(social.reportsFor(ids).map(item => Object.assign(item, {projectTitle: titles[item.projectId]})));
    });

    teacher.post('/comments/:id/restore', (req, res) => {
        const row = social.commentRow(integer(req.params.id));
        const project = row ? projects.get(row.project_id) : null;
        if (!project || moderatorOf(project) !== req.user.id) throw new NotFoundError('Yorum bulunamadı');
        social.restoreComment(row.id);
        res.json({ok: true});
    });

    // ---- rehberli dersler ----
    const lessonStore = mountLessonRoutes({api, store, config, sameOrigin, jsonBody, currentUser, accounts, now});

    return {currentUser, requireRole, projects};
};

module.exports = {mountUserRoutes, COOKIE_NAME};
