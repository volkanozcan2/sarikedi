import {listScripts, capturePattern, listWorkspaceOpcodes, tryStep} from '../../../src/lib/lessons/capture';
import {ANY} from '../../../src/lib/lessons/block-pattern';
import {block, num, toMap, literalInput, movesFixture, repeatFixture} from './helpers/blocks-fixture';

const fakeTarget = (name, blocks, extra) => Object.assign({
    isStage: false,
    isOriginal: true,
    getName: () => name,
    blocks: {
        _blocks: blocks,
        getScripts: () => Object.keys(blocks).filter(id => blocks[id].topLevel && !blocks[id].shadow)
    }
}, extra);

const fakeVm = targets => ({runtime: {targets: targets}});

describe('listScripts', () => {
    test('betikleri hedeflere göre listeler ve blokları sayar', () => {
        const vm = fakeVm([
            fakeTarget('Stage', {}, {isStage: true}),
            fakeTarget('Cool Cat', movesFixture()),
            fakeTarget('Star', repeatFixture())
        ]);
        expect(listScripts(vm)).toEqual([
            {sprite: 'Cool Cat', id: 'hat', opcode: 'event_whenflagclicked', blockCount: 3},
            {sprite: 'Star', id: 'hat', opcode: 'event_whenflagclicked', blockCount: 3}
        ]);
    });

    test('sahne betikleri "Sahne" adıyla gelir, klonlar atlanır', () => {
        const stageBlocks = toMap([block('s', 'event_whenflagclicked', {topLevel: true})]);
        const vm = fakeVm([
            fakeTarget('Stage', stageBlocks, {isStage: true}),
            fakeTarget('Cool Cat', movesFixture(), {isOriginal: false})
        ]);
        expect(listScripts(vm)).toEqual([{sprite: 'Sahne', id: 's', opcode: 'event_whenflagclicked', blockCount: 1}]);
    });

    test('reporter girişleri blok sayısına dahildir', () => {
        const blocks = toMap([
            block('goto', 'motion_gotoxy', {
                topLevel: true,
                inputs: {X: {name: 'X', block: 'add', shadow: 'nx'}, Y: literalInput('Y', 'ny')}
            }),
            num('nx', '0', 'goto'),
            num('ny', '5', 'goto'),
            block('add', 'operator_add', {parent: 'goto', inputs: {NUM1: literalInput('NUM1', 'a1')}}),
            num('a1', '1', 'add')
        ]);
        expect(listScripts(fakeVm([fakeTarget('Cool Cat', blocks)]))[0].blockCount).toBe(2);
    });

    test('hedefsiz VM çökmez', () => {
        expect(listScripts(fakeVm([]))).toEqual([]);
    });
});

describe('capturePattern', () => {
    const vm = fakeVm([fakeTarget('Cool Cat', movesFixture()), fakeTarget('Stage', {}, {isStage: true})]);

    test('betikten kalıp çıkarır (sayılar ANY)', () => {
        const pattern = capturePattern(vm, {sprite: 'Cool Cat', id: 'hat'});
        expect(pattern.opcode).toBe('event_whenflagclicked');
        expect(pattern.next.inputs.STEPS).toEqual({literal: ANY});
    });

    test('exact seçeneği sayıları tam değer yapar', () => {
        const pattern = capturePattern(vm, {sprite: 'Cool Cat', id: 'hat'}, {exact: true});
        expect(pattern.next.inputs.STEPS).toEqual({literal: '10'});
    });

    test('olmayan hedef ya da blok için Türkçe hata', () => {
        expect(() => capturePattern(vm, {sprite: 'Yok', id: 'hat'})).toThrow('Betik bulunamadı');
        expect(() => capturePattern(vm, {sprite: 'Cool Cat', id: 'yok'})).toThrow('Betik bulunamadı');
    });

    test('Sahne adı sahne hedefini bulur', () => {
        const stageBlocks = toMap([block('s', 'event_whenflagclicked', {topLevel: true})]);
        const stageVm = fakeVm([fakeTarget('Stage', stageBlocks, {isStage: true})]);
        expect(capturePattern(stageVm, {sprite: 'Sahne', id: 's'}).opcode).toBe('event_whenflagclicked');
    });

    test('çok büyük betik kalıp sınırında reddedilir', () => {
        const list = [];
        for (let i = 0; i < 501; i++) {
            list.push(block(`b${i}`, 'motion_movesteps', {topLevel: i === 0, next: i < 500 ? `b${i + 1}` : null}));
        }
        const big = fakeVm([fakeTarget('Cool Cat', toMap(list))]);
        expect(() => capturePattern(big, {sprite: 'Cool Cat', id: 'b0'})).toThrow('Kalıp çok büyük');
    });
});

describe('listWorkspaceOpcodes', () => {
    test('benzersiz, alfabetik, gölgesiz', () => {
        const vm = fakeVm([fakeTarget('Cool Cat', movesFixture()), fakeTarget('Star', repeatFixture())]);
        expect(listWorkspaceOpcodes(vm)).toEqual([
            'control_repeat', 'event_whenflagclicked', 'motion_movesteps', 'motion_turnright'
        ]);
        expect(listWorkspaceOpcodes(fakeVm([]))).toEqual([]);
    });
});

describe('tryStep', () => {
    const fullVm = () => {
        const cat = fakeTarget('Cool Cat', movesFixture(), {
            x: 0, y: 0, direction: 90, size: 100, visible: true, variables: {}, getCustomState: () => null
        });
        return {
            runtime: {targets: [cat]},
            editingTarget: cat,
            greenFlag: jest.fn(),
            stopAll: jest.fn(),
            postIOData: jest.fn()
        };
    };

    test('blok kontrolü geçerse passed true', () => {
        const vm = fullVm();
        const pattern = capturePattern(vm, {sprite: 'Cool Cat', id: 'hat'});
        return tryStep(vm, {checks: [{type: 'blocks', pattern: pattern}]}).then(result => {
            expect(result.passed).toBe(true);
            expect(result.results).toEqual([{type: 'blocks', passed: true}]);
        });
    });

    test('kontrolsüz adım manuel', () => tryStep(fullVm(), {checks: []}).then(result => {
        expect(result.manual).toBe(true);
    }));

    test('çalıştırma hatası reddetmez', () => tryStep(fullVm(), {checks: [{type: 'blocks'}]}).then(result => {
        expect(result.passed).toBe(false);
        expect(result.error).toBeDefined();
    }));
});
