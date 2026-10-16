import {Interpolator} from './interpolation';

const KEY = 'sarikedi.performance';
const DEFAULTS = {fps60: false, interpolation: false};

const safeStorage = () => {
    try {
        return window.localStorage;
    } catch (e) {
        return null;
    }
};

const load = storage => {
    try {
        const saved = JSON.parse(storage.getItem(KEY));
        return {fps60: saved.fps60 === true, interpolation: saved.interpolation === true};
    } catch (e) {
        return Object.assign({}, DEFAULTS);
    }
};

// 60 FPS ve ara değer ayarları. 60 FPS: VM'in uyumluluk (30 FPS) modunu kapatır.
// Ara değer: 30 FPS çalışırken kareler arası hareketi akıcı çizer.
const createPerformance = (vm, options = {}) => {
    const storage = options.storage || safeStorage();
    const interpolator = options.interpolator || new Interpolator(vm);
    const listeners = [];
    let state = storage ? load(storage) : Object.assign({}, DEFAULTS);

    const apply = () => {
        vm.setCompatibilityMode(!state.fps60);
        if (state.interpolation) interpolator.enable();
        else interpolator.disable();
    };
    const set = changes => {
        state = Object.assign({}, state, changes);
        try {
            if (storage) storage.setItem(KEY, JSON.stringify(state));
        } catch (e) {
            // saklanamazsa ayar yalnızca bu oturumda geçerli olur
        }
        apply();
        listeners.slice().forEach(listener => listener(Object.assign({}, state)));
    };
    return {
        get: () => Object.assign({}, state),
        set: set,
        apply: apply,
        subscribe: listener => {
            listeners.push(listener);
            return () => {
                const index = listeners.indexOf(listener);
                if (index >= 0) listeners.splice(index, 1);
            };
        }
    };
};

const instances = new WeakMap();

const getPerformance = vm => {
    if (!instances.has(vm)) instances.set(vm, createPerformance(vm));
    return instances.get(vm);
};

export {createPerformance, getPerformance};
