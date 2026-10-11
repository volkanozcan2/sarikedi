/**
 * Derslerin doğrulaması (düz Node, gerçek scratch-vm ile):
 *  - seed dosyaları kaynaklarla senkron ve şemaya uygun
 *  - her kontrollü adım çözümle geçer, bir önceki adımın durumuyla geçmez
 *  - metin, ipucu ve rehber kuralları
 * Çıkış kodu 0 = hepsi tamam. `node lessons/verify.js [ders-kimliği]`
 */

const fs = require('fs');
const path = require('path');
const {SIG} = require('./lib/dsl');
const {resolveStates, runStepIn} = require('./lib/compile');
const {loadSources, buildAll, serialize} = require('./build');
const {validateLesson, UI_IDS} = require('../server/src/lib/schema');

const LIBRARY = require('../src/lib/libraries/sprites.json');
const SEED_DIR = path.join(__dirname, '..', 'server', 'seed');
const CATEGORIES = ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'myBlocks'];
const only = process.argv[2];
const problems = [];
const problem = (lessonId, message) => problems.push(`${lessonId}: ${message}`);

const checkStructure = (id, lesson) => {
    if (lesson.steps.length < 6) problem(id, 'en az 6 adım olmalı');
    lesson.steps.forEach((step, i) => {
        const where = `adım ${i + 1}`;
        if (step.text.length < 20) problem(id, `${where}: metin çok kısa`);
        if (step.checks.length > 0 && !step.hint) problem(id, `${where}: kontrollü adımda ipucu yok`);
        const needsPlacement = step.guide.some(a => a.type === 'drag' && a.from.kind === 'block' &&
            ['control_if', 'control_if_else', 'control_forever', 'control_repeat_until', 'control_wait_until']
                .indexOf(a.from.opcode) !== -1);
        if (needsPlacement && (step.hint || '').indexOf('EN ALTINA') === -1) problem(id, `${where}: yerleştirme ipucu yok`);
        const palette = step.guide.filter(a => a.type === 'drag' && a.from.kind === 'block');
        if (palette.length > 1) problem(id, `${where}: aynı adımda birden fazla palet bloğu sürükleniyor`);
        step.guide.forEach(action => {
            const targets = action.type === 'drag' ? [action.from, action.to] : [action.target];
            targets.forEach(t => {
                if ((t.kind === 'block' || t.kind === 'workspaceBlock') && !SIG[t.opcode]) {
                    problem(id, `${where}: bilinmeyen opcode ${t.opcode}`);
                }
                if (t.kind === 'category' && CATEGORIES.indexOf(t.id) === -1) problem(id, `${where}: kategori ${t.id}`);
                if (t.kind === 'ui' && UI_IDS.indexOf(t.id) === -1) problem(id, `${where}: arayüz ${t.id}`);
            });
        });
    });
};

const checkLibraryNames = (source, lesson) => {
    const known = {};
    LIBRARY.forEach(item => {
        known[item.name] = item;
    });
    lesson.steps.forEach((step, i) => {
        step.checks.forEach(check => {
            if (check.sprite && check.sprite !== 'Cool Cat' && check.sprite !== 'Sahne' && !known[check.sprite]) {
                problem(source.id, `adım ${i + 1}: "${check.sprite}" kukla kütüphanesinde yok`);
            }
        });
    });
};

const checkSteps = (source, lesson) => {
    const states = resolveStates(source);
    return lesson.steps.reduce((chain, step, i) => chain.then(() => {
        if (step.checks.length === 0) return null;
        return runStepIn(step, states[i]).then(result => {
            if (!result.passed) problem(source.id, `adım ${i + 1}: çözüm kontrolden geçmedi ${JSON.stringify(result.results)}`);
            const previous = i > 0 ? states[i - 1] : {sprites: {}, variables: source.variables};
            return runStepIn(step, previous).then(negative => {
                if (negative.passed) problem(source.id, `adım ${i + 1}: önceki durumla da geçiyor (kontrol zayıf)`);
                // olası yanlış çözümler (işaret hatası, yanlış kukla...) geçmemeli
                return states[i].wrong.reduce((inner, wrong, w) => inner.then(() => runStepIn(step, {
                    sprites: wrong.scripts, variables: source.variables
                }).then(res => {
                    if (res.passed) problem(source.id, `adım ${i + 1}: yanlış çözüm #${w + 1} kontrolden geçiyor`);
                })), Promise.resolve());
            });
        });
    }), Promise.resolve());
};

const sources = loadSources().filter(s => !only || s.id === only);

buildAll().then(lessons => lessons.filter(l => !only || l.id === only).reduce((chain, lesson) => chain.then(() => {
    const source = sources.find(s => s.id === lesson.id);
    const file = path.join(SEED_DIR, `${lesson.id}.json`);
    if (!fs.existsSync(file)) problem(lesson.id, 'seed dosyası yok (npm run build:lessons)');
    else if (fs.readFileSync(file, 'utf8') !== serialize(lesson)) problem(lesson.id, 'seed dosyası eski (npm run build:lessons)');
    const shape = validateLesson(lesson);
    if (!shape.valid) problem(lesson.id, `şema: ${shape.errors.join('; ')}`);
    checkStructure(lesson.id, lesson);
    checkLibraryNames(source, lesson);
    return checkSteps(source, lesson).then(() => console.log(`ders: ${lesson.id} (${lesson.steps.length} adım) tamam`));
}), Promise.resolve())).then(() => {
    const ids = loadSources().map(s => s.id);
    if (new Set(ids).size !== ids.length) problem('genel', 'ders kimlikleri benzersiz değil');
    const orders = loadSources().map(s => s.order);
    if (new Set(orders).size !== orders.length) problem('genel', 'ders sıraları çakışıyor');
    if (problems.length > 0) {
        problems.forEach(p => console.error(`SORUN ${p}`));
        process.exit(1);
    }
    console.log('Tüm dersler doğrulandı');
    process.exit(0);
})
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
