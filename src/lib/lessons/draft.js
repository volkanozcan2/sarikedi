/**
 * @fileoverview
 * Taslak ders üzerinde saf, değişmez (immutable) düzenleme işlemleri.
 * Geçersiz indekste girdi aynen döndürülür; hiçbir işlem girdiyi değiştirmez.
 */

const MAX_ID_LENGTH = 64;
const TURKISH = {ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c'};

const emptyStep = () => ({text: '', media: null, hint: null, checks: [], guide: []});

const emptyLesson = () => ({
    id: '',
    title: '',
    description: '',
    level: 'baslangic',
    cover: null,
    order: 0,
    published: false,
    startProject: null,
    steps: [emptyStep()]
});

/**
 * @param {?string} title ders başlığı
 * @return {string} küçük harf, rakam ve tire içeren kimlik (en çok 64 karakter)
 */
const slugify = title => {
    if (typeof title !== 'string') return '';
    const ascii = title.replace(/[ıİşŞğĞüÜöÖçÇ]/g, char => TURKISH[char]);
    const slug = ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug.slice(0, MAX_ID_LENGTH).replace(/-+$/, '');
};

const inRange = (list, index) => Number.isInteger(index) && index >= 0 && index < list.length;

const withSteps = (lesson, steps) => Object.assign({}, lesson, {steps: steps});

const addStep = (lesson, index) => {
    const steps = lesson.steps.slice();
    const at = Number.isInteger(index) && index >= 0 && index <= steps.length ? index : steps.length;
    steps.splice(at, 0, emptyStep());
    return withSteps(lesson, steps);
};

const removeStep = (lesson, index) => {
    if (!inRange(lesson.steps, index) || lesson.steps.length === 1) return lesson;
    return withSteps(lesson, lesson.steps.filter((step, i) => i !== index));
};

const moveStep = (lesson, index, delta) => {
    const target = index + delta;
    if (!inRange(lesson.steps, index) || !inRange(lesson.steps, target)) return lesson;
    const steps = lesson.steps.slice();
    const moved = steps.splice(index, 1)[0];
    steps.splice(target, 0, moved);
    return withSteps(lesson, steps);
};

const updateStep = (lesson, index, patch) => {
    if (!inRange(lesson.steps, index)) return lesson;
    return withSteps(lesson, lesson.steps.map((step, i) => (i === index ? Object.assign({}, step, patch) : step)));
};

const updateLesson = (lesson, patch) => Object.assign({}, lesson, patch);

const addCheck = (lesson, stepIndex, check) => {
    if (!inRange(lesson.steps, stepIndex)) return lesson;
    return updateStep(lesson, stepIndex, {checks: lesson.steps[stepIndex].checks.concat([check])});
};

const replaceCheck = (lesson, stepIndex, checkIndex, check) => {
    if (!inRange(lesson.steps, stepIndex) || !inRange(lesson.steps[stepIndex].checks, checkIndex)) return lesson;
    return updateStep(lesson, stepIndex, {
        checks: lesson.steps[stepIndex].checks.map((c, i) => (i === checkIndex ? check : c))
    });
};

const removeCheck = (lesson, stepIndex, checkIndex) => {
    if (!inRange(lesson.steps, stepIndex) || !inRange(lesson.steps[stepIndex].checks, checkIndex)) return lesson;
    return updateStep(lesson, stepIndex, {
        checks: lesson.steps[stepIndex].checks.filter((c, i) => i !== checkIndex)
    });
};

const newOutcomeCheck = () => ({
    type: 'outcome',
    trigger: 'flag',
    waitMs: 500,
    expect: [{target: '', prop: 'x', op: 'gt', value: 0}]
});

const newGuideAction = type => (type === 'drag' ?
    {type: 'drag', from: {kind: 'block', opcode: 'motion_movesteps'}, to: {kind: 'workspace'}} :
    {type: 'click', target: {kind: 'category', id: 'motion'}});

const isBlankStep = step => !step.text && !step.hint && !step.media &&
    step.checks.length === 0 && step.guide.length === 0;

/**
 * Kayıt modunda üretilen adımı sona ekler; sondaki boş adım varsa onun yerine geçer.
 * @param {object} lesson taslak ders
 * @param {object} step kaydedilen adım
 * @return {object} yeni taslak
 */
const appendRecordedStep = (lesson, step) => {
    const last = lesson.steps[lesson.steps.length - 1];
    const kept = isBlankStep(last) ? lesson.steps.slice(0, -1) : lesson.steps;
    return withSteps(lesson, kept.concat([step]));
};

const paletteDragCount = step => step.guide.filter(a => a.type === 'drag' && a.from.kind === 'block').length;

export {
    emptyStep,
    emptyLesson,
    slugify,
    addStep,
    removeStep,
    moveStep,
    updateStep,
    updateLesson,
    addCheck,
    replaceCheck,
    removeCheck,
    newOutcomeCheck,
    newGuideAction,
    paletteDragCount,
    appendRecordedStep
};
