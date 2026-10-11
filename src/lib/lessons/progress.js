/**
 * @fileoverview
 * Öğrencinin ders ilerlemesini tarayıcıda saklar. localStorage yoksa ya da
 * bozuksa bellekte çalışmaya devam eder, asla exception atmaz.
 */

const STORAGE_KEY = 'sarikedi.progress';
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const sanitize = entry => {
    const valid = entry !== null && typeof entry === 'object';
    const step = valid && Number.isInteger(entry.step) && entry.step >= 0 ? entry.step : 0;
    return {step: step, done: valid && entry.done === true};
};

const createProgressStore = storage => {
    let memory = {};

    const readAll = () => {
        try {
            const raw = storage ? storage.getItem(STORAGE_KEY) : null;
            if (raw) {
                const data = JSON.parse(raw);
                if (data !== null && typeof data === 'object' && !Array.isArray(data)) memory = data;
            }
        } catch (e) {
            // erişim yok ya da bozuk veri: bellekteki kopya kullanılır
        }
        return memory;
    };

    const get = lessonId => {
        if (!SLUG.test(lessonId)) return sanitize(null);
        const all = readAll();
        return sanitize(Object.prototype.hasOwnProperty.call(all, lessonId) ? all[lessonId] : null);
    };

    const write = all => {
        memory = all;
        try {
            if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(all));
        } catch (e) {
            // yazılamadı: ilerleme bu oturumda bellekte kalır
        }
    };

    const save = (lessonId, entry) => {
        if (!SLUG.test(lessonId)) return sanitize(null);
        const all = Object.assign({}, readAll());
        all[lessonId] = sanitize(entry);
        write(all);
        return all[lessonId];
    };

    const reset = lessonId => {
        if (!SLUG.test(lessonId)) return;
        const all = Object.assign({}, readAll());
        delete all[lessonId];
        write(all);
    };

    return {get: get, save: save, reset: reset};
};

const browserStorage = () => {
    try {
        return window.localStorage;
    } catch (e) {
        return null;
    }
};

const progress = createProgressStore(browserStorage());

export {
    createProgressStore,
    progress
};
