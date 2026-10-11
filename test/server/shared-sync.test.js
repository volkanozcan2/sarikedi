/** @jest-environment node */
const {spawnSync} = require('child_process');
const path = require('path');

describe('ortak doğrulama kodu', () => {
    test('server/src/lib, src/lib/lessons ile senkron', () => {
        const script = path.join(__dirname, '..', '..', 'server', 'scripts', 'build-shared.js');
        const result = spawnSync(process.execPath, [script, '--check'], {encoding: 'utf8'});
        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
    });

    test('üretilmiş doğrulayıcı çalışır', () => {
        const {validateLesson} = require('../../server/src/lib/schema');
        expect(validateLesson(null).valid).toBe(false);
        expect(validateLesson({}).errors.length).toBeGreaterThan(0);
    });
});
