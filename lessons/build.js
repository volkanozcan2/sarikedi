/**
 * Ders kaynaklarını (lessons/sources/*.js) derleyip server/seed/*.json dosyalarını üretir.
 *   node lessons/build.js           yazar
 *   node lessons/build.js --check   dosyalar güncel mi denetler (çıkış kodu 1 = eski)
 */

const fs = require('fs');
const path = require('path');
const {compileLesson} = require('./lib/compile');
const {validateLesson} = require('../server/src/lib/schema');

const SOURCES_DIR = path.join(__dirname, 'sources');
const OUT_DIR = path.join(__dirname, '..', 'server', 'seed');

const loadSources = () => fs.readdirSync(SOURCES_DIR)
    .filter(name => name.endsWith('.js'))
    .sort()
    .map(name => require(path.join(SOURCES_DIR, name)));

const serialize = lesson => `${JSON.stringify(lesson, null, 2)}\n`;

const buildAll = () => loadSources().reduce((chain, definition) => chain.then(results => compileLesson(definition)
    .then(lesson => {
        const check = validateLesson(lesson);
        if (!check.valid) throw new Error(`${definition.id}: ${check.errors.join('; ')}`);
        return results.concat([lesson]);
    })), Promise.resolve([]));

if (require.main === module) {
    const check = process.argv.indexOf('--check') !== -1;
    buildAll().then(lessons => {
        let stale = false;
        lessons.forEach(lesson => {
            const target = path.join(OUT_DIR, `${lesson.id}.json`);
            const text = serialize(lesson);
            if (check) {
                const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
                if (current !== text) {
                    console.error(`eski: ${target}`);
                    stale = true;
                }
            } else {
                fs.writeFileSync(target, text);
                console.log(`yazıldı: ${lesson.id} (${lesson.steps.length} adım)`);
            }
        });
        process.exit(stale ? 1 : 0);
    })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {loadSources, buildAll, serialize};
