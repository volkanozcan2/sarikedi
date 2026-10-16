import {snapshotBlocks, diffSnapshots} from './snapshot';

/**
 * Ders kaydedici: öğretmenin editörde yaptıklarını proje durumundaki farklardan adım adım çıkarır.
 * Fare hareketi tutulmaz; "şu blok şuraya takıldı", "şu kukla eklendi" gibi anlamlı adımlar tutulur.
 *
 * Durum biçimi (update/start): {targets: [{id, name, isStage, blocks, costumes: [ad], sounds: [ad]}],
 * extensions: [{id, name}],
 * editingTarget: kimlik, tab: 'code' | 'costumes' | 'sounds'}
 *
 * @param {object} [options] - labelFor(targetId, blockId): bloğun ekrandaki yazısı ("10 adım git")
 * @returns {object} start(state, [öncekiAdımlar]), update(state), addNote(yazı), getSteps()
 */
const createRecorder = (options = {}) => {
    const labelFor = options.labelFor || (() => null);
    let steps = [];
    let snaps = {}; // kukla kimliği → blok görüntüsü
    let targets = {}; // kukla kimliği → {name, isStage, costumes, sounds}
    let editingTarget = null;
    let extensions = []; // eklenmiş eklenti kimlikleri
    let tab = 'code';
    let startTab = 'code';
    let addedSprites = []; // kayıt sırasında eklenen kuklalar
    const labels = {}; // blok kimliği → son bilinen yazı (silinen bloklar için)

    const label = (targetId, block, opcode) => {
        const text = labelFor(targetId, block);
        if (text) labels[block] = text;
        return labels[block] || opcode;
    };
    const last = () => steps[steps.length - 1];
    const findAdd = block => steps.find(s => s.type === 'addBlock' && s.block === block);
    const remember = state => {
        targets = {};
        snaps = {};
        state.targets.forEach(t => {
            targets[t.id] = {name: t.name, isStage: t.isStage, costumes: t.costumes.slice(), sounds: t.sounds.slice()};
            snaps[t.id] = snapshotBlocks(t.blocks);
        });
        editingTarget = state.editingTarget;
        tab = state.tab;
        extensions = (state.extensions || []).map(extension => extension.id);
    };
    const rememberLabels = state => {
        const target = state.targets.find(t => t.id === state.editingTarget);
        if (target) Object.keys(snapshotBlocks(target.blocks)).forEach(id => label(target.id, id, ''));
    };

    const applyBlocks = (target, before, after) => {
        const diff = diffSnapshots(before, after);
        const name = target.name;
        diff.removed.forEach(block => {
            if (findAdd(block)) {
                steps = steps.filter(s => s.block !== block);
            } else {
                steps.push({type: 'deleteBlock',
                    target: name,
                    targetId: target.id,
                    block: block,
                    opcode: before[block].opcode,
                    label: label(target.id, block, before[block].opcode)});
            }
        });
        diff.added.forEach(block => {
            const snap = after[block];
            steps.push({
                type: 'addBlock',
                target: name,
                targetId: target.id,
                block: block,
                opcode: snap.opcode,
                attach: snap.attach,
                fields: snap.fields,
                values: snap.values,
                changed: [],
                label: label(target.id, block, snap.opcode),
                parentLabel: snap.attach.to ? label(target.id, snap.attach.to, after[snap.attach.to].opcode) : null,
                parentOpcode: snap.attach.to ? after[snap.attach.to].opcode : null
            });
        });
        diff.moved.forEach(block => {
            const snap = after[block];
            const parentLabel = snap.attach.to ? label(target.id, snap.attach.to, after[snap.attach.to].opcode) : null;
            const parentOpcode = snap.attach.to ? after[snap.attach.to].opcode : null;
            const step = last();
            if (step && step.block === block && (step.type === 'addBlock' || step.type === 'moveBlock')) {
                step.attach = snap.attach;
                step.parentLabel = parentLabel;
                step.parentOpcode = parentOpcode;
                return;
            }
            steps.push({type: 'moveBlock',
                target: name,
                targetId: target.id,
                block: block,
                opcode: snap.opcode,
                attach: snap.attach,
                label: label(target.id, block, snap.opcode),
                parentLabel: parentLabel,
                parentOpcode: parentOpcode});
        });
        diff.changed.forEach(change => {
            const snap = after[change.id];
            const step = last();
            if (step && step.type === 'addBlock' && step.block === change.id) {
                step.fields = snap.fields;
                step.values = snap.values;
                if (step.changed.indexOf(change.key) === -1) step.changed.push(change.key);
                // etiket paletteki ilk haliyle kalır ("10 adım git"); yeni değer cümlede ayrıca söylenir
                return;
            }
            if (step && step.type === 'setValue' && step.block === change.id && step.key === change.key) {
                step.value = change.value;
                return;
            }
            steps.push({type: 'setValue',
                target: name,
                targetId: target.id,
                block: change.id,
                opcode: snap.opcode,
                key: change.key,
                value: change.value,
                label: label(target.id, change.id, snap.opcode)});
        });
    };

    const applyAssets = (target, before) => {
        const newCostumes = target.costumes.filter(n => before.costumes.indexOf(n) === -1);
        const newSounds = target.sounds.filter(n => before.sounds.indexOf(n) === -1);
        newCostumes.forEach(n => steps.push(target.isStage ?
            {type: 'addBackdrop', name: n} :
            {type: 'addCostume', target: target.name, targetId: target.id, name: n}));
        newSounds.forEach(n => steps.push({type: 'addSound', target: target.name, targetId: target.id, name: n}));
    };

    return {
        // steps: kayda devam edilirken önceki adımlar (o andan itibaren olan değişiklikler eklenir)
        start: (state, previous) => {
            steps = (previous || []).map(step => Object.assign({}, step));
            snaps = {};
            targets = {};
            addedSprites = [];
            remember(state);
            startTab = state.tab;
            rememberLabels(state);
        },
        update: state => {
            const ids = state.targets.map(t => t.id);
            // silinen kuklalar: kayıtta eklenmişse ona ait her şey unutulur
            Object.keys(targets).forEach(id => {
                if (ids.indexOf(id) !== -1) return;
                if (addedSprites.indexOf(id) === -1) {
                    steps.push({type: 'deleteSprite', name: targets[id].name});
                } else {
                    steps = steps.filter(s => s.targetId !== id);
                    addedSprites = addedSprites.filter(x => x !== id);
                }
            });
            // yeni kuklalar: kendi blokları/kostümleri adım sayılmaz
            const justAdded = [];
            state.targets.forEach(t => {
                if (targets[t.id]) return;
                justAdded.push(t.id);
                addedSprites.push(t.id);
                steps.push({type: 'addSprite', targetId: t.id, name: t.name});
            });
            state.targets.forEach(t => {
                if (targets[t.id]) applyAssets(t, targets[t.id]);
            });
            (state.extensions || []).forEach(extension => {
                if (extensions.indexOf(extension.id) === -1) {
                    steps.push({type: 'addExtension', id: extension.id, name: extension.name});
                }
            });
            // kukla seçimi (yeni eklenen kukla zaten seçili gelir, ayrı adım olmaz)
            if (state.editingTarget !== editingTarget && justAdded.indexOf(state.editingTarget) === -1) {
                const target = state.targets.find(t => t.id === state.editingTarget);
                if (target) {
                    const step = {
                        type: 'selectSprite', targetId: target.id, name: target.name, isStage: target.isStage
                    };
                    if (last() && last().type === 'selectSprite') steps[steps.length - 1] = step;
                    else steps.push(step);
                    rememberLabels(state);
                }
            }
            if (state.tab !== tab) {
                if (last() && last().type === 'selectTab') steps.pop();
                const previous = steps.filter(s => s.type === 'selectTab').pop();
                const current = previous ? previous.tab : startTab;
                if (state.tab !== current) steps.push({type: 'selectTab', tab: state.tab});
            }
            state.targets.forEach(t => {
                if (!targets[t.id]) return;
                applyBlocks(t, snaps[t.id], snapshotBlocks(t.blocks));
            });
            remember(state);
        },
        addNote: text => {
            const clean = String(text || '').trim();
            if (clean) steps.push({type: 'note', text: clean});
        },
        getSteps: () => steps.map(s => Object.assign({}, s))
    };
};

export {createRecorder};
