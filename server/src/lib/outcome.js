// ÜRETİLDİ: server/scripts/build-shared.js, kaynak: src/lib/lessons/outcome.js. Elle düzenleme.
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.snapshotVm = exports.runOutcomeCheck = exports.evaluateExpectations = exports.DEFAULT_WAIT_MS = void 0;
/**
 * @fileoverview
 * Sonuç kontrolü: projeyi çalıştırır, sahnenin durumuna bakar ve beklentileri
 * değerlendirir. `vm` benzeri bir nesne alır; asenkron işler Promise ile yapılır.
 */

const DEFAULT_WAIT_MS = exports.DEFAULT_WAIT_MS = 1000;
const KEY_HOLD_MS = 50;
const BUBBLE_STATE_KEY = 'Scratch.looks';
const EPSILON = 1e-6;

// Scratch'in tuş adları (menüde görünen) -> DOM KeyboardEvent.key değerleri
const SCRATCH_KEY_NAMES = {
  'space': ' ',
  'left arrow': 'ArrowLeft',
  'right arrow': 'ArrowRight',
  'up arrow': 'ArrowUp',
  'down arrow': 'ArrowDown',
  'enter': 'Enter'
};
const toDomKey = key => Object.prototype.hasOwnProperty.call(SCRATCH_KEY_NAMES, key) ? SCRATCH_KEY_NAMES[key] : key;
const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @param {object} vm scratch-vm örneği
 * @return {object} {selected, targets: {[ad]: {x, y, direction, size, visible, said, variables}}}
 */
const snapshotVm = vm => {
  const targets = {};
  vm.runtime.targets.forEach(target => {
    if (!target.isOriginal) return;
    const variables = {};
    Object.keys(target.variables).forEach(id => {
      variables[target.variables[id].name] = target.variables[id].value;
    });
    const bubble = target.getCustomState(BUBBLE_STATE_KEY);
    targets[target.isStage ? 'stage' : target.getName()] = {
      x: target.x,
      y: target.y,
      direction: target.direction,
      size: target.size,
      visible: target.visible,
      said: bubble && typeof bubble.text === 'string' ? bubble.text : '',
      variables: variables
    };
  });
  const editing = vm.editingTarget;
  const selected = editing ? editing.isStage ? 'stage' : editing.getName() : '';
  return {
    selected: selected,
    targets: targets
  };
};
exports.snapshotVm = snapshotVm;
const isNumeric = value => typeof value === 'number' || typeof value === 'string' && value.trim() !== '' && isFinite(Number(value));
const looseEquals = (actual, expected) => {
  if (typeof expected === 'number') {
    return isNumeric(actual) && Math.abs(Number(actual) - expected) < EPSILON;
  }
  if (typeof expected === 'boolean') return actual === expected;
  return String(actual) === String(expected);
};
const compare = (op, actual, expected) => {
  switch (op) {
    case 'eq':
      return looseEquals(actual, expected);
    case 'neq':
      return !looseEquals(actual, expected);
    case 'gt':
      return isNumeric(actual) && Number(actual) > expected;
    case 'lt':
      return isNumeric(actual) && Number(actual) < expected;
    case 'contains':
      return String(actual).indexOf(String(expected)) !== -1;
    default:
      return false;
  }
};
const readProp = (snapshot, state, prop) => {
  if (prop.indexOf('variable:') === 0) {
    const name = prop.slice('variable:'.length);
    if (Object.prototype.hasOwnProperty.call(state.variables, name)) return state.variables[name];
    const stage = snapshot.targets.stage;
    if (stage && Object.prototype.hasOwnProperty.call(stage.variables, name)) return stage.variables[name];
    return null;
  }
  return state[prop];
};

/**
 * @param {object} snapshot snapshotVm çıktısı
 * @param {Array} expectations [{target, prop, op, value}]
 * @return {object} {passed, failures: [{index, reason}]}
 */
const evaluateExpectations = (snapshot, expectations) => {
  const failures = [];
  expectations.forEach((exp, index) => {
    const name = exp.target || snapshot.selected;
    const state = snapshot.targets[name];
    if (!state) {
      failures.push({
        index: index,
        reason: `"${name}" adlı hedef bulunamadı`
      });
      return;
    }
    const actual = readProp(snapshot, state, exp.prop);
    if (typeof actual === 'undefined' || actual === null || !compare(exp.op, actual, exp.value)) {
      failures.push({
        index: index,
        reason: `${name}: ${exp.prop} ${exp.op} ${exp.value} beklendi, bulunan: ${actual}`
      });
    }
  });
  return {
    passed: failures.length === 0,
    failures: failures
  };
};
exports.evaluateExpectations = evaluateExpectations;
const startTrigger = (vm, trigger, sleep) => {
  if (trigger === 'flag') {
    vm.greenFlag();
    return Promise.resolve();
  }
  if (trigger && typeof trigger === 'object') {
    const key = toDomKey(trigger.key);
    vm.postIOData('keyboard', {
      key: key,
      isDown: true
    });
    return sleep(KEY_HOLD_MS).then(() => {
      vm.postIOData('keyboard', {
        key: key,
        isDown: false
      });
    });
  }
  return Promise.resolve();
};
const stopQuietly = vm => {
  try {
    vm.stopAll();
  } catch (e) {
    // durdurma hatası sonucu değiştirmez
  }
};

/**
 * Projeyi tetikler, bekler, durumu değerlendirir ve her durumda projeyi durdurur.
 * Hiçbir koşulda reddetmez.
 * @param {object} vm scratch-vm örneği
 * @param {object} check OutcomeCheck
 * @param {object} [options] sleep: test için bekleme fonksiyonu (ms) => Promise
 * @return {Promise<{passed: boolean, failures: Array}>} sonuç
 */
const runOutcomeCheck = (vm, check, options) => {
  const sleep = options && options.sleep || defaultSleep;
  const waitMs = typeof check.waitMs === 'number' ? check.waitMs : DEFAULT_WAIT_MS;
  return Promise.resolve().then(() => startTrigger(vm, check.trigger, sleep)).then(() => sleep(waitMs)).then(() => evaluateExpectations(snapshotVm(vm), check.expect)).then(result => {
    stopQuietly(vm);
    return result;
  }, error => {
    stopQuietly(vm);
    return {
      passed: false,
      failures: [{
        index: -1,
        reason: `Proje çalıştırılamadı: ${error && error.message}`
      }]
    };
  });
};
exports.runOutcomeCheck = runOutcomeCheck;
