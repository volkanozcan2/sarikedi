/**
 * @fileoverview
 * Bir ders adımının tüm kontrollerini çalıştırır. Önce blok kontrolleri;
 * biri başarısızsa sonuç kontrolleri çalıştırılmaz (proje başlatılmaz).
 */

import {workspaceMatches} from './block-pattern';
import {runOutcomeCheck} from './outcome';

/**
 * @param {object} vm scratch-vm örneği
 * @param {object} step ders adımı ({checks: [...]})
 * @param {object} [options] runOutcomeCheck'e iletilir (örn. sleep)
 * @return {Promise<{passed: boolean, manual: boolean, results: Array}>} sonuç
 */
const runStepChecks = (vm, step, options) => {
    const checks = (step && step.checks) || [];
    if (checks.length === 0) {
        return Promise.resolve({passed: false, manual: true, results: []});
    }

    const results = [];
    checks.forEach(check => {
        if (check.type === 'blocks') {
            results.push({type: 'blocks', passed: workspaceMatches(vm, check.pattern, check.sprite)});
        } else if (check.type !== 'outcome') {
            results.push({type: check.type, passed: false});
        }
    });

    const outcomeChecks = checks.filter(check => check.type === 'outcome');
    if (results.some(result => !result.passed)) {
        outcomeChecks.forEach(() => results.push({type: 'outcome', passed: false, skipped: true}));
        return Promise.resolve({passed: false, manual: false, results: results});
    }

    return outcomeChecks
        .reduce((chain, check) => chain.then(() => runOutcomeCheck(vm, check, options).then(outcome => {
            results.push(Object.assign({type: 'outcome'}, outcome));
        })), Promise.resolve())
        .then(() => ({
            passed: results.every(result => result.passed),
            manual: false,
            results: results
        }));
};

export {
    runStepChecks
};
