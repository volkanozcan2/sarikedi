/**
 * Ders kaydı için bir kuklanın bloklarının sade bir görüntüsü ve iki görüntü arasındaki fark.
 * Gölge bloklar (sayı kutuları, açılır menüler) ayrı kayıt olmaz; değerleri sahibinin `values` alanında tutulur.
 */

const firstFieldValue = block => {
    const names = Object.keys(block.fields || {});
    return names.length ? String(block.fields[names[0]].value) : null;
};

const attachmentOf = (blocks, block) => {
    const parent = block.parent && blocks[block.parent];
    if (!parent) return {how: 'top'};
    if (parent.next === block.id) return {to: parent.id, how: 'next'};
    const inputs = parent.inputs || {};
    const name = Object.keys(inputs).find(key => inputs[key].block === block.id);
    return name ? {to: parent.id, how: 'input', input: name} : {how: 'top'};
};

/**
 * @param {object} blocks - VM'deki target.blocks._blocks
 * @returns {object} blok kimliği → {opcode, attach, fields, values}
 */
const snapshotBlocks = blocks => {
    const snap = {};
    Object.keys(blocks || {}).forEach(id => {
        const block = blocks[id];
        if (!block || block.shadow) return;
        const fields = {};
        Object.keys(block.fields || {}).forEach(name => {
            fields[name] = String(block.fields[name].value);
        });
        const values = {};
        Object.keys(block.inputs || {}).forEach(name => {
            const child = blocks[block.inputs[name].block];
            if (child && child.shadow) {
                const value = firstFieldValue(child);
                if (value !== null) values[name] = value;
            }
        });
        snap[id] = {opcode: block.opcode, attach: attachmentOf(blocks, block), fields: fields, values: values};
    });
    return snap;
};

const sameAttach = (a, b) => a.how === b.how && a.to === b.to && a.input === b.input;

// Eklenenleri, ebeveyni önce gelecek şekilde sıralar (ebeveyni de yeni olanlar onun arkasına).
const parentFirst = (ids, snap) => {
    const pending = ids.slice();
    const out = [];
    const placed = id => out.indexOf(id) !== -1;
    while (pending.length) {
        const index = pending.findIndex(id => {
            const parent = snap[id].attach.to;
            return !parent || pending.indexOf(parent) === -1 || placed(parent);
        });
        out.push(pending.splice(index === -1 ? 0 : index, 1)[0]);
    }
    return out;
};

/**
 * @param {object} before - önceki görüntü
 * @param {object} after - sonraki görüntü
 * @returns {{added: string[], removed: string[], moved: string[], changed: Array}} fark
 */
const diffSnapshots = (before, after) => {
    const prev = before || {};
    const next = after || {};
    const added = parentFirst(Object.keys(next).filter(id => !prev[id]), next);
    const removed = Object.keys(prev).filter(id => !next[id]);
    const moved = [];
    const changed = [];
    Object.keys(next).forEach(id => {
        if (!prev[id]) return;
        if (!sameAttach(prev[id].attach, next[id].attach)) moved.push(id);
        ['fields', 'values'].forEach(kind => {
            Object.keys(next[id][kind]).forEach(key => {
                if (prev[id][kind][key] !== next[id][kind][key]) {
                    changed.push({id: id, key: key, value: next[id][kind][key]});
                }
            });
        });
    });
    return {added: added, removed: removed, moved: moved, changed: changed};
};

export {snapshotBlocks, diffSnapshots};
