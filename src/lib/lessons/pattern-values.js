/**
 * @fileoverview
 * Blok kalıbındaki değerleri (alanlar ve sayı/metin girişleri) listeler ve
 * "herhangi bir değer" / "tam değer" arasında değiştirir. Saf fonksiyonlar.
 */

import {isAny} from './block-pattern';

const describe = (path, label, kind, raw) => ({
    path: path,
    label: label,
    kind: kind,
    any: isAny(raw),
    value: isAny(raw) ? '' : String(raw)
});

const walk = (node, base, out) => {
    Object.keys(node.fields).forEach(name => {
        out.push(describe(base.concat(['fields', name]), `${node.opcode}.${name}`, 'field', node.fields[name]));
    });
    Object.keys(node.inputs).forEach(name => {
        const input = node.inputs[name];
        if ('literal' in input) {
            out.push(describe(
                base.concat(['inputs', name, 'literal']), `${node.opcode}.${name}`, 'literal', input.literal
            ));
        } else {
            walk(input, base.concat(['inputs', name]), out);
        }
    });
    if (node.next) walk(node.next, base.concat(['next']), out);
};

/**
 * @param {object} pattern PatternNode
 * @return {Array} [{path, label, kind, any, value}]
 */
const listPatternValues = pattern => {
    const out = [];
    walk(pattern, [], out);
    return out;
};

/**
 * @param {object} pattern PatternNode (değiştirilmez)
 * @param {Array<string>} path listPatternValues'tan gelen yol
 * @param {*} value ANY / {any: true} ya da yeni tam değer
 * @return {object} yeni PatternNode
 */
const setPatternValue = (pattern, path, value) => {
    const copy = JSON.parse(JSON.stringify(pattern));
    let parent = copy;
    for (let i = 0; i < path.length - 1; i++) {
        parent = parent && parent[path[i]];
    }
    const key = path[path.length - 1];
    if (path.length === 0 || parent === null || typeof parent !== 'object' ||
        !Object.prototype.hasOwnProperty.call(parent, key)) {
        throw new Error('Değer yolu geçersiz');
    }
    parent[key] = isAny(value) ? {any: true} : String(value);
    return copy;
};

const countPatternBlocks = node => {
    if (!node) return 0;
    let count = 1;
    Object.keys(node.inputs).forEach(name => {
        if (!('literal' in node.inputs[name])) count += countPatternBlocks(node.inputs[name]);
    });
    return count + countPatternBlocks(node.next);
};

export {
    listPatternValues,
    setPatternValue,
    countPatternBlocks
};
