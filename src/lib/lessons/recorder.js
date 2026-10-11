/**
 * @fileoverview
 * Yönetim paneli "kayıt modu": yönetici oyunu Scratch'te yaparken her "Adımı kaydet"te
 * çalışma alanının önceki kayıtla farkı bir ders adımına çevrilir (blok kontrolü, el rehberi,
 * taslak metin). Saf mantık: vm'den yalnızca capture.js üzerinden okur, React/DOM bilmez.
 */

import {capturePattern, listScripts} from './capture';

const MAX_GUIDED_BLOCKS = 8;

// Çeviride bayrak simgesi metin olarak kalmıyor ("flag e tıklandığında"); öğrenciye yeşil bayrak denir
const humanizeLabel = label => String(label).replace(/\bflag e\b/i, 'yeşil bayrağa');

// Scratch'in iç (İngilizce) seçenek değerleri → öğrencinin göreceği ad
const VALUE_NAMES = {
    'right arrow': 'sağ ok',
    'left arrow': 'sol ok',
    'up arrow': 'yukarı ok',
    'down arrow': 'aşağı ok',
    'space': 'boşluk',
    'any': 'herhangi bir tuş',
    '_mouse_': 'fare imleci',
    '_edge_': 'kenar',
    '_random_': 'rastgele konum',
    '_myself_': 'kendisi',
    '_stage_': 'sahne'
};

const CATEGORIES = {
    motion: {id: 'motion', label: 'Hareket'},
    looks: {id: 'looks', label: 'Görünüm'},
    sound: {id: 'sound', label: 'Ses'},
    event: {id: 'events', label: 'Olaylar'},
    control: {id: 'control', label: 'Kontrol'},
    sensing: {id: 'sensing', label: 'Algılama'},
    operator: {id: 'operators', label: 'İşlemler'},
    data: {id: 'variables', label: 'Değişkenler'},
    procedures: {id: 'myBlocks', label: 'Bloklarım'}
};

/**
 * @param {string} opcode blok türü
 * @return {?object} {id, label} ya da bilinmeyen (eklenti) kategori için null
 */
const categoryOf = opcode => {
    const category = CATEGORIES[String(opcode).split('_')[0]];
    return category ? {id: category.id, label: category.label} : null;
};

// ön sıra: blok, giriş blokları, sonraki blok
const flattenNodes = (node, list) => {
    list.push(node);
    Object.keys(node.inputs).forEach(name => {
        if (!('literal' in node.inputs[name])) flattenNodes(node.inputs[name], list);
    });
    if (node.next) flattenNodes(node.next, list);
    return list;
};

const flatten = (node, list) => flattenNodes(node, []).reduce((opcodes, n) => {
    opcodes.push(n.opcode);
    return opcodes;
}, list);

const countOpcodes = list => list.reduce((counts, opcode) => {
    counts[opcode] = (counts[opcode] || 0) + 1;
    return counts;
}, {});

const overlap = (a, b) => {
    const counts = countOpcodes(b);
    return a.reduce((sum, opcode) => {
        if (counts[opcode] > 0) {
            counts[opcode] -= 1;
            return sum + 1;
        }
        return sum;
    }, 0);
};

const originalTargets = vm => vm.runtime.targets.filter(target => target.isOriginal);

const assetNames = (target, getter) => (typeof target[getter] === 'function' ?
    target[getter]().map(asset => asset.name) : []);

// kukla, dekor, kostüm ve ses adları (ekleme farkını bulmak için)
const snapshotAssets = vm => {
    const editing = vm.editingTarget;
    const assets = {
        sprites: [],
        backdrops: [],
        costumes: {},
        sounds: {},
        editing: editing ? (editing.isStage ? 'Sahne' : editing.getName()) : null
    };
    originalTargets(vm).forEach(target => {
        if (target.isStage) {
            assets.backdrops = assetNames(target, 'getCostumes');
            assets.sounds.Sahne = assetNames(target, 'getSounds');
        } else {
            const name = target.getName();
            assets.sprites.push(name);
            assets.costumes[name] = assetNames(target, 'getCostumes');
            assets.sounds[name] = assetNames(target, 'getSounds');
        }
    });
    return assets;
};

const added = (before, after) => (after || []).filter(name => (before || []).indexOf(name) === -1);

