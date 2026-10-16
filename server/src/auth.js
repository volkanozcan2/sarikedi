/**
 * Yönetici kimlik doğrulaması: şifre özeti (scrypt), imzalı oturum belirteci
 * ve hatalı giriş hız sınırı. Hiçbiri bu dosyanın dışında bir durum tutmaz.
 */

const crypto = require('crypto');

const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 200;

const hashPassword = password => {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, KEY_LENGTH);
    return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
};

const hashPasswordAsync = password => new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, KEY_LENGTH, (error, hash) => {
        if (error) reject(error);
        else resolve(`scrypt:${salt.toString('hex')}:${hash.toString('hex')}`);
    });
});

const verifyPassword = (password, stored) => {
    if (typeof password !== 'string' || typeof stored !== 'string') return false;
    if (password.length > MAX_PASSWORD_LENGTH) return false;
    const parts = stored.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    try {
        const salt = Buffer.from(parts[1], 'hex');
        const expected = Buffer.from(parts[2], 'hex');
        if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;
        const actual = crypto.scryptSync(password, salt, KEY_LENGTH);
        return crypto.timingSafeEqual(actual, expected);
    } catch (e) {
        return false;
    }
};

const verifyPasswordAsync = (password, stored) => new Promise(resolve => {
    if (typeof password !== 'string' || typeof stored !== 'string') return resolve(false);
    if (password.length > MAX_PASSWORD_LENGTH) return resolve(false);
    const parts = stored.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return resolve(false);
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    if (salt.length === 0 || expected.length !== KEY_LENGTH) return resolve(false);
    return crypto.scrypt(password, salt, KEY_LENGTH, (error, actual) => {
        resolve(!error && crypto.timingSafeEqual(actual, expected));
    });
});

// Hız sınırı anahtarı: IPv6 adresleri /64 öneke indirgenir (bir /64 sahibi sınırsız adres üretebilir)
const normalizeIp = ip => {
    if (typeof ip !== 'string' || ip === '') return 'unknown';
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return mapped[1];
    if (ip.indexOf(':') === -1) return ip;
    const halves = ip.toLowerCase().split('::');
    if (halves.length > 2) return ip;
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const missing = halves.length === 2 ? 8 - left.length - right.length : 0;
    const full = left.concat(new Array(Math.max(missing, 0)).fill('0'), right);
    if (full.length !== 8) return ip;
    const prefix = full.slice(0, 4).map(part => parseInt(part, 16));
    if (prefix.some(part => isNaN(part))) return ip;
    return prefix.map(part => part.toString(16)).join(':');
};

const sign = (secret, value) => crypto.createHmac('sha256', secret).update(value)
    .digest('base64url');

const createSessionToken = (secret, expiresAtMs) => `${expiresAtMs}.${sign(secret, String(expiresAtMs))}`;

const verifySessionToken = (token, secret, nowMs) => {
    if (typeof token !== 'string') return false;
    const dot = token.indexOf('.');
    if (dot < 1) return false;
    const expires = token.slice(0, dot);
    if (!(/^\d{1,15}$/).test(expires)) return false;
    const given = Buffer.from(token.slice(dot + 1));
    const expected = Buffer.from(sign(secret, expires));
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
    return Number(expires) > nowMs;
};

// Kullanıcı (öğretmen/öğrenci) oturum belirteci: "kimlik.dönem.bitiş.imza". Dönem, şifre sıfırlanınca artar ve
// eski belirteçleri geçersiz kılar.
const createUserToken = (secret, userId, epoch, expiresAtMs) => {
    const body = `${userId}.${epoch}.${expiresAtMs}`;
    return `${body}.${sign(secret, `user:${body}`)}`;
};

const verifyUserToken = (token, secret, nowMs) => {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 4 || !parts.slice(0, 3).every(part => (/^\d{1,15}$/).test(part))) return null;
    const body = parts.slice(0, 3).join('.');
    const given = Buffer.from(parts[3]);
    const expected = Buffer.from(sign(secret, `user:${body}`));
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    if (Number(parts[2]) <= nowMs) return null;
    return {userId: Number(parts[0]), epoch: Number(parts[1])};
};

const createRateLimiter = ({
    max = 5,
    windowMs = 15 * 60 * 1000,
    globalMax = 20,
    globalWindowMs = 60 * 1000,
    now = Date.now,
    maxKeys = 5000
} = {}) => {
    const failures = new Map();
    let global = {count: 0, first: 0};

    const entry = key => {
        const found = failures.get(key);
        if (found && now() - found.first >= windowMs) {
            failures.delete(key);
            return null;
        }
        return found || null;
    };

    const globalEntry = () => {
        if (global.count > 0 && now() - global.first >= globalWindowMs) global = {count: 0, first: 0};
        return global;
    };

    const keyBlocked = key => {
        const found = entry(key);
        return Boolean(found && found.count >= max);
    };

    const globalBlocked = () => globalEntry().count >= globalMax;

    return {
        isBlocked: key => globalBlocked() || keyBlocked(key),
        retryAfterSec: key => {
            const waits = [];
            const found = entry(key);
            if (found && keyBlocked(key)) waits.push(found.first + windowMs - now());
            if (globalBlocked()) waits.push(global.first + globalWindowMs - now());
            if (waits.length === 0) return 0;
            return Math.max(1, Math.ceil(Math.max.apply(null, waits) / 1000));
        },
        fail: key => {
            const current = globalEntry();
            if (current.count === 0) global = {count: 1, first: now()};
            else current.count += 1;
            const found = entry(key);
            if (found) {
                found.count += 1;
                return;
            }
            if (failures.size >= maxKeys) failures.delete(failures.keys().next().value);
            failures.set(key, {count: 1, first: now()});
        },
        success: key => {
            failures.delete(key);
        },
        size: () => failures.size
    };
};

module.exports = {
    hashPassword,
    hashPasswordAsync,
    createUserToken,
    verifyUserToken,
    verifyPassword,
    verifyPasswordAsync,
    normalizeIp,
    createSessionToken,
    verifySessionToken,
    createRateLimiter
};
