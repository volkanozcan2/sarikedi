import {createRecorder} from '../../../../src/lib/lessons/recorder';

const hat = () => ({id: 'hat', opcode: 'event_whenflagclicked', parent: null, next: null, topLevel: true,
    shadow: false, inputs: {}, fields: {}});
const move = (parent, steps = '10') => ({
    move: {id: 'move', opcode: 'motion_movesteps', parent: parent, next: null, topLevel: !parent, shadow: false,
        inputs: {STEPS: {name: 'STEPS', block: 'num', shadow: 'num'}}, fields: {}},
    num: {id: 'num', opcode: 'math_number', parent: 'move', next: null, topLevel: false, shadow: true,
        inputs: {}, fields: {NUM: {name: 'NUM', value: steps}}}
});

// Kaydedicinin okuduğu proje durumu: kuklalar, düzenlenen kukla ve açık sekme
const makeState = (blocks, extra = {}) => ({
    targets: [
        {id: 'stage', name: 'Sahne', isStage: true, blocks: {}, costumes: ['arka'], sounds: []},
        {id: 'cat', name: 'Kedi', isStage: false, blocks: blocks, costumes: ['k1'], sounds: ['Miyav']}
    ].concat(extra.targets || []),
    editingTarget: extra.editingTarget || 'cat',
    tab: extra.tab || 'code'
});

const attachHat = blocks => {
    blocks.hat.next = 'move';
    return blocks;
};

