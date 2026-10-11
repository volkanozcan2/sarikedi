import {snapshotVm, evaluateExpectations, runOutcomeCheck} from '../../../src/lib/lessons/outcome';

const fakeVm = overrides => {
    const calls = [];
    const stage = {
        isStage: true,
        isOriginal: true,
        variables: {v1: {name: 'skor', value: 3}},
        getName: () => 'Stage',
        getCustomState: () => null
    };
    const cat = {
        isStage: false,
        isOriginal: true,
        x: 60,
        y: 0,
        direction: 90,
        size: 100,
        visible: true,
        variables: {},
        getName: () => 'Kedi',
        getCustomState: key => (key === 'Scratch.looks' ? {text: 'Merhaba'} : null)
    };
    const clone = Object.assign({}, cat, {isOriginal: false, x: 999});
    const vm = {
        calls: calls,
        runtime: {targets: [stage, cat, clone]},
        editingTarget: cat,
        greenFlag: () => calls.push('flag'),
        stopAll: () => calls.push('stop'),
        postIOData: (device, data) => calls.push([device, data.key, data.isDown])
    };
    return Object.assign(vm, overrides);
};

const instantSleep = slept => ms => {
    slept.push(ms);
    return Promise.resolve();
};

describe('snapshotVm', () => {
    test('sprite, sahne ve seçili hedef; kopyalar atlanır', () => {
        const snap = snapshotVm(fakeVm());
        expect(snap.selected).toBe('Kedi');
        expect(Object.keys(snap.targets).sort()).toEqual(['Kedi', 'stage']);
        expect(snap.targets.Kedi).toEqual({
            x: 60, y: 0, direction: 90, size: 100, visible: true, said: 'Merhaba', variables: {}
        });
        expect(snap.targets.stage.variables).toEqual({skor: 3});
    });
});

describe('evaluateExpectations', () => {
    const snap = () => snapshotVm(fakeVm());
    const exp = (prop, op, value, target) => ({target: target === undefined ? '' : target, prop, op, value});

    test('sayısal ve metin karşılaştırmaları', () => {
        const result = evaluateExpectations(snap(), [
            exp('x', 'gt', 50),
            exp('x', 'lt', 100),
            exp('x', 'eq', 60),
            exp('x', 'neq', 61),
            exp('said', 'contains', 'Merha'),
            exp('visible', 'eq', true),
            exp('direction', 'eq', 90, 'Kedi')
        ]);
        expect(result).toEqual({passed: true, failures: []});
    });

    test('değişken: hedefte yoksa sahnedeki global değişkene bakar', () => {
        expect(evaluateExpectations(snap(), [exp('variable:skor', 'eq', 3, 'stage')]).passed).toBe(true);
        expect(evaluateExpectations(snap(), [exp('variable:skor', 'eq', 3, 'Kedi')]).passed).toBe(true);
        expect(evaluateExpectations(snap(), [exp('variable:yok', 'eq', 3, 'Kedi')]).passed).toBe(false);
    });

    test('başarısız beklenti index ve Türkçe sebep döner', () => {
        const result = evaluateExpectations(snap(), [exp('x', 'eq', 60), exp('x', 'gt', 100)]);
        expect(result.passed).toBe(false);
        expect(result.failures).toHaveLength(1);
        expect(result.failures[0].index).toBe(1);
        expect(typeof result.failures[0].reason).toBe('string');
    });

    test('bilinmeyen hedef çökmez, hata olarak raporlanır', () => {
        const result = evaluateExpectations(snap(), [exp('x', 'eq', 1, 'Yok')]);
        expect(result.passed).toBe(false);
        expect(result.failures[0].reason).toContain('Yok');
    });

    test('sayısal metin sayıya eşit, boş metin eşit değil', () => {
        const vm = fakeVm();
        vm.runtime.targets[0].variables = {v1: {name: 'a', value: '3'}, v2: {name: 'b', value: ''}};
        const s = snapshotVm(vm);
        expect(evaluateExpectations(s, [exp('variable:a', 'eq', 3, 'stage')]).passed).toBe(true);
        expect(evaluateExpectations(s, [exp('variable:b', 'eq', 0, 'stage')]).passed).toBe(false);
    });

    test('küçük ondalık farkı tolere edilir', () => {
        const vm = fakeVm();
        vm.runtime.targets[1].x = 10.0000001;
        expect(evaluateExpectations(snapshotVm(vm), [exp('x', 'eq', 10)]).passed).toBe(true);
    });
});