const ADD_GUIDES = {
    sprite: {type: 'click', target: {kind: 'ui', id: 'addSprite'}, label: 'Kukla ekle'},
    backdrop: {type: 'click', target: {kind: 'ui', id: 'addBackdrop'}, label: 'Dekor ekle'},
    costume: {type: 'click', target: {kind: 'ui', id: 'costumesTab'}, label: 'Kostümler'},
    sound: {type: 'click', target: {kind: 'ui', id: 'soundsTab'}, label: 'Sesler'},
    select: {type: 'click', target: {kind: 'ui', id: 'spriteList'}, label: 'Kukla listesi'},
    selectStage: {type: 'click', target: {kind: 'ui', id: 'stageSelector'}, label: 'Sahne'}
};

// önceki kayda göre eklenen kukla/dekor/kostüm/ses: [{kind, name, sprite}]
const assetChanges = (before, after) => {
    const changes = [];
    // başka bir kukla/sahne seçildi (yeni eklenen kukla kendiliğinden seçilir, ayrıca sayılmaz)
    const addedSprites = added(before.sprites, after.sprites);
    if (after.editing && after.editing !== before.editing && addedSprites.indexOf(after.editing) === -1) {
        changes.push({kind: after.editing === 'Sahne' ? 'selectStage' : 'select', name: after.editing});
    }
    addedSprites.forEach(name => changes.push({kind: 'sprite', name: name}));
    added(before.backdrops, after.backdrops).forEach(name => changes.push({kind: 'backdrop', name: name}));
    // yeni kuklanın kostüm/sesleri kuklayla birlikte gelir, ayrıca anlatılmaz
    before.sprites.forEach(sprite => {
        if (after.sprites.indexOf(sprite) === -1) return;
        added(before.costumes[sprite], after.costumes[sprite]).forEach(name => {
            changes.push({kind: 'costume', name: name, sprite: sprite});
        });
        added(before.sounds[sprite], after.sounds[sprite]).forEach(name => {
            changes.push({kind: 'sound', name: name, sprite: sprite});
        });
    });
    added(before.sounds.Sahne, after.sounds.Sahne).forEach(name => {
        changes.push({kind: 'sound', name: name, sprite: 'Sahne'});
    });
    return changes;
};

const assetSentence = change => {
    switch (change.kind) {
    case 'select': return `Kukla listesinden "${change.name}" kuklasını seç.`;
    case 'selectStage': return 'Sağ alttaki Sahne bölmesine tıklayıp sahneyi seç.';
    case 'sprite': return `Kukla ekle düğmesine tıkla ve kütüphaneden "${change.name}" kuklasını seç.`;
    case 'backdrop': return `Dekor ekle düğmesine tıkla ve kütüphaneden "${change.name}" dekorunu seç.`;
    case 'costume': return `"${change.sprite}" kuklasının Kostümler sekmesinde "${change.name}" kostümünü ekle.`;
    default: return `"${change.sprite}" kuklasının Sesler sekmesinde "${change.name}" sesini ekle.`;
    }
};

const assetGuide = changes => changes.reduce((guide, change) => {
    const action = ADD_GUIDES[change.kind];
    const last = guide[guide.length - 1];
    if (!last || last.target.id !== action.target.id) guide.push(action);
    return guide;
}, []);

const snapshotScripts = vm => listScripts(vm).reduce((list, ref) => {
    try {
        const exact = capturePattern(vm, ref, {exact: true});
        list.push({
            sprite: ref.sprite,
            key: `${ref.sprite}|${JSON.stringify(exact)}`,
            opcodes: flatten(exact, []),
            nodes: flattenNodes(exact, []),
            ref: ref
        });
    } catch (error) {
        // çok büyük ya da okunamayan betik kayda alınmaz
    }
    return list;
}, []);

/**
 * @param {object} vm scratch-vm
 * @return {object} {scripts: [{sprite, key, opcodes, nodes, ref}], assets} (tam değerli kalıbı olan betikler)
 */
const snapshotWorkspace = vm => ({scripts: snapshotScripts(vm), assets: snapshotAssets(vm)});

// bir betikteki yeni blokları, değişmeden önceki en benzer betiğe göre bulur: {fresh, used}
const newBlocksOf = (script, candidates) => {
    let best = -1;
    let bestScore = 0;
    candidates.forEach((candidate, index) => {
        const score = overlap(script.opcodes, candidate.opcodes);
        if (score > bestScore) {
            best = index;
            bestScore = score;
        }
    });
    const used = best === -1 ? null : candidates[best];
    const counts = used ? countOpcodes(used.opcodes) : {};
    const fresh = [];
    script.opcodes.forEach((opcode, index) => {
        if (counts[opcode] > 0) {
            counts[opcode] -= 1;
        } else {
            fresh.push({
                opcode: opcode,
                after: index === 0 ? null : script.opcodes[index - 1],
                fields: script.nodes[index].fields
            });
        }
    });
    return {fresh: fresh, used: used};
};

