// ÜRETİLDİ: server/scripts/build-shared.js, kaynak: src/lib/lessons/schema.js. Elle düzenleme.
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateLesson = exports.isSafeUrl = exports.UI_IDS = exports.LEVELS = void 0;
var _blockPattern = require("./block-pattern");
/**
 * @fileoverview
 * Ders JSON'unu doğrular. Saf fonksiyon: hiçbir girişte exception atmaz,
 * Türkçe hata mesajlarından oluşan bir liste döner.
 */

const LEVELS = exports.LEVELS = ['baslangic', 'orta', 'ileri'];
const UI_IDS = exports.UI_IDS = ['greenFlag', 'stop', 'stage', 'spriteList', 'costumesTab', 'soundsTab', 'codeTab', 'addSprite', 'addBackdrop', 'stageSelector'];
const OPS = ['eq', 'neq', 'gt', 'lt', 'contains'];
const SIMPLE_PROPS = ['x', 'y', 'direction', 'size', 'visible', 'said'];
const MAX_STEPS = 100;
const MAX_CHECKS = 10;
const MAX_GUIDE = 20;
const MAX_EXPECT = 10;
const MAX_NODES = 500;
const MAX_WAIT_MS = 10000;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SAFE_URL = /^(\/uploads\/[A-Za-z0-9._\-/]+|https:\/\/[^\s]+)$/;
const isDefined = value => typeof value !== 'undefined';
const isObj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value, min, max) => typeof value === 'string' && value.length >= min && value.length <= max;
const isSafeUrl = value => typeof value === 'string' && value.length <= 500 && SAFE_URL.test(value) && value.indexOf('..') === -1;
exports.isSafeUrl = isSafeUrl;
const validateUrlOrNull = (value, path, errors) => {
  if (value !== null && !isSafeUrl(value)) {
    errors.push(`${path}: null, "/uploads/..." ya da "https://..." adresi olmalı`);
  }
};
const validateValue = (value, path, errors) => {
  const ok = (0, _blockPattern.isAny)(value) || typeof value === 'string' || typeof value === 'number' && isFinite(value);
  if (!ok) errors.push(`${path}: metin, sayı ya da {any: true} olmalı`);
};
const validatePattern = (node, path, errors, state) => {
  if (!isObj(node)) {
    errors.push(`${path}: kalıp düğümü nesne olmalı`);
    return;
  }
  state.count += 1;
  if (state.count > MAX_NODES) {
    if (!state.tooBig) errors.push(`${path}: kalıp çok büyük (en çok ${MAX_NODES} blok)`);
    state.tooBig = true;
    return;
  }
  if (!isText(node.opcode, 1, 100)) errors.push(`${path}.opcode: gerekli`);
  if (isObj(node.fields)) {
    Object.keys(node.fields).forEach(name => validateValue(node.fields[name], `${path}.fields.${name}`, errors));
  } else {
    errors.push(`${path}.fields: nesne olmalı`);
  }
  if (isObj(node.inputs)) {
    Object.keys(node.inputs).forEach(name => {
      const input = node.inputs[name];
      const inputPath = `${path}.inputs.${name}`;
      if (isObj(input) && 'literal' in input) {
        validateValue(input.literal, `${inputPath}.literal`, errors);
      } else {
        validatePattern(input, inputPath, errors, state);
      }
    });
  } else {
    errors.push(`${path}.inputs: nesne olmalı`);
  }
  if (node.next !== null && isDefined(node.next)) {
    validatePattern(node.next, `${path}.next`, errors, state);
  }
};
const validateOutcome = (check, path, errors) => {
  const trigger = check.trigger;
  const triggerOk = trigger === 'flag' || trigger === 'none' || isObj(trigger) && isText(trigger.key, 1, 20);
  if (!triggerOk) errors.push(`${path}.trigger: "flag", "none" ya da {key: "a"} olmalı`);
  if (isDefined(check.waitMs) && !(Number.isInteger(check.waitMs) && check.waitMs >= 0 && check.waitMs <= MAX_WAIT_MS)) {
    errors.push(`${path}.waitMs: 0 ile ${MAX_WAIT_MS} arasında tamsayı olmalı`);
  }
  if (!Array.isArray(check.expect) || check.expect.length < 1 || check.expect.length > MAX_EXPECT) {
    errors.push(`${path}.expect: 1 ile ${MAX_EXPECT} arasında beklenti olmalı`);
    return;
  }
  check.expect.forEach((exp, i) => {
    const p = `${path}.expect[${i}]`;
    if (!isObj(exp)) {
      errors.push(`${p}: nesne olmalı`);
      return;
    }
    if (typeof exp.target !== 'string' || exp.target.length > 100) errors.push(`${p}.target: metin olmalı`);
    const propOk = SIMPLE_PROPS.indexOf(exp.prop) !== -1 || typeof exp.prop === 'string' && /^variable:.+/.test(exp.prop) && exp.prop.length <= 120;
    if (!propOk) errors.push(`${p}.prop: geçersiz özellik`);
    if (OPS.indexOf(exp.op) === -1) errors.push(`${p}.op: geçersiz karşılaştırma`);
    const valueType = typeof exp.value;
    if (['string', 'number', 'boolean'].indexOf(valueType) === -1) {
      errors.push(`${p}.value: metin, sayı ya da doğru/yanlış olmalı`);
    } else if ((exp.op === 'gt' || exp.op === 'lt') && !(valueType === 'number' && isFinite(exp.value))) {
      errors.push(`${p}.value: ${exp.op} için sayı olmalı`);
    } else if (exp.op === 'contains' && valueType !== 'string') {
      errors.push(`${p}.value: contains için metin olmalı`);
    }
  });
};
const validateCheck = (check, path, errors) => {
  if (!isObj(check)) {
    errors.push(`${path}: nesne olmalı`);
    return;
  }
  if (check.type === 'blocks') {
    if (isDefined(check.sprite) && !isText(check.sprite, 1, 100)) {
      errors.push(`${path}.sprite: 1-100 karakterlik kukla adı olmalı`);
    }
    if (isDefined(check.pattern)) {
      validatePattern(check.pattern, `${path}.pattern`, errors, {
        count: 0,
        tooBig: false
      });
    } else {
      errors.push(`${path}.pattern: gerekli`);
    }
  } else if (check.type === 'outcome') {
    validateOutcome(check, path, errors);
  } else {
    errors.push(`${path}.type: "blocks" ya da "outcome" olmalı`);
  }
};
const validateTarget = (target, path, errors) => {
  if (!isObj(target)) {
    errors.push(`${path}: hedef bir nesne olmalı`);
    return;
  }
  switch (target.kind) {
    case 'category':
      if (!isText(target.id, 1, 50)) errors.push(`${path}.id: gerekli`);
      break;
    case 'block':
    case 'workspaceBlock':
      if (!isText(target.opcode, 1, 100)) errors.push(`${path}.opcode: gerekli`);
      break;
    case 'ui':
      if (UI_IDS.indexOf(target.id) === -1) errors.push(`${path}.id: geçersiz arayüz kimliği`);
      break;
    case 'workspace':
      break;
    default:
      errors.push(`${path}.kind: bilinmeyen hedef türü`);
  }
};
const validateGuideAction = (action, path, errors) => {
  if (!isObj(action)) {
    errors.push(`${path}: nesne olmalı`);
    return;
  }
  if (isDefined(action.label) && !isText(action.label, 0, 100)) {
    errors.push(`${path}.label: en çok 100 karakter olmalı`);
  }
  if (action.type === 'click') {
    validateTarget(action.target, `${path}.target`, errors);
  } else if (action.type === 'drag') {
    validateTarget(action.from, `${path}.from`, errors);
    validateTarget(action.to, `${path}.to`, errors);
  } else {
    errors.push(`${path}.type: "click" ya da "drag" olmalı`);
  }
};
const validateArray = (list, max, path, errors, each) => {
  if (!Array.isArray(list) || list.length > max) {
    errors.push(`${path}: en çok ${max} öğeli bir dizi olmalı`);
    return;
  }
  list.forEach((item, i) => each(item, `${path}[${i}]`, errors));
};
const validateStep = (step, path, errors) => {
  if (!isObj(step)) {
    errors.push(`${path}: nesne olmalı`);
    return;
  }
  if (!isText(step.text, 1, 2000)) errors.push(`${path}.text: 1-2000 karakter olmalı`);
  if (isDefined(step.media)) validateUrlOrNull(step.media, `${path}.media`, errors);
  if (isDefined(step.hint) && step.hint !== null && !isText(step.hint, 1, 500)) {
    errors.push(`${path}.hint: null ya da en çok 500 karakter olmalı`);
  }
  validateArray(step.checks, MAX_CHECKS, `${path}.checks`, errors, validateCheck);
  if (isDefined(step.guide)) {
    validateArray(step.guide, MAX_GUIDE, `${path}.guide`, errors, validateGuideAction);
  }
};

