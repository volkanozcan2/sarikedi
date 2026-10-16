import {createChecker} from '../../../../src/lib/lessons/checker';

const block = (id, opcode, parent, extra) => Object.assign({
    id, opcode, parent: parent || null, next: null, topLevel: !parent, shadow: false, inputs: {}, fields: {}
}, extra);
const withNumber = (blocks, ownerId, input, value) => {
    const shadowId = `${ownerId}-${input}`;
    blocks[ownerId].inputs[input] = {name: input, block: shadowId, shadow: shadowId};
    blocks[shadowId] = block(shadowId, 'math_number', ownerId, {shadow: true, fields: {NUM: {name: 'NUM', value}}});
    return blocks;
};
const state = (blocks, extra = {}) => ({
    targets: [
        {id: 's1', name: 'Stage', isStage: true, blocks: {}, costumes: ['arka'], sounds: []},
        {id: 'c1', name: 'Kedi', isStage: false, blocks: blocks, costumes: ['k1'], sounds: []}
    ].concat(extra.targets || []),
    editingTarget: extra.editingTarget || 'c1',
    tab: extra.tab || 'code'
});

// Öğretmenin kaydı: bayrak bloğu (kayıtta T-hat), altına 25 adım git (T-move), sonra not
const STEPS = [
    {type: 'addBlock', target: 'Kedi', block: 'T-hat', opcode: 'event_whenflagclicked', attach: {how: 'top'},
        changed: [], values: {}, fields: {}},
    {type: 'addBlock', target: 'Kedi', block: 'T-move', opcode: 'motion_movesteps',
        attach: {to: 'T-hat', how: 'next'}, parentOpcode: 'event_whenflagclicked',
        changed: ['STEPS'], values: {STEPS: '25'}, fields: {}},
    {type: 'note', text: 'Bitti'}
];

describe('lessons/checker', () => {
    test('öğrencinin kendi blok kimlikleriyle adımlar sırayla geçilir; not adımında durur', () => {
        const checker = createChecker(STEPS, state({}));
        expect(checker.check(state({}))).toBe(0);
        const blocks = {h: block('h', 'event_whenflagclicked')};
        expect(checker.check(state(blocks))).toBe(1);
        blocks.h.next = 'm';
        blocks.m = block('m', 'motion_movesteps', 'h');
        withNumber(blocks, 'm', 'STEPS', '10');
        expect(checker.check(state(blocks))).toBe(1); // değer henüz 25 değil
        blocks['m-STEPS'].fields.NUM.value = '25';
        expect(checker.check(state(blocks))).toBe(2);
        expect(checker.blockFor('T-move')).toBe('m');
        expect(checker.check(state(blocks))).toBe(2); // not adımı kendiliğinden geçilmez
        expect(checker.skip()).toBe(3);
    });

    test('serbest değerli adımda başka değer de kabul edilir', () => {
        const steps = [STEPS[0], Object.assign({}, STEPS[1], {free: true})];
        const checker = createChecker(steps, state({}));
        const blocks = {h: block('h', 'event_whenflagclicked', null, {next: 'm'}), m: block('m', 'motion_movesteps', 'h')};
        withNumber(blocks, 'm', 'STEPS', '99');
        expect(checker.check(state(blocks))).toBe(2);
    });

    test('ebeveyn adımı atlandıysa aynı türde ebeveyne takılmak yeter', () => {
        const checker = createChecker(STEPS, state({}));
        checker.skip();
        const blocks = {x: block('x', 'event_whenflagclicked', null, {next: 'm'}), m: block('m', 'motion_movesteps', 'x')};
        withNumber(blocks, 'm', 'STEPS', '25');
        expect(checker.check(state(blocks))).toBe(2);
    });

    test('yanlış yere takılan blok adımı geçirmez', () => {
        const checker = createChecker(STEPS, state({}));
        const blocks = {h: block('h', 'event_whenflagclicked'), m: block('m', 'motion_movesteps')};
        withNumber(blocks, 'm', 'STEPS', '25');
        expect(checker.check(state(blocks))).toBe(1);
    });

    test('kukla, kostüm, dekor, sekme ve kukla seçimi adımları', () => {
        const steps = [
            {type: 'addSprite', name: 'Köpek'},
            {type: 'addBackdrop', name: 'Orman'},
            {type: 'addCostume', target: 'Kedi', name: 'k2'},
            {type: 'selectTab', tab: 'costumes'},
            {type: 'selectSprite', name: 'Kedi', isStage: false}
        ];
        const checker = createChecker(steps, state({}));
        const dog = {id: 'd9', name: 'Köpek2', isStage: false, blocks: {}, costumes: [], sounds: []};
        const s = state({}, {targets: [dog], editingTarget: 'd9'});
        expect(checker.check(s)).toBe(1);
        s.targets[0].costumes.push('Orman');
        s.targets[1].costumes.push('k2');
        expect(checker.check(s)).toBe(3);
        s.tab = 'costumes';
        expect(checker.check(s)).toBe(4);
        s.editingTarget = 'c1';
        expect(checker.check(s)).toBe(5);
    });

    test('ders başında zaten var olan blok "blok ekle" adımını karşılamaz', () => {
        const start = {h0: block('h0', 'event_whenflagclicked')};
        const checker = createChecker([STEPS[0]], state(start));
        expect(checker.check(state(start))).toBe(0);
        const blocks = Object.assign({}, start, {h1: block('h1', 'event_whenflagclicked')});
        expect(checker.check(state(blocks))).toBe(1);
    });

    test('ders başında zaten var olan aynı adlı kukla "kukla ekle" adımını geçirmez', () => {
        const checker = createChecker([{type: 'addSprite', name: 'Kedi'}], state({}));
        expect(checker.check(state({}))).toBe(0);
    });

    test('değer karşılaştırması büyük/küçük harf ve sayı biçimine duyarsız', () => {
        const steps = [{type: 'setValue', target: 'Kedi', block: 'm', key: 'STEPS', value: '10'}];
        const checker = createChecker(steps, state({}));
        const blocks = {m: block('m', 'motion_movesteps')};
        withNumber(blocks, 'm', 'STEPS', ' 10.0 ');
        expect(checker.check(state(blocks))).toBe(1);
    });
});

describe('lessons/checker: eklentiler', () => {
    test('eklenti eklenince adım geçilir', () => {
        const checker = createChecker([{type: 'addExtension', id: 'pen', name: 'Kalem'}], state({}));
        expect(checker.check(state({}))).toBe(0);
        const s = state({});
        s.extensions = [{id: 'pen', name: 'Kalem'}];
        expect(checker.check(s)).toBe(1);
    });
});

describe('lessons/checker: herhangi bir kukla/dekor ve gösterme adımları', () => {
    test('"any" kukla adımı yeni eklenen herhangi bir kuklayla, "any" dekor adımı yeni dekorla geçilir', () => {
        const steps = [{type: 'addSprite', any: true}, {type: 'addBackdrop', any: true}, {type: 'point', target: 'stage'}];
        const checker = createChecker(steps, state({}));
        const s = state({}, {targets: [{id: 'x1', name: 'Dog1', isStage: false, blocks: {}, costumes: [], sounds: []}]});
        expect(checker.check(s)).toBe(1);
        s.targets[0].costumes.push('Orman');
        expect(checker.check(s)).toBe(2); // gösterme adımı kendiliğinden geçilmez
    });
});
