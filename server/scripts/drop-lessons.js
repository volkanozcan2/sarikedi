/**
 * Kaldırılan "Dersler" özelliğinin canlı verisini siler: `lessons` ve `seeded` tabloları ile
 * `uploads/` klasöründeki ders kapakları ve başlangıç projeleri. GERİ ALINAMAZ: önce yedek al.
 *
 * Kullanım (önce yedek!):
 *   DATA_DIR=/data node scripts/drop-lessons.js          # ne silineceğini gösterir (hiçbir şey silmez)
 *   DATA_DIR=/data node scripts/drop-lessons.js --yes    # gerçekten siler
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const tableExists = (db, name) => Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
);

/**
 * @param {object} db better-sqlite3 veritabanı
 * @param {?string} uploadsDir yükleme klasörü
 * @param {boolean} apply true ise siler, false ise yalnızca sayar
 * @returns {{lessons: number, seeded: number, files: number}} bulunan ya da silinen kayıt sayıları
 */
const dropLessons = (db, uploadsDir, apply) => {
    const count = name => (tableExists(db, name) ? db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n : 0);
    const result = {lessons: count('lessons'), seeded: count('seeded'), files: 0};
    let files = [];
    if (uploadsDir && fs.existsSync(uploadsDir)) files = fs.readdirSync(uploadsDir);
    result.files = files.length;
    if (apply) {
        db.exec('DROP TABLE IF EXISTS lessons');
        db.exec('DROP TABLE IF EXISTS seeded');
        files.forEach(name => fs.rmSync(path.join(uploadsDir, name), {recursive: true, force: true}));
    }
    return result;
};

if (require.main === module) {
    const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
    const dbFile = path.join(dataDir, 'sarikedi.db');
    if (!fs.existsSync(dbFile)) {
        console.error(`Veritabanı bulunamadı: ${dbFile}`);
        process.exit(1);
    }
    const apply = process.argv.indexOf('--yes') !== -1;
    const db = new Database(dbFile);
    const result = dropLessons(db, path.join(dataDir, 'uploads'), apply);
    db.close();
    console.log(`${apply ? 'Silindi' : 'Silinecek (denemedir, hiçbir şey silinmedi)'}: ` +
        `${result.lessons} ders, ${result.seeded} tohum kaydı, ${result.files} yüklenen dosya`);
    if (!apply) console.log('Gerçekten silmek için --yes ekle (önce yedek al).');
}

module.exports = {dropLessons};
