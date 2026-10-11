/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {openStore} = require('../../server/src/db');
const {validLesson} = require('./helpers');

const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), `sk-${name}-`));
const SCRIPT = path.join(__dirname, '..', '..', 'server', 'scripts', 'reseed.js');

const run = (args, env) => spawnSync(process.execPath, [SCRIPT].concat(args), {
    encoding: 'utf8', env: Object.assign({}, process.env, env)
});

describe('reseed.js', () => {
    const setup = () => {
        const dataDir = tmp('data');
        const seedDir = tmp('seed');
        fs.writeFileSync(path.join(seedDir, 'a.json'), JSON.stringify(validLesson({id: 'a-ders', title: 'Tohum A'})));
        fs.writeFileSync(path.join(seedDir, 'b.json'), JSON.stringify(validLesson({id: 'b-ders', title: 'Tohum B'})));
        const store = openStore(path.join(dataDir, 'sarikedi.db'));
        store.create(validLesson({id: 'a-ders', title: 'Panelden düzenlendi'}));
        store.close();
        return {dataDir, seedDir, env: {DATA_DIR: dataDir, SEED_DIR: seedDir}};
    };

    const titles = dataDir => {
        const store = openStore(path.join(dataDir, 'sarikedi.db'));
        const result = {a: store.get('a-ders') && store.get('a-ders').title, b: store.get('b-ders') && store.get('b-ders').title};
        store.close();
        return result;
    };

    test('verilen ders güncellenir, diğerlerine dokunulmaz', () => {
        const {dataDir, env} = setup();
        const result = run(['a-ders'], env);
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('güncellendi: a-ders');
        expect(titles(dataDir)).toEqual({a: 'Tohum A', b: null});
    });

    test('--all eksik dersleri ekler ve var olanları günceller', () => {
        const {dataDir, env} = setup();
        const result = run(['--all'], env);
        expect(result.status).toBe(0);
        expect(titles(dataDir)).toEqual({a: 'Tohum A', b: 'Tohum B'});
    });

    test('silinmiş tohum ders yeniden eklenebilir', () => {
        const {dataDir, env} = setup();
        const store = openStore(path.join(dataDir, 'sarikedi.db'));
        store.remove('a-ders');
        store.close();
        expect(run(['a-ders'], env).status).toBe(0);
        expect(titles(dataDir).a).toBe('Tohum A');
    });

    test('tohumda olmayan kimlik hata verir ve veritabanı yolunu yazdırır', () => {
        const {dataDir, env} = setup();
        const result = run(['yok-boyle-ders'], env);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('yok-boyle-ders');
        expect(result.stdout).toContain(path.join(dataDir, 'sarikedi.db'));
    });

    test('argümansız çağrı kullanım mesajıyla hata verir', () => {
        const {env} = setup();
        const result = run([], env);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('Kullanım');
    });

    test('geçersiz tohum dosyası hata kodu verir, diğerleri uygulanır', () => {
        const {dataDir, seedDir, env} = setup();
        fs.writeFileSync(path.join(seedDir, 'c.json'), JSON.stringify(validLesson({id: 'c-ders', level: 'uzman'})));
        const result = run(['--all'], env);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('c.json');
        expect(titles(dataDir).b).toBe('Tohum B');
    });
});
