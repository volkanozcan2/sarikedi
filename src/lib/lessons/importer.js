/**
 * @fileoverview
 * Hazır bir projenin (VM'e yüklenmiş) betiklerini, adım başına birkaç deyimle ders adımlarına böler.
 * Her adımın blok kontrolü, o ana kadarki betiğin önekidir; rehber ve metin yalnızca o adımın yeni
 * bloklarını anlatır. Saf mantık: vm'den yalnızca capture.js üzerinden okur.
 */

import {capturePattern, listScripts} from './capture';
import {buildGuide, buildText, flattenNodes} from './recorder';

const MAX_STEPS = 100;
const DEFAULT_CHUNK = 3;
const TRY_STEP_TEXT = 'Yeşil bayrağa tıkla ve oyununu dene!';

const isStatementInput = name => name.indexOf('SUBSTACK') === 0;

const countStatements = node => {
    if (!node) return 0;
    let count = 1;
    Object.keys(node.inputs).forEach(name => {
        if (isStatementInput(name) && !('literal' in node.inputs[name])) {
            count += countStatements(node.inputs[name]);
        }
    });
    return count + countStatements(node.next);
};

const cut = (node, state) => {
    if (!node || state.left <= 0) return null;
    state.left -= 1;
    const copy = {opcode: node.opcode, fields: node.fields, inputs: {}, next: null};
    Object.keys(node.inputs).forEach(name => {
        const input = node.inputs[name];
        if (isStatementInput(name) && !('literal' in input)) {
            const sub = cut(input, state);
            if (sub) copy.inputs[name] = sub;
        } else {
            copy.inputs[name] = input;
        }
    });
    copy.next = cut(node.next, state);
    return copy;
};

/**
 * Betik kalıbının ilk `count` deyimini (kapsayıcı içleri sırayla) tutar; girişlerdeki
 * reporter blokları bağlı oldukları deyimle birlikte kalır.
 * @param {object} pattern PatternNode
 * @param {number} count tutulacak deyim sayısı
 * @return {?object} yeni PatternNode (girdi değişmez)
 */
const truncatePattern = (pattern, count) => cut(pattern, {left: count});

// n deyimi ~size'lık parçalara böler; tek deyimlik artık önceki parçaya katılır. Parça sonlarını döndürür.
const boundaries = (n, size) => {
    const ends = [];
    for (let end = size; end < n; end += size) ends.push(end);
    if (ends.length > 0 && n - ends[ends.length - 1] === 1) ends.pop();
    ends.push(n);
    return ends;
};

const positionOf = (vm, ref) => {
    const target = vm.runtime.targets.find(t => t.isOriginal && (t.isStage ? 'Sahne' : t.getName()) === ref.sprite);
    const found = target && target.blocks._blocks[ref.id];
    return {x: found ? Number(found.x) || 0 : 0, y: found ? Number(found.y) || 0 : 0};
};

// kuklalar ilk görünme sırasıyla, sahne en sona; kukla içinde yukarıdan aşağıya, soldan sağa
const orderedScripts = vm => {
    const scripts = listScripts(vm).map((ref, index) => Object.assign({index: index, ref: ref}, positionOf(vm, ref)));
    const names = [];
    scripts.forEach(script => {
        if (names.indexOf(script.ref.sprite) === -1) names.push(script.ref.sprite);
    });
    names.sort((a, b) => Number(a === 'Sahne') - Number(b === 'Sahne'));
    return names.reduce((all, name) => all.concat(
        scripts.filter(script => script.ref.sprite === name)
            .sort((a, b) => (a.y - b.y) || (a.x - b.x) || (a.index - b.index))
    ), []);
};

/**
 * @param {object} vm betikleri okunacak scratch-vm (içe aktarılan proje)
 * @param {object} [options] chunkSize (adım başına deyim, varsayılan 3), labels ({opcode: görünen ad}),
 *     autoCheck (true ise adımlara blok kontrolü eklenir; yoksa öğrenci "İleri" ile geçer)
 * @return {Array} ders adımları (sonda blok kontrolü olmayan "oyunu dene" adımı)
 */
const buildImportSteps = (vm, options) => {
    const opts = options || {};
    const size = Math.max(1, Math.round(Number(opts.chunkSize) || DEFAULT_CHUNK));
    const steps = [];

    orderedScripts(vm).forEach(script => {
        const full = capturePattern(vm, script.ref, {exact: false});
        const total = countStatements(full);
        let before = [];
        boundaries(total, size).forEach(end => {
            const pattern = end === total ? full : truncatePattern(full, end);
            const nodes = flattenNodes(pattern, []);
            const fresh = nodes.slice(before.length).map((node, i) => ({
                opcode: node.opcode,
                after: before.length + i === 0 ? null : nodes[before.length + i - 1].opcode,
                fields: node.fields
            }));
            steps.push({
                text: buildText(fresh, opts.labels),
                media: null,
                hint: null,
                checks: opts.autoCheck ? [{type: 'blocks', sprite: script.ref.sprite, pattern: pattern}] : [],
                guide: buildGuide(fresh, [])
            });
            before = nodes;
        });
    });

    if (steps.length === 0) {
        throw new Error(
            'Seçtiğin projede hiç blok yok. Dosyayı blokları ekledikten sonra kaydettiğinden emin ol.'
        );
    }
    if (steps.length + 1 > MAX_STEPS) {
        throw new Error(`Çok fazla adım çıkıyor (${steps.length + 1}). Daha büyük bir adım boyutu seç.`);
    }
    steps.push({text: TRY_STEP_TEXT, media: null, hint: null, checks: [], guide: []});
    return steps;
};

export {
    buildImportSteps,
    truncatePattern
};
