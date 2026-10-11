/** @jest-environment node */
const path = require('path');
const {spawnSync} = require('child_process');

jest.setTimeout(300000);

describe('ders içerikleri', () => {
    test('lessons/verify.js tüm dersleri gerçek scratch-vm ile doğrular', () => {
        const script = path.join(__dirname, '..', '..', 'lessons', 'verify.js');
        const result = spawnSync(process.execPath, [script], {encoding: 'utf8', timeout: 280000});
        if (result.status !== 0) console.error(result.stdout + result.stderr);
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Tüm dersler doğrulandı');
    });
});
