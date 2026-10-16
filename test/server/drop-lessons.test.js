/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {openStore} = require('../../server/src/db');
const {dropLessons} = require('../../server/scripts/drop-lessons');

const setup = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-drop-'));
    const uploads = path.join(dir, 'uploads');
    fs.mkdirSync(uploads);
    fs.writeFileSync(path.join(uploads, 'kapak.png'), 'x');
    fs.writeFileSync(path.join(uploads, 'proje.sb3'), 'y');
    const db = openStore(':memory:').db;
    db.exec('CREATE TABLE lessons (id TEXT PRIMARY KEY)');
    db.exec('CREATE TABLE seeded (id TEXT PRIMARY KEY)');
    db.exec("INSERT INTO lessons VALUES ('a'), ('b')");
    db.exec("INSERT INTO seeded VALUES ('a')");
    return {db, uploads};
};

describe('drop-lessons', () => {
    test('deneme kipi sayar ama hiçbir şeyi silmez', () => {
        const {db, uploads} = setup();
        expect(dropLessons(db, uploads, false)).toEqual({lessons: 2, seeded: 1, files: 2});
        expect(db.prepare('SELECT COUNT(*) AS n FROM lessons').get().n).toBe(2);
        expect(fs.readdirSync(uploads)).toHaveLength(2);
    });

    test('uygulanınca ders tabloları ve yüklenen dosyalar silinir, hesaplar korunur', () => {
        const {db, uploads} = setup();
        dropLessons(db, uploads, true);
        expect(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('lessons', 'seeded')").get().n).toBe(0);
        expect(fs.readdirSync(uploads)).toHaveLength(0);
        expect(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'users'").get().n).toBe(1);
    });

    test('tablolar ya da klasör yoksa hata vermez', () => {
        const db = openStore(':memory:').db;
        expect(dropLessons(db, '/yok/uploads', true)).toEqual({lessons: 0, seeded: 0, files: 0});
    });
});