/**
 * @param {*} lesson doğrulanacak ders (herhangi bir değer olabilir)
 * @return {{valid: boolean, errors: string[]}} sonuç
 */
const validateLesson = lesson => {
  const errors = [];
  if (!isObj(lesson)) {
    return {
      valid: false,
      errors: ['ders: nesne olmalı']
    };
  }
  if (!(isText(lesson.id, 1, 64) && SLUG.test(lesson.id))) {
    errors.push('id: küçük harf, rakam ve tire içeren en çok 64 karakter olmalı');
  }
  if (!isText(lesson.title, 1, 120)) errors.push('title: 1-120 karakter olmalı');
  if (!isText(lesson.description, 0, 1000)) errors.push('description: en çok 1000 karakter olmalı');
  if (LEVELS.indexOf(lesson.level) === -1) errors.push('level: baslangic, orta ya da ileri olmalı');
  validateUrlOrNull(lesson.cover, 'cover', errors);
  if (!(Number.isInteger(lesson.order) && lesson.order >= 0)) errors.push('order: 0 veya büyük tamsayı olmalı');
  if (typeof lesson.published !== 'boolean') errors.push('published: doğru/yanlış olmalı');
  validateUrlOrNull(lesson.startProject, 'startProject', errors);
  if (!Array.isArray(lesson.steps) || lesson.steps.length < 1 || lesson.steps.length > MAX_STEPS) {
    errors.push(`steps: 1 ile ${MAX_STEPS} arasında adım olmalı`);
  } else {
    lesson.steps.forEach((step, i) => validateStep(step, `steps[${i}]`, errors));
  }
  return {
    valid: errors.length === 0,
    errors: errors
  };
};
exports.validateLesson = validateLesson;