describe('lessons/recorder', () => {
    const labels = {hat: 'bayrağa tıklanınca', move: '10 adım git'};
    const labelFor = (targetId, blockId) => labels[blockId];

    test('palete alınan blok bir "addBlock" adımı olur; ebeveyni ve etiketi kaydedilir', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({hat: hat()}));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat')))));
        const steps = rec.getSteps();
        expect(steps).toHaveLength(1);
        expect(steps[0]).toMatchObject({
            type: 'addBlock', target: 'Kedi', block: 'move', opcode: 'motion_movesteps',
            attach: {to: 'hat', how: 'next'}, label: '10 adım git', parentLabel: 'bayrağa tıklanınca',
            values: {STEPS: '10'}, changed: []
        });
    });

    test('yeni eklenen bloğun değeri hemen değişirse aynı adıma katlanır', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({hat: hat()}));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat')))));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat', '25')))));
        const steps = rec.getSteps();
        expect(steps).toHaveLength(1);
        expect(steps[0].values).toEqual({STEPS: '25'});
        expect(steps[0].changed).toEqual(['STEPS']);
    });

    test('önce bırakılıp sonra yerine takılan blok tek adım kalır (bağlantı güncellenir)', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({hat: hat()}));
        rec.update(makeState(Object.assign({hat: hat()}, move(null))));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat')))));
        const steps = rec.getSteps();
        expect(steps).toHaveLength(1);
        expect(steps[0].attach).toEqual({to: 'hat', how: 'next'});
    });

    test('kayıtta eklenip silinen blok adımıyla birlikte kaybolur', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({hat: hat()}));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat')))));
        rec.update(makeState({hat: hat()}));
        expect(rec.getSteps()).toEqual([]);
    });

    test('kayıttan önce var olan blok silinirse "deleteBlock", değeri değişirse "setValue" adımı olur', () => {
        const rec = createRecorder({labelFor});
        const start = attachHat(Object.assign({hat: hat()}, move('hat')));
        rec.start(makeState(start));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat', '30')))));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat', '40')))));
        rec.update(makeState({hat: hat()}));
        const steps = rec.getSteps();
        expect(steps.map(s => s.type)).toEqual(['setValue', 'deleteBlock']);
        expect(steps[0]).toMatchObject({block: 'move', key: 'STEPS', value: '40', label: '10 adım git'});
        expect(steps[1]).toMatchObject({block: 'move', label: '10 adım git'});
    });

    test('kukla ekleme, kostüm/ses/dekor ekleme ve kukla seçimi adım olur', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({}));
        const dog = {id: 'dog', name: 'Köpek', isStage: false, blocks: {}, costumes: ['d1'], sounds: []};
        rec.update(makeState({}, {targets: [dog], editingTarget: 'dog'}));
        const state = makeState({}, {targets: [dog], editingTarget: 'cat'});
        state.targets[1].costumes = ['k1', 'Yeni'];
        state.targets[1].sounds = ['Miyav', 'Pop'];
        state.targets[0].costumes = ['arka', 'Orman'];
        rec.update(state);
        expect(rec.getSteps().map(s => [s.type, s.name])).toEqual([
            ['addSprite', 'Köpek'],
            ['addBackdrop', 'Orman'],
            ['addCostume', 'Yeni'],
            ['addSound', 'Pop'],
            ['selectSprite', 'Kedi']
        ]);
    });

    test('kayıtta eklenip silinen kukla, ona ait tüm adımlarla birlikte kaybolur', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({}));
        const dog = {id: 'dog', name: 'Köpek', isStage: false, blocks: {}, costumes: ['d1'], sounds: []};
        rec.update(makeState({}, {targets: [dog], editingTarget: 'dog'}));
        rec.update(makeState({}, {targets: [Object.assign({}, dog, {blocks: {hat: hat()}})], editingTarget: 'dog'}));
        rec.update(makeState({}, {editingTarget: 'cat'}));
        expect(rec.getSteps().map(s => s.type)).toEqual(['selectSprite']);
    });

    test('kayıttan önce var olan kukla silinince tek bir "deleteSprite" adımı olur', () => {
        const rec = createRecorder({labelFor});
        const dog = {id: 'dog', name: 'Köpek', isStage: false, blocks: {}, costumes: ['d1'], sounds: []};
        rec.start(makeState({}, {targets: [dog]}));
        rec.update(makeState({}));
        rec.update(makeState({}));
        expect(rec.getSteps()).toEqual([{type: 'deleteSprite', name: 'Köpek'}]);
    });

    test('art arda sekme geçişleri tek adıma iner; başlangıç sekmesine dönülürse adım kalmaz', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({}));
        rec.update(makeState({}, {tab: 'costumes'}));
        rec.update(makeState({}, {tab: 'sounds'}));
        expect(rec.getSteps()).toEqual([{type: 'selectTab', tab: 'sounds'}]);
        rec.update(makeState({}, {tab: 'code'}));
        expect(rec.getSteps()).toEqual([]);
    });

    test('not, o ana bir adım olarak eklenir; boş not eklenmez', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({}));
        rec.addNote('  Kedi yürüyecek  ');
        rec.addNote('   ');
        expect(rec.getSteps()).toEqual([{type: 'note', text: 'Kedi yürüyecek'}]);
    });

    test('kayda devam: önceki adımlar korunur, aradaki değişiklikler adım sayılmaz', () => {
        const rec = createRecorder({labelFor});
        rec.start(makeState({hat: hat()}), [{type: 'note', text: 'önceki'}]);
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat')))));
        expect(rec.getSteps().map(s => s.type)).toEqual(['note', 'addBlock']);
    });

    test('etiket bulunamazsa blok adı yerine işlem kodu kullanılır', () => {
        const rec = createRecorder();
        rec.start(makeState({hat: hat()}));
        rec.update(makeState(attachHat(Object.assign({hat: hat()}, move('hat')))));
        expect(rec.getSteps()[0].label).toBe('motion_movesteps');
    });
});

describe('lessons/recorder: eklentiler', () => {
    test('yeni eklenen eklenti "addExtension" adımı olur; başta var olan sayılmaz', () => {
        const rec = createRecorder();
        const base = makeState({});
        base.extensions = [{id: 'music', name: 'Müzik'}];
        rec.start(base);
        const next = makeState({});
        next.extensions = [{id: 'music', name: 'Müzik'}, {id: 'pen', name: 'Kalem'}];
        rec.update(next);
        rec.update(next);
        expect(rec.getSteps()).toEqual([{type: 'addExtension', id: 'pen', name: 'Kalem'}]);
    });
});