describe('runOutcomeCheck', () => {
    const check = trigger => ({
        type: 'outcome',
        trigger: trigger,
        waitMs: 300,
        expect: [{target: '', prop: 'x', op: 'gt', value: 50}]
    });

    test('bayrak: çalıştırır, bekler, değerlendirir, durdurur', () => {
        const vm = fakeVm();
        const slept = [];
        return runOutcomeCheck(vm, check('flag'), {sleep: instantSleep(slept)}).then(result => {
            expect(result).toEqual({passed: true, failures: []});
            expect(vm.calls).toEqual(['flag', 'stop']);
            expect(slept).toEqual([300]);
        });
    });

    test('varsayılan bekleme 1000 ms', () => {
        const slept = [];
        const noWait = {type: 'outcome', trigger: 'none', expect: check('none').expect};
        return runOutcomeCheck(fakeVm(), noWait, {sleep: instantSleep(slept)}).then(() => {
            expect(slept).toEqual([1000]);
        });
    });

    test('tuş: basar, bırakır', () => {
        const vm = fakeVm();
        const slept = [];
        return runOutcomeCheck(vm, check({key: 'a'}), {sleep: instantSleep(slept)}).then(() => {
            expect(vm.calls).toEqual([['keyboard', 'a', true], ['keyboard', 'a', false], 'stop']);
            expect(slept).toEqual([50, 300]);
        });
    });

    test('Scratch tuş adları DOM tuşlarına çevrilir', () => {
        const vm = fakeVm();
        return runOutcomeCheck(vm, check({key: 'space'}), {sleep: instantSleep([])}).then(() => {
            expect(vm.calls[0]).toEqual(['keyboard', ' ', true]);
            expect(vm.calls[1]).toEqual(['keyboard', ' ', false]);
        });
    });

    test('ok tuşu ve enter adları çevrilir', () => {
        const vm = fakeVm();
        return runOutcomeCheck(vm, check({key: 'left arrow'}), {sleep: instantSleep([])})
            .then(() => runOutcomeCheck(vm, check({key: 'enter'}), {sleep: instantSleep([])}))
            .then(() => {
                expect(vm.calls).toEqual([
                    ['keyboard', 'ArrowLeft', true], ['keyboard', 'ArrowLeft', false], 'stop',
                    ['keyboard', 'Enter', true], ['keyboard', 'Enter', false], 'stop'
                ]);
            });
    });

    test('none: hiçbir şeyi başlatmaz', () => {
        const vm = fakeVm();
        return runOutcomeCheck(vm, check('none'), {sleep: instantSleep([])}).then(() => {
            expect(vm.calls).toEqual(['stop']);
        });
    });

    test('koşul sağlanmazsa passed false', () => {
        const failing = check('flag');
        failing.expect[0].value = 500;
        return runOutcomeCheck(fakeVm(), failing, {sleep: instantSleep([])}).then(result => {
            expect(result.passed).toBe(false);
            expect(result.failures).toHaveLength(1);
        });
    });

    test('greenFlag hata atarsa reddetmez, passed false ve stopAll çağrılır', () => {
        const vm = fakeVm({
            greenFlag: () => {
                throw new Error('patladı');
            }
        });
        return runOutcomeCheck(vm, check('flag'), {sleep: instantSleep([])}).then(result => {
            expect(result.passed).toBe(false);
            expect(result.failures[0].reason).toContain('patladı');
            expect(vm.calls).toEqual(['stop']);
        });
    });

    test('bekleme sırasında hata olursa da reddetmez', () => {
        const vm = fakeVm();
        return runOutcomeCheck(vm, check('flag'), {sleep: () => Promise.reject(new Error('iptal'))})
            .then(result => {
                expect(result.passed).toBe(false);
                expect(vm.calls).toEqual(['flag', 'stop']);
            });
    });

    test('stopAll de hata atarsa sonuç yine döner', () => {
        const vm = fakeVm({
            stopAll: () => {
                throw new Error('durdurulamadı');
            }
        });
        return runOutcomeCheck(vm, check('flag'), {sleep: instantSleep([])}).then(result => {
            expect(result.passed).toBe(true);
        });
    });
});
