/**
 * Ders kaynaklarını (DSL) ders JSON'una derler. Kalıplar, çözüm projesi gerçek
 * scratch-vm'e yüklenerek `extractPattern` ile üretilir; böylece GUI'de öğrencinin
 * çalışma alanında oluşacak blok yapısıyla aynı biçimdedir.
 */

const {buildProject, locate} = require('./dsl');
const {loadVm, disposeVm} = require('./headless');
const {extractPattern, ANY} = require('../../server/src/lib/block-pattern');
const {runStepChecks} = require('../../server/src/lib/check-runner');

const G = {
    category: (id, label) => ({type: 'click', target: {kind: 'category', id: id}, label: label}),
    ui: (id, label) => ({type: 'click', target: {kind: 'ui', id: id}, label: label}),
    drag: (opcode, label) => ({
        type: 'drag', from: {kind: 'block', opcode: opcode}, to: {kind: 'workspace'}, label: label
    }),
    dragOnto: (opcode, targetOpcode, label) => ({
        type: 'drag',
        from: {kind: 'block', opcode: opcode},
        to: {kind: 'workspaceBlock', opcode: targetOpcode},
        label: label
    })
};

const lesson = definition => definition;
const step = definition => definition;

/** Her adımın "çözüm durumunu" bulur (scripts verilmediyse öncekini devralır). */
const resolveStates = definition => {
    let sprites = {};
    return definition.steps.map(s => {
        if (s.scripts) sprites = s.scripts;
        return {sprites: sprites, variables: definition.variables || [], wrong: s.wrong || []};
    });
};

const loosen = (node, names) => {
    if (!node) return;
    Object.keys(node.inputs).forEach(name => {
        const input = node.inputs[name];
        if ('literal' in input) {
            if (names.indexOf(name) !== -1) input.literal = ANY;
        } else {
            loosen(input, names);
        }
    });
    loosen(node.next, names);
};

/** Adı verilen girişlerin sayı/metin değerlerini (exact kalıptan) tam değer yapar. */
const mergeExact = (pattern, exactPattern, names) => {
    if (!pattern || !exactPattern) return;
    Object.keys(pattern.inputs).forEach(name => {
        const input = pattern.inputs[name];
        if ('literal' in input) {
            if (names.indexOf(name) !== -1) input.literal = exactPattern.inputs[name].literal;
        } else {
            mergeExact(input, exactPattern.inputs[name], names);
        }
    });
    mergeExact(pattern.next, exactPattern.next, names);
};

const withVm = (state, fn) => {
    const built = buildProject(state);
    return loadVm(built.project).then(vm => Promise.resolve(fn(vm, built)).then(
        result => {
            disposeVm(vm);
            return result;
        },
        error => {
            disposeVm(vm);
            throw error;
        }
    ));
};

const PLACEMENT_HINT = 'Yeni bloğu betiğin EN ALTINA, son bloğun altına tak; ortaya bırakırsan altındaki bloklar ' +
    'onun içine girer.';
const VARIABLE_HINT = '"Tüm kuklalar için" seçeneği seçili kalsın.';
const C_BLOCKS = ['control_if', 'control_if_else', 'control_forever', 'control_repeat_until', 'control_wait_until'];

/** Adım türüne göre ortak ipuçlarını ekler (kapsayıcı blok yerleştirme, değişken kapsamı). */
const withHints = step => {
    const guide = step.guide || [];
    const placesCBlock = guide.some(a => a.type === 'drag' && a.from.kind === 'block' &&
        C_BLOCKS.indexOf(a.from.opcode) !== -1);
    const createsVariable = !step.focus && !step.outcome &&
        guide.length === 1 && guide[0].type === 'click' && guide[0].target.kind === 'category' &&
        guide[0].target.id === 'variables';
    const extra = [];
    if (placesCBlock) extra.push(PLACEMENT_HINT);
    if (createsVariable) extra.push(VARIABLE_HINT);
    return [step.hint || ''].concat(extra).filter(Boolean)
        .join(' ');
};

const compileStep = (definition, index, state) => {
    const s = definition.steps[index];
    const focuses = [].concat(s.focus || []);
    const base = {
        text: s.text,
        media: null,
        hint: withHints(s) || null,
        checks: [],
        guide: s.guide || []
    };
    if (focuses.length === 0 && !s.outcome) return Promise.resolve(base);

    return withVm(state, (vm, built) => {
        focuses.forEach(focus => {
            const sprite = focus.sprite || 'Cool Cat';
            const id = locate(built.trees, sprite, focus.script || 0, focus.path);
            const target = vm.runtime.targets.find(t => !t.isStage && t.getName() === sprite);
            const pattern = extractPattern(target.blocks._blocks, id, {exactLiterals: Boolean(focus.exact)});
            if (focus.exactOnly) {
                mergeExact(pattern, extractPattern(target.blocks._blocks, id, {exactLiterals: true}), focus.exactOnly);
            }
            if (focus.noNext) pattern.next = null;
            if (focus.loosen) loosen(pattern, focus.loosen);
            const check = {type: 'blocks', pattern: pattern};
            if (!focus.anySprite) check.sprite = sprite === 'Stage' ? 'Sahne' : sprite;
            base.checks.push(check);
        });
        if (s.outcome) {
            base.checks.push({
                type: 'outcome',
                trigger: s.outcome.trigger,
                waitMs: s.outcome.waitMs || 400,
                expect: s.outcome.expect
            });
        }
        return base;
    });
};

const compileLesson = definition => {
    const states = resolveStates(definition);
    return definition.steps.reduce((chain, s, index) => chain.then(steps => compileStep(definition, index, states[index])
        .then(compiled => steps.concat([compiled]))), Promise.resolve([])).then(steps => ({
        id: definition.id,
        title: definition.title,
        description: definition.description,
        level: definition.level,
        cover: null,
        order: definition.order,
        published: true,
        startProject: definition.startProject || null,
        steps: steps
    }));
};

/** Bir adımın kontrollerini, verilen çözüm durumunda gerçek VM'de çalıştırır. */
const runStepIn = (stepJson, state) => withVm(state, vm => runStepChecks(vm, stepJson, {}));

module.exports = {G, lesson, step, resolveStates, compileLesson, runStepIn, withVm};
