/**
 * @fileoverview
 * Scratch çalışma alanındaki bir script'i "kalıp"a çevirir ve kalıbın bir
 * çalışma alanında bulunup bulunmadığını kontrol eder. Saf fonksiyonlar:
 * scratch-vm blok haritası ({[id]: blok}) alır, React/DOM bilmez.
 */

const ANY = Object.freeze({any: true});

const isAny = value => value !== null && typeof value === 'object' && value.any === true;

// Bu gölge blokların değeri varsayılan olarak "herhangi bir değer" sayılır.
const LITERAL_SHADOWS = [
    'math_number', 'math_whole_number', 'math_positive_number', 'math_integer',
    'math_angle', 'text', 'colour_picker', 'note'
];

const MAX_NODES = 500;

// Özel blokların (procedures) adı alan değil mutation içinde durur. Argüman
// kimlikleri projeye özeldir, bu yüzden çağrı ve prototip girişleri kalıba girmez.
const PROCCODE_FIELD = 'PROCCODE';
const PROCEDURE_OPCODES = ['procedures_call', 'procedures_prototype'];

const readProccode = block => (block.mutation && typeof block.mutation.proccode === 'string' ?
    block.mutation.proccode : null);

const readField = (block, name) => {
    if (name === PROCCODE_FIELD) return readProccode(block);
    return block.fields[name] ? String(block.fields[name].value) : null;
};

const shadowValue = shadow => {
    const names = Object.keys(shadow.fields);
    return names.length === 0 ? '' : String(shadow.fields[names[0]].value);
};

const extractNode = (blocks, id, exactLiterals, state) => {
    const block = blocks[id];
    if (!block) throw new Error(`Blok bulunamadı: ${id}`);
    state.count += 1;
    if (state.count > MAX_NODES) throw new Error(`Kalıp çok büyük (en çok ${MAX_NODES} blok)`);

    const node = {opcode: block.opcode, fields: {}, inputs: {}, next: null};
    Object.keys(block.fields).forEach(name => {
        node.fields[name] = String(block.fields[name].value);
    });
    const isProcedure = PROCEDURE_OPCODES.indexOf(block.opcode) !== -1;
    if (isProcedure) node.fields[PROCCODE_FIELD] = readProccode(block) || '';
    Object.keys(isProcedure ? {} : block.inputs).forEach(name => {
        const input = block.inputs[name];
        if (!input.block) return;
        const shadow = blocks[input.shadow];
        if (input.block === input.shadow && shadow.opcode !== 'procedures_prototype') {
            const exact = exactLiterals || LITERAL_SHADOWS.indexOf(shadow.opcode) === -1;
            node.inputs[name] = {literal: exact ? shadowValue(shadow) : ANY};
        } else {
            node.inputs[name] = extractNode(blocks, input.block, exactLiterals, state);
        }
    });
    if (block.next) node.next = extractNode(blocks, block.next, exactLiterals, state);
    return node;
};

/**
 * @param {object} blocks scratch-vm blok haritası ({[id]: blok})
 * @param {string} rootId kalıbın başlayacağı bloğun kimliği
 * @param {object} [options] exactLiterals: sayı/metin değerleri de tam değer olsun
 * @return {object} PatternNode
 */
const extractPattern = (blocks, rootId, options) => {
    const exactLiterals = Boolean(options && options.exactLiterals);
    return extractNode(blocks, rootId, exactLiterals, {count: 0});
};

const matchNode = (blocks, block, pattern) => {
    if (!block || block.opcode !== pattern.opcode) return false;

    const fieldNames = Object.keys(pattern.fields);
    for (let i = 0; i < fieldNames.length; i++) {
        const expected = pattern.fields[fieldNames[i]];
        const actual = readField(block, fieldNames[i]);
        if (actual === null) return false;
        if (!isAny(expected) && actual !== String(expected)) return false;
    }

    const inputNames = Object.keys(pattern.inputs);
    for (let i = 0; i < inputNames.length; i++) {
        const expected = pattern.inputs[inputNames[i]];
        const input = block.inputs[inputNames[i]];
        if (!input || !input.block) return false;
        if ('literal' in expected) {
            if (!isAny(expected.literal)) {
                if (input.block !== input.shadow) return false;
                if (shadowValue(blocks[input.shadow]) !== String(expected.literal)) return false;
            }
        } else {
            if (input.block === input.shadow && expected.opcode !== 'procedures_prototype') return false;
            if (!matchNode(blocks, blocks[input.block], expected)) return false;
        }
    }

    if (pattern.next) {
        if (!block.next || !matchNode(blocks, blocks[block.next], pattern.next)) return false;
    }
    return true;
};

/**
 * @param {object} blocks scratch-vm blok haritası
 * @param {object} pattern PatternNode
 * @return {boolean} haritada kalıbı içeren bir alt zincir var mı
 */
const matchPattern = (blocks, pattern) => Object.keys(blocks).some(id =>
    !blocks[id].shadow && matchNode(blocks, blocks[id], pattern)
);

const spriteLabel = target => (target.isStage ? 'Sahne' : target.getName());

/**
 * @param {object} vm scratch-vm örneği (yalnızca runtime.targets[].blocks._blocks okunur)
 * @param {object} pattern PatternNode
 * @param {?string} [sprite] verilirse yalnızca bu adlı kuklada ('Sahne' = sahne) aranır
 * @return {boolean} kalıp var mı
 */
const workspaceMatches = (vm, pattern, sprite) => vm.runtime.targets
    .filter(target => !sprite || spriteLabel(target) === sprite)
    .some(target => matchPattern(target.blocks._blocks, pattern));

export {
    ANY,
    isAny,
    extractPattern,
    matchPattern,
    workspaceMatches
};
