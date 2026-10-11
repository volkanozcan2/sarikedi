/**
 * Express uygulaması: herkese açık ders API'si ve girişli yönetici API'si.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const auth = require('./auth');
const {detectUpload} = require('./uploads');
const {ValidationError, NotFoundError, ConflictError} = require('./db');

const COOKIE_NAME = 'sk_admin';
const SESSION_MS = 12 * 60 * 60 * 1000;
const WRITE_METHODS = ['POST', 'PUT', 'DELETE'];

const parseCookies = header => {
    const cookies = {};
    if (typeof header !== 'string') return cookies;
    header.split(';').forEach(part => {
        const index = part.indexOf('=');
        if (index > 0) cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim();
    });
    return cookies;
};

const MAX_CONCURRENT_HASHING = 2;

const createApp = ({store, config, now = Date.now, rateLimiter = auth.createRateLimiter()}) => {
    // Boş/kısa anahtarla imzalanan çerezler tahmin edilebilir: hiçbir kipte buna izin verilmez
    if (typeof config.sessionSecret !== 'string' || config.sessionSecret.length < 32) {
        throw new Error('SESSION_SECRET en az 32 karakter olmalı');
    }
    let hashing = 0;
    const app = express();
    app.disable('x-powered-by');
    if (config.trustProxy) app.set('trust proxy', 1);

    app.use((req, res, next) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Referrer-Policy', 'same-origin');
        next();
    });
    app.use(compression());

    app.use('/uploads', express.static(config.uploadsDir, {
        dotfiles: 'ignore',
        index: false,
        redirect: false,
        maxAge: '30d',
        immutable: true
    }));

    const api = express.Router();
    const jsonBody = express.json({limit: '1mb'});
    const rawBody = express.raw({type: () => true, limit: '21mb'});

    const sameOrigin = (req, res, next) => {
        const origin = req.get('origin');
        if (origin && WRITE_METHODS.indexOf(req.method) !== -1) {
            let host = null;
            try {
                host = new URL(origin).host;
            } catch (e) {
                host = null;
            }
            if (host !== req.get('host')) return res.status(403).json({error: 'İstek kaynağı geçersiz'});
        }
        return next();
    };

    // Belirteç geçerli mi? (imza + süre + çıkış/iptal zamanından sonra verilmiş olmalı)
    const validSession = token => {
        if (!auth.verifySessionToken(token, config.sessionSecret, now())) return false;
        const issuedAt = Number(token.slice(0, token.indexOf('.'))) - SESSION_MS;
        return issuedAt > store.getRevokedBefore();
    };

    const requireAdmin = (req, res, next) => {
        if (!validSession(parseCookies(req.headers.cookie)[COOKIE_NAME])) {
            return res.status(401).json({error: 'Giriş gerekli'});
        }
        return next();
    };

    // ---- herkese açık ----
    api.get('/health', (req, res) => res.json({ok: true}));

    api.get('/lessons', (req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.json(store.listPublished());
    });

    api.get('/lessons/:id', (req, res) => {
        res.set('Cache-Control', 'no-cache');
        const lesson = store.get(req.params.id);
        if (!lesson || !lesson.published) return res.status(404).json({error: 'Ders bulunamadı'});
        return res.json(lesson);
    });

    // ---- yönetici ----
    api.post('/admin/login', sameOrigin, jsonBody, (req, res, next) => {
        const key = auth.normalizeIp(req.ip);
        if (rateLimiter.isBlocked(key)) {
            res.set('Retry-After', String(rateLimiter.retryAfterSec(key)));
            return res.status(429).json({error: 'Çok fazla deneme. Biraz sonra tekrar dene.'});
        }
        if (!config.adminPasswordHash) return res.status(503).json({error: 'Yönetici girişi ayarlanmamış'});
        if (hashing >= MAX_CONCURRENT_HASHING) {
            res.set('Retry-After', '1');
            return res.status(429).json({error: 'Sunucu meşgul. Biraz sonra tekrar dene.'});
        }
        hashing += 1;
        const password = req.body ? req.body.password : null;
        return auth.verifyPasswordAsync(password, config.adminPasswordHash).then(ok => {
            hashing -= 1;
            if (!ok) {
                rateLimiter.fail(key);
                return res.status(401).json({error: 'Şifre yanlış'});
            }
            rateLimiter.success(key);
            // iptalden hemen sonra verilen belirteç de geçerli olsun diye en az revokedBefore + 1
            const issuedAt = Math.max(now(), store.getRevokedBefore() + 1);
            res.cookie(COOKIE_NAME, auth.createSessionToken(config.sessionSecret, issuedAt + SESSION_MS), {
                httpOnly: true,
                sameSite: 'strict',
                secure: config.secureCookies,
                path: '/',
                maxAge: SESSION_MS
            });
            return res.json({admin: true});
        }, error => {
            hashing -= 1;
            next(error);
        });
    });

    api.post('/admin/logout', sameOrigin, (req, res) => {
        // Yalnızca geçerli oturumu olan biri çıkış yapabilir; çıkış tüm eski belirteçleri iptal eder
        if (validSession(parseCookies(req.headers.cookie)[COOKIE_NAME])) store.setRevokedBefore(now());
        res.clearCookie(COOKIE_NAME, {path: '/'});
        res.json({admin: false});
    });

    const admin = express.Router();
    admin.use(requireAdmin);
    admin.use(sameOrigin);

    admin.get('/me', (req, res) => res.json({admin: true}));

    admin.get('/lessons', (req, res) => res.json(store.listAll()));

    admin.get('/lessons/:id', (req, res) => {
        const lesson = store.get(req.params.id);
        if (!lesson) return res.status(404).json({error: 'Ders bulunamadı'});
        return res.json(lesson);
    });

    admin.post('/lessons', jsonBody, (req, res) => {
        store.create(req.body);
        res.status(201).json(store.get(req.body.id));
    });

    admin.put('/lessons/:id', jsonBody, (req, res) => {
        store.replace(req.params.id, req.body);
        res.json(store.get(req.params.id));
    });

    admin.delete('/lessons/:id', (req, res) => {
        if (!store.remove(req.params.id)) return res.status(404).json({error: 'Ders bulunamadı'});
        return res.status(204).end();
    });

    admin.put('/order', jsonBody, (req, res) => {
        store.reorder(req.body ? req.body.ids : null);
        res.json({ok: true});
    });

    admin.post('/upload', rawBody, (req, res) => {
        const body = req.body;
        if (!Buffer.isBuffer(body) || body.length < 12) {
            return res.status(400).json({error: 'Dosya boş ya da çok küçük'});
        }
        const kind = detectUpload(body);
        if (!kind) {
            return res.status(415).json({error: 'Desteklenmeyen dosya türü (png, jpg, gif, webp, sb3)'});
        }
        if (body.length > kind.maxBytes) return res.status(413).json({error: 'Dosya çok büyük'});
        fs.mkdirSync(config.uploadsDir, {recursive: true});
        const name = `${crypto.randomBytes(12).toString('hex')}.${kind.ext}`;
        fs.writeFileSync(path.join(config.uploadsDir, name), body, {flag: 'wx'});
        return res.status(201).json({url: `/uploads/${name}`});
    });

    api.use('/admin', admin);
    api.use((req, res) => res.status(404).json({error: 'Bulunamadı'}));
    app.use('/api', api);

    if (config.staticDir) {
        app.use(express.static(config.staticDir, {
            index: 'index.html',
            setHeaders: (res, filePath) => {
                const normalized = filePath.split(path.sep).join('/');
                const hashed = normalized.indexOf('/chunks/') !== -1 || normalized.indexOf('/static/assets/') !== -1;
                res.set('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
            }
        }));
    }

    // Eşleşmeyen istekler: 404'ü önbelleğe alma. Cloudflare olmayan dosyaya kendiliğinden max-age=14400 ekler;
    // yeni dağıtımda dosya gelse bile tarayıcı 4 saat boyunca eski 404'ü gösterirdi (kukla eklenememesinin nedeni).
    app.use((req, res) => {
        res.set('Cache-Control', 'no-store');
        res.status(404)
            .type('text/plain')
            .send('Bulunamadı');
    });

    // eslint-disable-next-line no-unused-vars
    app.use((error, req, res, next) => {
        if (error instanceof ValidationError) {
            return res.status(400).json({error: error.message, errors: error.errors});
        }
        if (error instanceof NotFoundError) return res.status(404).json({error: error.message});
        if (error instanceof ConflictError) return res.status(409).json({error: error.message});
        if (error.type === 'entity.too.large') return res.status(413).json({error: 'İstek çok büyük'});
        if (error.type === 'entity.parse.failed' || error instanceof SyntaxError) {
            return res.status(400).json({error: 'Geçersiz JSON'});
        }
        console.error(error);
        return res.status(500).json({error: 'Sunucu hatası'});
    });

    return app;
};

module.exports = {
    createApp
};
