import {createPerformance} from '../../../src/lib/performance-settings';

const makeStorage = initial => {
    const data = Object.assign({}, initial);
    return {
        getItem: key => (key in data ? data[key] : null),
        setItem: (key, value) => {
            data[key] = value;
        },
        data: data
    };
};

const makeVm = () => ({runtime: {compatibilityMode: true, _step: () => {}}, setCompatibilityMode: jest.fn()});
const makeInterpolator = () => ({enable: jest.fn(), disable: jest.fn()});

describe('performance settings', () => {
    test('varsayılan: 30 FPS, ara değer kapalı', () => {
        const perf = createPerformance(makeVm(), {storage: makeStorage(), interpolator: makeInterpolator()});
        expect(perf.get()).toEqual({fps60: false, interpolation: false});
    });

    test('60 FPS açılınca uyumluluk modu kapanır', () => {
        const vm = makeVm();
        const perf = createPerformance(vm, {storage: makeStorage(), interpolator: makeInterpolator()});
        perf.set({fps60: true});
        expect(vm.setCompatibilityMode).toHaveBeenLastCalledWith(false);
        perf.set({fps60: false});
        expect(vm.setCompatibilityMode).toHaveBeenLastCalledWith(true);
    });

    test('ara değer ayarı yorumlayıcıyı açıp kapatır', () => {
        const interpolator = makeInterpolator();
        const perf = createPerformance(makeVm(), {storage: makeStorage(), interpolator: interpolator});
        perf.set({interpolation: true});
        expect(interpolator.enable).toHaveBeenCalled();
        perf.set({interpolation: false});
        expect(interpolator.disable).toHaveBeenCalled();
    });

    test('ayarlar saklanır ve apply ile geri uygulanır', () => {
        const storage = makeStorage();
        createPerformance(makeVm(), {storage: storage, interpolator: makeInterpolator()})
            .set({fps60: true, interpolation: true});
        const vm = makeVm();
        const interpolator = makeInterpolator();
        const perf = createPerformance(vm, {storage: storage, interpolator: interpolator});
        perf.apply();
        expect(perf.get()).toEqual({fps60: true, interpolation: true});
        expect(vm.setCompatibilityMode).toHaveBeenCalledWith(false);
        expect(interpolator.enable).toHaveBeenCalled();
    });

    test('dinleyiciler değişiklikte haberdar edilir', () => {
        const perf = createPerformance(makeVm(), {storage: makeStorage(), interpolator: makeInterpolator()});
        const listener = jest.fn();
        const unsubscribe = perf.subscribe(listener);
        perf.set({fps60: true});
        expect(listener).toHaveBeenCalledWith({fps60: true, interpolation: false});
        unsubscribe();
        perf.set({fps60: false});
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('bozuk saklanmış veri varsayılanlara döner', () => {
        const storage = makeStorage({'sarikedi.performance': '{bozuk'});
        const perf = createPerformance(makeVm(), {storage: storage, interpolator: makeInterpolator()});
        expect(perf.get()).toEqual({fps60: false, interpolation: false});
    });
});
