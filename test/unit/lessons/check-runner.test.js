import {runStepChecks} from '../../../src/lib/lessons/check-runner';
import * as lessons from '../../../src/lib/lessons';
import {extractPattern} from '../../../src/lib/lessons/block-pattern';
import {movesFixture, keyFixture} from './helpers/blocks-fixture';

const makeVm = blocks => {
    const calls = [];
    const cat = {
        isStage: false,
        isOriginal: true,
        x: 60,
        y: 0,
        direction: 90,
        size: 100,
        visible: true,
        variables: {},
        blocks: {_blocks: blocks},
        getName: () => 'Kedi',
        getCustomState: () => null
    };
    return {
        calls: calls,
        runtime: {targets: [cat]},
        editingTarget: cat,
        greenFlag: () => calls.push('flag'),
        stopAll: () => calls.push('stop'),
        postIOData: () => {}
    };
};

const instant = {sleep: () => Promise.resolve()};
const blocksCheck = () => ({type: 'blocks', pattern: extractPattern(movesFixture(), 'hat')});
const outcomeCheck = value => ({
    type: 'outcome',
    trigger: 'flag',
    waitMs: 10,
    expect: [{target: '', prop: 'x', op: 'gt', value: value}]
});

describe('runStepChecks', () => {
    test('kontrolsüz adım manuel sayılır', () => runStepChecks(makeVm({}), {checks: []}, instant).then(result => {
        expect(result).toEqual({passed: false, manual: true, results: []});
    }));

    test('checks alanı yoksa da manuel sayılır', () => runStepChecks(makeVm({}), {}, instant).then(result => {
        expect(result.manual).toBe(true);
    }));

    test('yalnızca blok kontrolü geçerse proje çalıştırılmaz', () => {
        const vm = makeVm(movesFixture());
        return runStepChecks(vm, {checks: [blocksCheck()]}, instant).then(result => {
            expect(result).toEqual({passed: true, manual: false, results: [{type: 'blocks', passed: true}]});
            expect(vm.calls).toEqual([]);
        });
    });

    test('blok kontrolü başarısızsa sonuç kontrolü atlanır ve proje başlatılmaz', () => {
        const vm = makeVm(keyFixture());
        return runStepChecks(vm, {checks: [blocksCheck(), outcomeCheck(5)]}, instant).then(result => {
            expect(result.passed).toBe(false);
            expect(result.results).toEqual([
                {type: 'blocks', passed: false},
                {type: 'outcome', passed: false, skipped: true}
            ]);
            expect(vm.calls).toEqual([]);
        });
    });

    test('blok ve sonuç kontrolü birlikte geçer', () => {
        const vm = makeVm(movesFixture());
        return runStepChecks(vm, {checks: [blocksCheck(), outcomeCheck(5)]}, instant).then(result => {
            expect(result.passed).toBe(true);
            expect(result.results.map(r => r.passed)).toEqual([true, true]);
            expect(vm.calls).toEqual(['flag', 'stop']);
        });
    });

    test('sonuç kontrolü başarısızsa adım geçmez', () => {
        const vm = makeVm(movesFixture());
        return runStepChecks(vm, {checks: [blocksCheck(), outcomeCheck(500)]}, instant).then(result => {
            expect(result.passed).toBe(false);
            expect(result.results[1].passed).toBe(false);
            expect(result.results[1].failures).toHaveLength(1);
        });
    });

    test('bilinmeyen kontrol türü başarısız sayılır', () => {
        const vm = makeVm(movesFixture());
        return runStepChecks(vm, {checks: [{type: 'sihir'}]}, instant).then(result => {
            expect(result.passed).toBe(false);
            expect(result.results).toEqual([{type: 'sihir', passed: false}]);
        });
    });
});

describe('runStepChecks: kukla kapsamı', () => {
    test('kontrolün kuklası yanlışsa geçmez, doğruysa geçer', () => {
        const vm = makeVm(movesFixture());
        const wrong = Object.assign({}, blocksCheck(), {sprite: 'Star'});
        const right = Object.assign({}, blocksCheck(), {sprite: 'Kedi'});
        return runStepChecks(vm, {checks: [wrong]}, instant).then(result => {
            expect(result.passed).toBe(false);
            return runStepChecks(vm, {checks: [right]}, instant);
        }).then(result => expect(result.passed).toBe(true));
    });
});

describe('lessons index', () => {
    test('tüm genel fonksiyonları dışa aktarır', () => {
        ['ANY', 'isAny', 'extractPattern', 'matchPattern', 'workspaceMatches', 'validateLesson',
            'snapshotVm', 'evaluateExpectations', 'runOutcomeCheck', 'runStepChecks'].forEach(name => {
            expect(lessons[name]).toBeDefined();
        });
    });
});
