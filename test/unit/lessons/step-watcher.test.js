import {createStepWatcher} from '../../../src/lib/lessons/step-watcher';

const makeVm = () => {
    const handlers = [];
    return {
        handlers: handlers,
        runtime: {
            on: (name, fn) => handlers.push([name, fn]),
            off: (name, fn) => {
                const i = handlers.findIndex(h => h[0] === name && h[1] === fn);
                if (i !== -1) handlers.splice(i, 1);
            }
        },
        emit: () => handlers.filter(h => h[0] === 'PROJECT_CHANGED').forEach(h => h[1]())
    };
};

// elle ilerletilen sahte zamanlayıcı
const makeTimers = () => {
    const pending = [];
    return {
        setTimer: fn => {
            pending.push(fn);
            return pending.length;
        },
        clearTimer: id => {
            pending[id - 1] = null;
        },
        flush: () => {
            const fns = pending.splice(0).filter(Boolean);
            fns.forEach(fn => fn());
        },
        count: () => pending.filter(Boolean).length
    };
};

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('createStepWatcher', () => {
    const step = {checks: [{type: 'blocks'}]};

    test('start bir kontrol zamanlar; zamanlayıcı dolunca çalışır ve sonucu bildirir', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const onResult = jest.fn();
        const runChecks = jest.fn(() => Promise.resolve({passed: true, manual: false, results: []}));
        const watcher = createStepWatcher({vm, getStep: () => step, onResult, runChecks, ...timers});
        watcher.start();
        expect(runChecks).not.toHaveBeenCalled();
        timers.flush();
        return settle().then(() => {
            expect(runChecks).toHaveBeenCalledWith(vm, step);
            expect(onResult).toHaveBeenCalledWith({passed: true, manual: false, results: []}, step);
        });
    });

    test('proje değişiklikleri art arda gelirse tek kontrol zamanlanır (kısıtlama)', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const watcher = createStepWatcher({
            vm, getStep: () => step, onResult: jest.fn(),
            runChecks: () => Promise.resolve({passed: false, manual: false, results: []}), ...timers
        });
        watcher.start();
        vm.emit();
        vm.emit();
        vm.emit();
        expect(timers.count()).toBe(1);
    });

    test('kontrol sürerken gelen olaylar yok sayılır, aynı anda tek kontrol çalışır', () => {
        const vm = makeVm();
        const timers = makeTimers();
        let release;
        const runChecks = jest.fn(() => new Promise(resolve => {
            release = () => resolve({passed: false, manual: false, results: []});
        }));
        const watcher = createStepWatcher({vm, getStep: () => step, onResult: jest.fn(), runChecks, ...timers});
        watcher.start();
        timers.flush();
        expect(runChecks).toHaveBeenCalledTimes(1);
        vm.emit();
        watcher.check();
        expect(timers.count()).toBe(0);
        release();
        return settle().then(() => {
            vm.emit();
            expect(timers.count()).toBe(1);
        });
    });

    test('manuel adım (kontrolsüz) bildirilmez', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const onResult = jest.fn();
        const watcher = createStepWatcher({
            vm, getStep: () => ({checks: []}), onResult,
            runChecks: () => Promise.resolve({passed: false, manual: true, results: []}), ...timers
        });
        watcher.start();
        timers.flush();
        return settle().then(() => expect(onResult).not.toHaveBeenCalled());
    });

    test('adım yoksa kontrol çalışmaz', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const runChecks = jest.fn();
        const watcher = createStepWatcher({vm, getStep: () => null, onResult: jest.fn(), runChecks, ...timers});
        watcher.start();
        timers.flush();
        expect(runChecks).not.toHaveBeenCalled();
    });

    test('kontrol sürerken adım değişirse eski sonuç yok sayılır', () => {
        const vm = makeVm();
        const timers = makeTimers();
        let current = {checks: [{type: 'blocks'}]};
        let release;
        const onResult = jest.fn();
        const runChecks = () => new Promise(resolve => {
            release = () => resolve({passed: true, manual: false, results: []});
        });
        const watcher = createStepWatcher({vm, getStep: () => current, onResult, runChecks, ...timers});
        watcher.start();
        timers.flush();
        current = {checks: [{type: 'outcome'}]};
        release();
        return settle().then(() => expect(onResult).not.toHaveBeenCalled());
    });

    test('stop dinlemeyi ve bekleyen kontrolü bırakır, sonuç bildirilmez', () => {
        const vm = makeVm();
        const timers = makeTimers();
        let release;
        const onResult = jest.fn();
        const runChecks = () => new Promise(resolve => {
            release = () => resolve({passed: true, manual: false, results: []});
        });
        const watcher = createStepWatcher({vm, getStep: () => step, onResult, runChecks, ...timers});
        watcher.start();
        timers.flush();
        watcher.stop();
        expect(vm.handlers).toHaveLength(0);
        release();
        return settle().then(() => {
            expect(onResult).not.toHaveBeenCalled();
            watcher.check();
            expect(timers.count()).toBe(0);
        });
    });

    test('stop zamanlanmış kontrolü iptal eder', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const watcher = createStepWatcher({
            vm, getStep: () => step, onResult: jest.fn(), runChecks: jest.fn(), ...timers
        });
        watcher.start();
        watcher.stop();
        expect(timers.count()).toBe(0);
    });

    test('runChecks reddederse hata sonucu bildirilir', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const onResult = jest.fn();
        const watcher = createStepWatcher({
            vm, getStep: () => step, onResult, runChecks: () => Promise.reject(new Error('patladı')), ...timers
        });
        watcher.start();
        timers.flush();
        return settle().then(() => {
            expect(onResult).toHaveBeenCalledTimes(1);
            expect(onResult.mock.calls[0][0]).toEqual(expect.objectContaining({passed: false, manual: false}));
            expect(onResult.mock.calls[0][0].error.message).toBe('patladı');
        });
    });

    test('check() tek başına bir kontrol zamanlar', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const watcher = createStepWatcher({
            vm, getStep: () => step, onResult: jest.fn(),
            runChecks: () => Promise.resolve({passed: false, manual: false, results: []}), ...timers
        });
        watcher.start();
        timers.flush();
        return settle().then(() => {
            watcher.check();
            expect(timers.count()).toBe(1);
        });
    });

    test('kontrol sürerken yapılan düzeltme bitince yeniden kontrol edilir', () => {
        const vm = makeVm();
        const timers = makeTimers();
        let release;
        const runChecks = jest.fn(() => new Promise(resolve => {
            release = () => resolve({passed: false, manual: false, results: []});
        }));
        const watcher = createStepWatcher({vm, getStep: () => step, onResult: jest.fn(), runChecks, ...timers});
        watcher.start();
        timers.flush();
        vm.emit();
        expect(timers.count()).toBe(0);
        release();
        return settle().then(() => {
            expect(timers.count()).toBe(1);
            timers.flush();
            expect(runChecks).toHaveBeenCalledTimes(2);
        });
    });

    test('kontrol sürerken adım değişirse eski sonuç atılır ama yeni adım kontrol edilir', () => {
        const vm = makeVm();
        const timers = makeTimers();
        let current = {checks: [{type: 'blocks'}]};
        let release;
        const onResult = jest.fn();
        const runChecks = jest.fn(() => new Promise(resolve => {
            release = () => resolve({passed: true, manual: false, results: []});
        }));
        const watcher = createStepWatcher({vm, getStep: () => current, onResult, runChecks, ...timers});
        watcher.start();
        timers.flush();
        current = {checks: [{type: 'outcome'}]};
        watcher.check();
        release();
        return settle().then(() => {
            expect(onResult).not.toHaveBeenCalled();
            expect(timers.count()).toBe(1);
        });
    });

    test('kontrolün kendi ürettiği olaylar sonsuz döngü yaratmaz (en çok bir ek çalıştırma)', () => {
        const vm = makeVm();
        const timers = makeTimers();
        const runChecks = jest.fn(() => {
            vm.emit();
            return Promise.resolve({passed: false, manual: false, results: []});
        });
        const watcher = createStepWatcher({vm, getStep: () => step, onResult: jest.fn(), runChecks, ...timers});
        watcher.start();
        const round = n => {
            timers.flush();
            return settle().then(() => (n > 1 ? round(n - 1) : null));
        };
        return round(5).then(() => {
            expect(runChecks).toHaveBeenCalledTimes(2);
            expect(timers.count()).toBe(0);
        });
    });

    test('stop bekleyen yeniden kontrolü de iptal eder', () => {
        const vm = makeVm();
        const timers = makeTimers();
        let release;
        const runChecks = () => new Promise(resolve => {
            release = () => resolve({passed: false, manual: false, results: []});
        });
        const watcher = createStepWatcher({vm, getStep: () => step, onResult: jest.fn(), runChecks, ...timers});
        watcher.start();
        timers.flush();
        vm.emit();
        watcher.stop();
        release();
        return settle().then(() => expect(timers.count()).toBe(0));
    });
});
