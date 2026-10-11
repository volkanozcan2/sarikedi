/**
 * Ortam değişkenlerinden sunucu ayarı. Üretimde eksik gizli bilgiler hata verir.
 */

const crypto = require('crypto');
const path = require('path');

const MIN_SECRET_LENGTH = 32;

const parsePort = value => {
    if (typeof value === 'undefined' || value === '') return 3001;
    const port = Number(value);
    // 0: işletim sisteminin boş bir port seçmesi (testler için)
    return Number.isInteger(port) && port >= 0 && port <= 65535 ? port : 3001;
};

const flag = (value, fallback) => {
    if (value === '1' || value === 'true') return true;
    if (value === '0' || value === 'false') return false;
    return fallback;
};

const loadConfig = (env = process.env) => {
    const production = env.NODE_ENV === 'production';
    const dataDir = path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data'));
    const config = {
        port: parsePort(env.PORT),
        host: env.HOST || '127.0.0.1',
        dataDir: dataDir,
        uploadsDir: path.join(dataDir, 'uploads'),
        staticDir: env.STATIC_DIR ? path.resolve(env.STATIC_DIR) : null,
        seedDir: path.resolve(env.SEED_DIR || path.join(__dirname, '..', 'seed')),
        adminPasswordHash: env.ADMIN_PASSWORD_HASH || '',
        // Üretim dışında verilmemişse süreç başına rastgele bir anahtar (oturumlar yeniden başlatmada düşer)
        sessionSecret: env.SESSION_SECRET || (production ? '' : crypto.randomBytes(32).toString('hex')),
        secureCookies: flag(env.SECURE_COOKIES, production),
        trustProxy: flag(env.TRUST_PROXY, production)
    };
    if (production) {
        const problems = [];
        if (!config.adminPasswordHash) problems.push('ADMIN_PASSWORD_HASH tanımlı değil');
        if (config.sessionSecret.length < MIN_SECRET_LENGTH) {
            problems.push(`SESSION_SECRET en az ${MIN_SECRET_LENGTH} karakter olmalı`);
        }
        if (problems.length > 0) throw new Error(`Ayar hatası: ${problems.join('; ')}`);
    }
    return config;
};

module.exports = {loadConfig};
