import {snapshotBlocks} from './snapshot';

/**
 * Öğrencinin ders adımlarını yapıp yapmadığını, projenin o anki haline bakarak denetler.
 * Öğretmenin kayıtta eklediği blokların kimlikleri öğrencide farklıdır; adım geçildikçe
 * "kayıttaki blok → öğrencinin bloğu" eşlemesi kurulur ve sonraki adımlar bu eşlemeyle denetlenir.
 * Kuklalar adlarıyla eşlenir (proje yeniden yüklenince kukla kimlikleri değişir).
 *
 * Durum biçimi kaydedicininkiyle aynıdır: {targets: [{id, name, isStage, blocks, costumes, sounds}],
 * editingTarget, tab}
 */

const normalize = value => {
    const text = String(value === null || typeof value === 'undefined' ? '' : value).trim()
        .toLocaleLowerCase('tr');
    const number = Number(text);
    return text !== '' && !isNaN(number) ? String(number) : text;
};

const sameName = (actual, expected) => actual === expected ||
    (typeof actual === 'string' && actual.indexOf(expected) === 0 && /^\d+$/.test(actual.slice(expected.length)));

const findTarget = (state, name) => state.targets.find(t => t.name === name) ||
    state.targets.find(t => sameName(t.name, name));

const valueOf = (snap, key) => (key in snap.values ? snap.values[key] : snap.fields[key]);

const createChecker = (steps, initialState) => {
    const map = {}; // kayıttaki blok kimliği → öğrencinin blok kimliği
    const initialTargets = initialState ? initialState.targets.map(t => t.id) : [];
    const initialStage = initialState && initialState.targets.find(t => t.isStage);
    const initialBackdrops = initialStage ? initialStage.costumes.length : 0;
    // ders başında var olan bloklar "blok ekle" adımını karşılamaz
    const initialBlocks = [];
    if (initialState) {
        initialState.targets.forEach(t => Object.keys(t.blocks || {}).forEach(id => initialBlocks.push(id)));
    }
    let index = 0;

    const blockId = recorded => map[recorded] || recorded;

    const attachOk = (step, snap, all) => {
        const attach = snap.attach;
        if (step.attach.how === 'top') return attach.how === 'top';
        if (attach.how !== step.attach.how || attach.input !== step.attach.input) return false;
        const expected = map[step.attach.to] || (all[step.attach.to] ? step.attach.to : null);
        if (expected) return attach.to === expected;
        // ebeveyn atlanan bir adımda eklendiyse: aynı türde bir ebeveyne takılmış olması yeter
        return Boolean(all[attach.to] && all[attach.to].opcode === step.parentOpcode);
    };

    const valuesOk = (step, snap) => step.free || (step.changed || []).every(key => {
        const expected = key in (step.values || {}) ? step.values[key] : (step.fields || {})[key];
        return normalize(valueOf(snap, key)) === normalize(expected);
    });

    const used = () => Object.keys(map).map(key => map[key]);

    const checks = {
        addBlock: (step, state) => {
            const target = findTarget(state, step.target);
            if (!target) return false;
            const all = snapshotBlocks(target.blocks);
            const taken = used();
            const found = Object.keys(all).find(id => all[id].opcode === step.opcode &&
                initialBlocks.indexOf(id) === -1 &&
                (taken.indexOf(id) === -1 || map[step.block] === id) &&
                attachOk(step, all[id], all) && valuesOk(step, all[id]));
            if (!found) return false;
            map[step.block] = found;
            return true;
        },
        moveBlock: (step, state) => {
            const target = findTarget(state, step.target);
            if (!target) return false;
            const all = snapshotBlocks(target.blocks);
            const snap = all[blockId(step.block)];
            return Boolean(snap && attachOk(step, snap, all));
        },
        setValue: (step, state) => {
            const target = findTarget(state, step.target);
            if (!target) return false;
            const snap = snapshotBlocks(target.blocks)[blockId(step.block)];
            if (!snap) return false;
            return step.free || normalize(valueOf(snap, step.key)) === normalize(step.value);
        },
        deleteBlock: (step, state) => {
            const target = findTarget(state, step.target);
            return Boolean(target && !snapshotBlocks(target.blocks)[blockId(step.block)]);
        },
        addSprite: (step, state) => state.targets.some(t => initialTargets.indexOf(t.id) === -1 &&
            !t.isStage && (step.any || sameName(t.name, step.name))),
        deleteSprite: (step, state) => !state.targets.some(t => t.name === step.name),
        addCostume: (step, state) => {
            const target = findTarget(state, step.target);
            return Boolean(target && target.costumes.some(name => sameName(name, step.name)));
        },
        addSound: (step, state) => {
            const target = findTarget(state, step.target);
            return Boolean(target && target.sounds.some(name => sameName(name, step.name)));
        },
        addBackdrop: (step, state) => {
            const stage = state.targets.find(t => t.isStage);
            if (!stage) return false;
            if (step.any) return stage.costumes.length > initialBackdrops;
            return stage.costumes.some(name => sameName(name, step.name));
        },
        selectSprite: (step, state) => {
            const editing = state.targets.find(t => t.id === state.editingTarget);
            if (!editing) return false;
            return step.isStage ? editing.isStage : sameName(editing.name, step.name);
        },
        selectTab: (step, state) => state.tab === step.tab,
        addExtension: (step, state) => (state.extensions || []).some(extension => extension.id === step.id),
        note: () => false, // not adımı "Devam" ile geçilir
        point: () => false // "göster" adımı hedefe tıklanınca ya da "Devam" ile geçilir (oynatıcı)
    };

    const isDone = (step, state) => {
        const check = checks[step.type];
        return check ? check(step, state) : false;
    };

    return {
        // yapılmış adımları geçer; şu anki adımın sırasını döndürür (steps.length: ders bitti)
        check: state => {
            while (index < steps.length && isDone(steps[index], state)) index++;
            return index;
        },
        // not adımında "Devam", diğerlerinde "Atla"
        skip: () => {
            if (index < steps.length) index++;
            return index;
        },
        current: () => index,
        blockFor: recorded => blockId(recorded)
    };
};

export {createChecker};
