/**
 * @fileoverview
 * Etkin ders adımının kontrollerini, proje değiştikçe (kısıtlanmış olarak)
 * çalıştırır. Kontrol çalışırken gelen istekler kaybolmaz: kontrol bitince bir
 * kez daha çalıştırılır. Kontrolün kendi ürettiği olaylar sonsuz döngü
 * yaratmasın diye, olaydan doğan yeniden çalıştırmalar zincirlenmez
 * (en çok bir ek çalıştırma); açık `check()` çağrıları (adım değişimi) ise her
 * zaman yeniden çalıştırılır.
 */

import {runStepChecks} from './check-runner';

const PROJECT_CHANGED = 'PROJECT_CHANGED';

const createStepWatcher = ({
    vm,
    getStep,
    onResult,
    throttleMs = 300,
    runChecks = runStepChecks,
    setTimer = setTimeout,
    clearTimer = clearTimeout
}) => {
    let timer = null;
    let running = false;
    let active = false;
    let dirty = false;
    let forced = false;
    let chained = false;

    const schedule = () => {
        if (timer === null) timer = setTimer(run, throttleMs); // eslint-disable-line no-use-before-define
    };

    const rerunIfDirty = () => {
        const again = active && dirty && (forced || !chained);
        chained = again && !forced;
        dirty = false;
        forced = false;
        if (again) schedule();
    };

    const settle = deliver => {
        running = false;
        deliver();
        rerunIfDirty();
    };

    const run = () => {
        timer = null;
        if (!active || running) return;
        const step = getStep();
        if (!step) return;
        running = true;
        runChecks(vm, step).then(
            result => settle(() => {
                if (active && getStep() === step && !result.manual) onResult(result, step);
            }),
            error => settle(() => {
                if (active && getStep() === step) {
                    onResult({passed: false, manual: false, results: [], error: error}, step);
                }
            })
        );
    };

    const request = isForced => {
        if (!active) return;
        if (running) {
            dirty = true;
            forced = forced || isForced;
            return;
        }
        if (timer === null) {
            chained = false;
            schedule();
        }
    };

    const check = () => request(true);
    const onProjectChanged = () => request(false);

    const start = () => {
        if (active) return;
        active = true;
        vm.runtime.on(PROJECT_CHANGED, onProjectChanged);
        check();
    };

    const stop = () => {
        active = false;
        dirty = false;
        forced = false;
        chained = false;
        vm.runtime.off(PROJECT_CHANGED, onProjectChanged);
        if (timer !== null) {
            clearTimer(timer);
            timer = null;
        }
    };

    return {start: start, stop: stop, check: check};
};

export {
    createStepWatcher
};
