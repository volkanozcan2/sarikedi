/** @jest-environment node */
const {
    hashPassword, verifyPassword, verifyPasswordAsync, normalizeIp, createSessionToken, verifySessionToken,
    createRateLimiter
} = require('../../server/src/auth');

describe('şifre özeti', () => {
    test('doğru şifre kabul, yanlış reddedilir', () => {
        const stored = hashPassword('gizli-sifre');
        expect(stored).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
        expect(verifyPassword('gizli-sifre', stored)).toBe(true);
        expect(verifyPassword('yanlis', stored)).toBe(false);
        expect(verifyPassword('', stored)).toBe(false);
    });

    test('aynı şifre farklı tuzlarla farklı özet üretir', () => {
        expect(hashPassword('a')).not.toBe(hashPassword('a'));
    });

    test('bozuk ya da beklenmeyen girişlerde atmaz, false döner', () => {
        const stored = hashPassword('x');
        [null, undefined, 5, {}, [], 'x'.repeat(300)].forEach(bad => {
            expect(verifyPassword(bad, stored)).toBe(false);
        });
        ['', 'scrypt', 'scrypt:aa', 'scrypt:zz:yy', 'md5:aa:bb', 'scrypt::', null, undefined, 5].forEach(bad => {
            expect(verifyPassword('x', bad)).toBe(false);
        });
        expect(verifyPassword('x', `scrypt:${'ab'.repeat(16)}:${'cd'.repeat(10)}`)).toBe(false);
    });
});

describe('oturum belirteci', () => {
    const secret = 's'.repeat(40);

    test('geçerli belirteç kabul edilir', () => {
        const token = createSessionToken(secret, 2000);
        expect(verifySessionToken(token, secret, 1000)).toBe(true);
    });

    test('süresi dolmuş belirteç reddedilir', () => {
        const token = createSessionToken(secret, 2000);
        expect(verifySessionToken(token, secret, 2000)).toBe(false);
        expect(verifySessionToken(token, secret, 5000)).toBe(false);
    });

    test('farklı gizli anahtarla ya da değiştirilmiş belirteç reddedilir', () => {
        const token = createSessionToken(secret, 2000);
        expect(verifySessionToken(token, 'baska'.repeat(10), 1000)).toBe(false);
        const [expires, signature] = token.split('.');
        expect(verifySessionToken(`${Number(expires) + 1000}.${signature}`, secret, 1000)).toBe(false);
        expect(verifySessionToken(`${expires}.${signature.slice(1)}A`, secret, 1000)).toBe(false);
    });

    test('bozuk belirteçler false döner', () => {
        [null, undefined, 5, '', '.', 'abc', '123.', '.abc', '12a.sig', `${'9'.repeat(30)}.sig`, {}, []].forEach(bad => {
            expect(verifySessionToken(bad, secret, 1000)).toBe(false);
        });
    });
});

describe('createRateLimiter', () => {
    const make = options => {
        const clock = {t: 0};
        const limiter = createRateLimiter(Object.assign({max: 3, windowMs: 1000, now: () => clock.t}, options));
        return {limiter, clock};
    };

    test('max hatadan sonra engellenir, süre dolunca açılır', () => {
        const {limiter, clock} = make();
        ['a', 'a'].forEach(() => limiter.fail('ip1'));
        expect(limiter.isBlocked('ip1')).toBe(false);
        limiter.fail('ip1');
        expect(limiter.isBlocked('ip1')).toBe(true);
        expect(limiter.retryAfterSec('ip1')).toBe(1);
        clock.t = 1000;
        expect(limiter.isBlocked('ip1')).toBe(false);
        expect(limiter.retryAfterSec('ip1')).toBe(0);
    });

    test('anahtarlar bağımsızdır, başarı sayacı sıfırlar', () => {
        const {limiter} = make();
        limiter.fail('a');
        limiter.fail('a');
        limiter.fail('b');
        limiter.success('a');
        limiter.fail('a');
        expect(limiter.isBlocked('a')).toBe(false);
        expect(limiter.isBlocked('b')).toBe(false);
    });

    test('anahtar sayısı sınırlıdır (bellek)', () => {
        const {limiter} = make({maxKeys: 10});
        for (let i = 0; i < 100; i++) limiter.fail(`ip${i}`);
        expect(limiter.size()).toBeLessThanOrEqual(10);
        limiter.fail('ip99');
        limiter.fail('ip99');
        limiter.fail('ip99');
        expect(limiter.isBlocked('ip99')).toBe(true);
    });
});

describe('verifyPasswordAsync', () => {
    test('verifyPassword ile aynı sonucu verir, event loop\'u bloklamaz', () => {
        const stored = hashPassword('gizli-sifre');
        return Promise.all([
            verifyPasswordAsync('gizli-sifre', stored),
            verifyPasswordAsync('yanlis', stored),
            verifyPasswordAsync(null, stored),
            verifyPasswordAsync('x'.repeat(300), stored),
            verifyPasswordAsync('x', 'scrypt:zz:yy'),
            verifyPasswordAsync('x', undefined)
        ]).then(results => expect(results).toEqual([true, false, false, false, false, false]));
    });
});

describe('normalizeIp', () => {
    test('IPv4 aynen, IPv4-eşlemeli IPv6 IPv4\'e döner', () => {
        expect(normalizeIp('203.0.113.7')).toBe('203.0.113.7');
        expect(normalizeIp('::ffff:203.0.113.7')).toBe('203.0.113.7');
    });

    test('IPv6 adresleri /64 öneke indirgenir', () => {
        expect(normalizeIp('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1:2');
        expect(normalizeIp('2001:db8:1:2::1')).toBe('2001:db8:1:2');
        expect(normalizeIp('2001:db8::1')).toBe('2001:db8:0:0');
        expect(normalizeIp('2001:DB8:1:2::1')).toBe('2001:db8:1:2');
        expect(normalizeIp('::1')).toBe('0:0:0:0');
    });

    test('boş ve garip girişler çökmez', () => {
        [undefined, null, '', 5, {}].forEach(value => expect(normalizeIp(value)).toBe('unknown'));
        expect(normalizeIp('bu bir ip degil')).toBe('bu bir ip degil');
    });
});

describe('createRateLimiter: genel bütçe', () => {
    test('tüm IP\'lerdeki toplam hata bütçeyi aşınca yeni anahtarlar da engellenir', () => {
        const clock = {t: 0};
        const limiter = createRateLimiter({
            max: 5, windowMs: 1000, globalMax: 3, globalWindowMs: 500, now: () => clock.t
        });
        limiter.fail('a');
        limiter.fail('b');
        expect(limiter.isBlocked('yeni')).toBe(false);
        limiter.fail('c');
        expect(limiter.isBlocked('yeni')).toBe(true);
        expect(limiter.retryAfterSec('yeni')).toBeGreaterThanOrEqual(1);
        clock.t = 500;
        expect(limiter.isBlocked('yeni')).toBe(false);
    });
});
