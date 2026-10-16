/** @jest-environment node */
const path = require('path');
const {loadConfig} = require('../../server/src/config');

describe('loadConfig', () => {
    test('geliştirme varsayılanları', () => {
        const config = loadConfig({});
        expect(config.port).toBe(3001);
        expect(config.host).toBe('127.0.0.1');
        expect(config.adminPasswordHash).toBe('');
        expect(config.secureCookies).toBe(false);
        expect(config.trustProxy).toBe(false);
        expect(config.staticDir).toBeNull();
        expect(path.isAbsolute(config.dataDir)).toBe(true);
        expect(config.projectsDir).toBe(path.join(config.dataDir, 'projects'));
    });

    test('ortam değişkenleri uygulanır', () => {
        const config = loadConfig({
            PORT: '8080', HOST: '0.0.0.0', DATA_DIR: '/var/lib/sk', STATIC_DIR: '/srv/gui'
        });
        expect(config.port).toBe(8080);
        expect(config.host).toBe('0.0.0.0');
        expect(config.dataDir).toBe('/var/lib/sk');
        expect(config.projectsDir).toBe('/var/lib/sk/projects');
        expect(config.staticDir).toBe('/srv/gui');
    });

    test('geçersiz port varsayılana düşer; 0 işletim sistemine bırakılır', () => {
        ['abc', '-5', '70000', '', '80.5'].forEach(port => {
            expect(loadConfig({PORT: port}).port).toBe(3001);
        });
        expect(loadConfig({PORT: '0'}).port).toBe(0);
    });

    test('üretimde eksik şifre ve gizli anahtar hata verir', () => {
        expect(() => loadConfig({NODE_ENV: 'production'})).toThrow(/ADMIN_PASSWORD_HASH.*SESSION_SECRET/s);
        expect(() => loadConfig({NODE_ENV: 'production', ADMIN_PASSWORD_HASH: 'scrypt:a:b', SESSION_SECRET: 'kisa'}))
            .toThrow('SESSION_SECRET');
        expect(() => loadConfig({NODE_ENV: 'production', SESSION_SECRET: 'y'.repeat(32)}))
            .toThrow('ADMIN_PASSWORD_HASH');
    });

    test('üretimde geçerli ayar: güvenli çerez ve vekil güveni açılır', () => {
        const config = loadConfig({
            NODE_ENV: 'production', ADMIN_PASSWORD_HASH: 'scrypt:a:b', SESSION_SECRET: 'y'.repeat(32)
        });
        expect(config.secureCookies).toBe(true);
        expect(config.trustProxy).toBe(true);
    });

    test('TRUST_PROXY ve SECURE_COOKIES açıkça ayarlanabilir', () => {
        const config = loadConfig({TRUST_PROXY: '1', SECURE_COOKIES: '1'});
        expect(config.trustProxy).toBe(true);
        expect(config.secureCookies).toBe(true);
        expect(loadConfig({NODE_ENV: 'production', ADMIN_PASSWORD_HASH: 'a', SESSION_SECRET: 'y'.repeat(32),
            SECURE_COOKIES: '0'}).secureCookies).toBe(false);
    });

    test('üretim dışında gizli anahtar yoksa her süreç için rastgele ve yeterince uzun bir anahtar üretilir', () => {
        const first = loadConfig({});
        const second = loadConfig({});
        expect(first.sessionSecret.length).toBeGreaterThanOrEqual(32);
        expect(first.sessionSecret).not.toBe(second.sessionSecret);
    });

    test('açıkça verilen gizli anahtar korunur', () => {
        expect(loadConfig({SESSION_SECRET: 'z'.repeat(40)}).sessionSecret).toBe('z'.repeat(40));
    });
});
