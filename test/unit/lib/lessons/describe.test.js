import {describeStep, categoryOf} from '../../../../src/lib/lessons/describe';

describe('lessons/describe', () => {
    test('işlem kodundan kategori adı', () => {
        expect(categoryOf('motion_movesteps')).toEqual({id: 'motion', name: 'Hareket'});
        expect(categoryOf('operator_add')).toEqual({id: 'operators', name: 'Operatörler'});
        expect(categoryOf('data_setvariableto')).toEqual({id: 'variables', name: 'Değişkenler'});
        expect(categoryOf('procedures_call')).toEqual({id: 'myBlocks', name: 'Bloklarım'});
        expect(categoryOf('pen_clear')).toEqual({id: 'pen', name: 'Kalem'});
    });

    test('blok ekleme: alta takma, içine koyma, boşluğa koyma, kod alanına bırakma', () => {
        const base = {type: 'addBlock', opcode: 'motion_movesteps', label: '10 adım git', changed: [], values: {}};
        expect(describeStep(Object.assign({}, base, {attach: {to: 'h', how: 'next'},
            parentLabel: 'bayrağa tıklanınca'})))
            .toBe('Hareket kategorisinden "10 adım git" bloğunu al, "bayrağa tıklanınca" bloğunun altına tak.');
        expect(describeStep(Object.assign({}, base, {attach: {to: 'l', how: 'input', input: 'SUBSTACK'},
            parentLabel: 'sürekli tekrarla'})))
            .toBe('Hareket kategorisinden "10 adım git" bloğunu al, "sürekli tekrarla" bloğunun içine yerleştir.');
        expect(describeStep({type: 'addBlock', opcode: 'operator_add', label: '( ) + ( )', changed: [], values: {},
            attach: {to: 'm', how: 'input', input: 'STEPS'}, parentLabel: '10 adım git'}))
            .toBe('Operatörler kategorisinden "( ) + ( )" bloğunu al, "10 adım git" bloğundaki boşluğa yerleştir.');
        expect(describeStep({type: 'addBlock', opcode: 'event_whenflagclicked', label: 'bayrağa tıklanınca',
            changed: [], values: {}, attach: {how: 'top'}}))
            .toBe('Olaylar kategorisinden "bayrağa tıklanınca" bloğunu al, kod alanına bırak.');
    });

    test('blok eklerken değiştirilen değerler cümleye eklenir', () => {
        expect(describeStep({type: 'addBlock', opcode: 'motion_movesteps', label: '25 adım git',
            changed: ['STEPS'], values: {STEPS: '25'}, fields: {}, attach: {how: 'top'}}))
            .toBe('Hareket kategorisinden "25 adım git" bloğunu al, kod alanına bırak. Değeri 25 yap.');
    });

    test('diğer adım türleri', () => {
        expect(describeStep({type: 'setValue', label: '10 adım git', value: '50'}))
            .toBe('"10 adım git" bloğundaki değeri 50 yap.');
        expect(describeStep({type: 'moveBlock', label: 'zıpla', attach: {to: 'x', how: 'next'}, parentLabel: 'başla'}))
            .toBe('"zıpla" bloğunu "başla" bloğunun altına taşı.');
        expect(describeStep({type: 'deleteBlock', label: 'zıpla'}))
            .toBe('"zıpla" bloğunu sil: bloğu sürükleyip blok paletinin üzerine bırak.');
        expect(describeStep({type: 'addSprite', name: 'Köpek'})).toBe('"Kukla Seç" düğmesinden "Köpek" kuklasını ekle.');
        expect(describeStep({type: 'deleteSprite', name: 'Köpek'})).toBe('"Köpek" kuklasını sil.');
        expect(describeStep({type: 'addBackdrop', name: 'Orman'})).toBe('"Dekor Seç" düğmesinden "Orman" dekorunu ekle.');
        expect(describeStep({type: 'addCostume', name: 'k2', target: 'Kedi'}))
            .toBe('Kostümler sekmesinde "Kedi" kuklasına "k2" kostümünü ekle.');
        expect(describeStep({type: 'addSound', name: 'Pop', target: 'Kedi'}))
            .toBe('Sesler sekmesinde "Kedi" kuklasına "Pop" sesini ekle.');
        expect(describeStep({type: 'selectSprite', name: 'Kedi', isStage: false}))
            .toBe('Kukla listesinden "Kedi" kuklasını seç.');
        expect(describeStep({type: 'selectSprite', name: 'Sahne', isStage: true})).toBe('Sağdaki "Sahne"yi seç.');
        expect(describeStep({type: 'selectTab', tab: 'costumes'})).toBe('"Kostümler" sekmesine geç.');
        expect(describeStep({type: 'note', text: 'Kedi yürüyecek'})).toBe('Kedi yürüyecek');
        expect(describeStep({type: 'point', target: 'greenFlag', text: 'Yeşil bayrağa tıkla.'}))
            .toBe('Yeşil bayrağa tıkla.');
        expect(describeStep({type: 'addSprite', any: true})).toBe('"Kukla Seç" düğmesinden istediğin bir kuklayı ekle.');
        expect(describeStep({type: 'addExtension', id: 'pen', name: 'Kalem'}))
            .toBe('Sol alttaki "Eklenti Ekle" düğmesinden "Kalem" eklentisini ekle.');
    });

    test('öğretmenin yazdığı metin varsa otomatik metnin yerine o kullanılır', () => {
        expect(describeStep({type: 'selectTab', tab: 'code', text: 'Kodlara dönelim'})).toBe('Kodlara dönelim');
    });
});

describe('lessons/vm-state: blok yazısı', () => {
    const {blockText} = require('../../../../src/lib/lessons/vm-state');
    const field = text => ({getText: () => text});
    const block = inputs => ({inputList: inputs});
    test('alanlar ve değer girdileri yazılır, C bloğunun içi katılmaz, boş girdi ( ) olur', () => {
        const number = block([{fieldRow: [field('10')]}]);
        const move = block([{fieldRow: [field('')], connection: {targetBlock: () => number}, type: 1},
            {fieldRow: [field('adım git')]}]);
        expect(blockText(move)).toBe('10 adım git');
        const forever = block([{fieldRow: [field('sürekli tekrarla')]},
            {fieldRow: [], connection: {targetBlock: () => move}, type: 3}]);
        expect(blockText(forever)).toBe('sürekli tekrarla');
        const ifBlock = block([{fieldRow: [field('eğer')], connection: {targetBlock: () => null}, type: 1},
            {fieldRow: [field('ise')]}]);
        expect(blockText(ifBlock)).toBe('eğer ( ) ise');
        const flag = block([{fieldRow: [{src_: '/static/blocks-media/green-flag.svg', getText: () => 'flag'},
            field('e tıklandığında')]}]);
        expect(blockText(flag)).toBe('yeşil bayrağa tıklandığında');
        const loop = block([{fieldRow: [field('sürekli tekrarla'), {src_: 'repeat.svg', getText: () => '*'}]}]);
        expect(blockText(loop)).toBe('sürekli tekrarla');
    });
});
