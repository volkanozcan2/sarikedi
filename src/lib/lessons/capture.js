/**
 * @fileoverview
 * Yönetim paneli için: çalışma alanındaki betikleri listeler, birinden blok kalıbı
 * yakalar ve bir adımın kontrollerini mevcut çalışma alanında dener.
 */

import {extractPattern} from './block-pattern';
import {runStepChecks} from './check-runner';

const STAGE_LABEL = 'Sahne';

const spriteLabel = target => (target.isStage ? STAGE_LABEL : target.getName());

const originals = vm => vm.runtime.targets.filter(target => target.isOriginal);

const countBlocks = (blocks, rootId) => {
    const seen = {};
    const stack = [rootId];
    let count = 0;
    while (stack.length > 0) {
        const id = stack.pop();
        const found = blocks[id];
        if (found && !seen[id]) {
            seen[id] = true;
            if (!found.shadow) count += 1;
            if (found.next) stack.push(found.next);
            Object.keys(found.inputs).forEach(name => {
                const input = found.inputs[name];
                if (input.block && input.block !== input.shadow) stack.push(input.block);
            });
        }
    }
    return count;
};

/**
 * @param {object} vm scratch-vm
 * @return {Array} [{sprite, id, opcode, blockCount}]
 */
const listScripts = vm => {
    const scripts = [];
    originals(vm).forEach(target => {
        const blocks = target.blocks._blocks;
        target.blocks.getScripts().forEach(id => {
            const found = blocks[id];
            if (found && !found.shadow) {
                scripts.push({
                    sprite: spriteLabel(target),
                    id: id,
                    opcode: found.opcode,
                    blockCount: countBlocks(blocks, id)
                });
            }
        });
    });
    return scripts;
};

/**
 * @param {object} vm scratch-vm
 * @param {object} ref listScripts çıktısından bir öğe ({sprite, id})
 * @param {object} [options] exact: sayı/metin değerleri de tam değer olsun
 * @return {object} PatternNode
 */
const capturePattern = (vm, ref, options) => {
    const target = originals(vm).find(t => spriteLabel(t) === ref.sprite);
    if (!target || !target.blocks._blocks[ref.id]) {
        throw new Error('Betik bulunamadı: çalışma alanını kontrol et');
    }
    return extractPattern(target.blocks._blocks, ref.id, {exactLiterals: Boolean(options && options.exact)});
};

const listWorkspaceOpcodes = vm => {
    const found = {};
    originals(vm).forEach(target => {
        const blocks = target.blocks._blocks;
        Object.keys(blocks).forEach(id => {
            if (!blocks[id].shadow) found[blocks[id].opcode] = true;
        });
    });
    return Object.keys(found).sort();
};

/**
 * @param {object} vm scratch-vm
 * @param {object} step ders adımı
 * @param {object} [options] runStepChecks seçenekleri
 * @return {Promise<object>} hiçbir koşulda reddetmeyen sonuç
 */
const tryStep = (vm, step, options) => Promise.resolve()
    .then(() => runStepChecks(vm, step, options))
    .catch(error => ({passed: false, manual: false, results: [], error: error}));

export {
    listScripts,
    capturePattern,
    listWorkspaceOpcodes,
    tryStep
};
