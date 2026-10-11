/**
 * Tohum derslerini (SEED_DIR/*.json) veritabanına ZORLA uygular: var olan dersin üzerine yazar.
 * Panelden yapılan düzenlemeler kaybolur, bu yüzden yalnızca istenen derslere uygula.
 *   node scripts/reseed.js yildiz-yakala labirent    # yalnızca bunlar
 *   node scripts/reseed.js --all                     # tohumdaki tüm dersler
 * DATA_DIR / SEED_DIR ortam değişkenleri sunucuyla aynıdır. Sunucu açıkken de çalışır.
 */

const fs = require('fs');
const path = require('path');
const {loadConfig} = require('../src/config');
const {openStore} = require('../src/db');

const args = process.argv.slice(2);
const all = args.indexOf('--all') !== -1;
const wanted = args.filter(arg => arg !== '--all');

if (!all && wanted.length === 0) {
    console.error('Kullanım: reseed.js --all  ya da  reseed.js <ders-kimliği>...');
    process.exit(1);
}

const config = loadConfig(Object.assign({NODE_ENV: ''}, process.env, {NODE_ENV: ''}));
const dbFile = path.join(config.dataDir, 'sarikedi.db');
console.log(`Veritabanı: ${dbFile}`);
const store = openStore(dbFile);
let failures = 0;
const applied = [];

fs.readdirSync(config.seedDir).filter(name => name.endsWith('.json'))
    .sort()
    .forEach(name => {
        try {
            const lesson = JSON.parse(fs.readFileSync(path.join(config.seedDir, name), 'utf8'));
            if (!all && wanted.indexOf(lesson.id) === -1) return;
            if (store.get(lesson.id)) {
                store.replace(lesson.id, lesson);
                console.log(`güncellendi: ${lesson.id}`);
            } else {
                store.create(lesson);
                console.log(`eklendi: ${lesson.id}`);
            }
            store.markSeeded(lesson.id);
            applied.push(lesson.id);
        } catch (error) {
            failures += 1;
            console.error(`${name}: ${error.message}${error.errors ? ` ${error.errors.join('; ')}` : ''}`);
        }
    });

wanted.filter(id => applied.indexOf(id) === -1).forEach(id => {
    failures += 1;
    console.error(`tohumda böyle bir ders yok: ${id}`);
});

store.close();
process.exit(failures > 0 ? 1 : 0);