const buildGuide = (fresh, paletteOpcodes) => {
    const known = paletteOpcodes && paletteOpcodes.length > 0 ? paletteOpcodes : null;
    const guide = [];
    let lastCategory = null;
    fresh.slice(0, MAX_GUIDED_BLOCKS).forEach(item => {
        if (known && known.indexOf(item.opcode) === -1) return;
        const category = categoryOf(item.opcode);
        if (category && category.id !== lastCategory) {
            guide.push({type: 'click', target: {kind: 'category', id: category.id}, label: category.label});
            lastCategory = category.id;
        }
        guide.push({
            type: 'drag',
            from: {kind: 'block', opcode: item.opcode},
            to: item.after ? {kind: 'workspaceBlock', opcode: item.after} : {kind: 'workspace'},
            label: 'Sürükle'
        });
    });
    return guide;
};

const buildText = (fresh, labels) => {
    if (fresh.length === 0) return 'Bloklardaki değerleri düzenle.';
    const sentences = fresh.slice(0, MAX_GUIDED_BLOCKS).map(item => {
        const category = categoryOf(item.opcode);
        const fields = item.fields || {};
        let name = (typeof labels === 'function' ? labels(item.opcode) : labels && labels[item.opcode]) ||
            item.opcode;
        // paletteki blok adı varsayılan değişkeni gösterir; gerçek değişken adını yaz
        const variable = fields.VARIABLE || fields.LIST;
        if (variable) name = name.replace(/my variable/i, variable);
        name = humanizeLabel(name);
        const chosen = Object.keys(fields).map(key => fields[key])
            .filter(Boolean)
            .filter(value => value !== variable || name.indexOf(variable) === -1)
            .map(value => VALUE_NAMES[value] || value)
            .filter(value => value.charAt(0) !== '_');
        const choice = chosen.length > 0 ? ` (seçenek: ${chosen.join(', ')})` : '';
        return category ?
            `${category.label} kategorisinden "${name}" bloğunu ekle${choice}.` :
            `"${name}" bloğunu ekle${choice}.`;
    });
    if (fresh.length > MAX_GUIDED_BLOCKS) sentences.push('Kalan blokları da ekle.');
    return sentences.join(' ');
};

/**
 * @param {object} vm scratch-vm
 * @param {object} baseline önceki snapshotWorkspace çıktısı
 * @param {object} [options] paletteOpcodes (rehber için), labels ({opcode: ad} ya da opcode => ad)
 * @return {object} {step: ?object (değişiklik yoksa null), snapshot: yeni anlık görüntü}
 */
const recordStep = (vm, baseline, options) => {
    const opts = options || {};
    const after = snapshotWorkspace(vm);

    const unmatched = baseline.scripts.slice();
    const changed = after.scripts.filter(script => {
        const index = unmatched.findIndex(old => old.key === script.key);
        if (index === -1) return true;
        unmatched.splice(index, 1);
        return false;
    });
    const assets = assetChanges(baseline.assets, after.assets);
    if (changed.length === 0 && assets.length === 0) return {step: null, snapshot: after};

    const checks = [];
    let fresh = [];
    changed.forEach(script => {
        const found = newBlocksOf(script, unmatched.filter(old => old.sprite === script.sprite));
        fresh = fresh.concat(found.fresh);
        if (found.used) unmatched.splice(unmatched.indexOf(found.used), 1);
        checks.push({
            type: 'blocks',
            sprite: script.sprite,
            pattern: capturePattern(vm, script.ref, {exact: false})
        });
    });

    const text = [];
    if (assets.length > 0) text.push(assets.map(assetSentence).join(' '));
    if (changed.length > 0) text.push(buildText(fresh, opts.labels));
    return {
        step: {
            text: text.join(' '),
            media: null,
            hint: null,
            checks: checks,
            guide: assetGuide(assets).concat(buildGuide(fresh, opts.paletteOpcodes))
        },
        snapshot: after
    };
};

export {
    buildGuide,
    buildText,
    flatten,
    flattenNodes,
    categoryOf,
    snapshotWorkspace,
    recordStep
};
