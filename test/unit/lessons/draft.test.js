import {validateLesson} from '../../../src/lib/lessons/schema';
import {
    emptyStep, emptyLesson, slugify, addStep, removeStep, moveStep, updateStep, updateLesson,
    addCheck, replaceCheck, removeCheck, newOutcomeCheck, newGuideAction, paletteDragCount, appendRecordedStep
} from '../../../src/lib/lessons/draft';

const lessonWithSteps = texts => Object.assign(emptyLesson(), {
    id: 'deneme', title: 'Deneme', steps: texts.map(text => Object.assign(emptyStep(), {text}))
});

describe('slugify', () => {
    test('Türkçe karakterler ve boşluklar', () => {
        expect(slugify('Yıldız Yakala!')).toBe('yildiz-yakala');
        expect(slugify('  ÇĞİÖŞÜ çğıöşü  ')).toBe('cgiosu-cgiosu');
        expect(slugify('Top sektirme (Pong)')).toBe('top-sektirme-pong');
        expect(slugify('a---b___c')).toBe('a-b-c');
    });

    test('boş, sembol ve çok uzun girişler', () => {
        expect(slugify('')).toBe('');
        expect(slugify('!!!')).toBe('');
        expect(slugify(null)).toBe('');
        expect(slugify('a'.repeat(100)).length).toBe(64);
        expect(slugify('a'.repeat(63) + ' b')).toBe('a'.repeat(63));
    });

    test('sonuç şemadaki kimlik kuralına uyar', () => {
        ['Yıldız Yakala', 'Ders 2', 'Çok  Uzun   Başlık  —  Test'].forEach(title => {
            const lesson = Object.assign(emptyLesson(), {id: slugify(title), title: 'x'});
            lesson.steps[0].text = 'Bir adım metni';
            expect(validateLesson(lesson).errors.filter(e => e.indexOf('id:') === 0)).toEqual([]);
        });
    });
});

describe('emptyLesson / emptyStep', () => {
    test('yeni ders bir boş adım içerir ve yayında değildir', () => {
        const lesson = emptyLesson();
        expect(lesson.steps).toHaveLength(1);
        expect(lesson.published).toBe(false);
        expect(lesson.level).toBe('baslangic');
        expect(emptyStep()).toEqual({text: '', media: null, hint: null, checks: [], guide: []});
    });

    test('her çağrı bağımsız nesne döndürür', () => {
        expect(emptyLesson().steps[0]).not.toBe(emptyLesson().steps[0]);
    });
});

describe('adım işlemleri', () => {
    test('addStep sona ya da verilen yere ekler, girdiyi bozmaz', () => {
        const lesson = lessonWithSteps(['a', 'b']);
        const end = addStep(lesson);
        expect(end.steps.map(s => s.text)).toEqual(['a', 'b', '']);
        const middle = addStep(lesson, 1);
        expect(middle.steps.map(s => s.text)).toEqual(['a', '', 'b']);
        expect(lesson.steps).toHaveLength(2);
    });

    test('removeStep son adımı silmez', () => {
        const lesson = lessonWithSteps(['a', 'b']);
        expect(removeStep(lesson, 0).steps.map(s => s.text)).toEqual(['b']);
        const single = lessonWithSteps(['a']);
        expect(removeStep(single, 0)).toBe(single);
        expect(removeStep(lesson, 9)).toBe(lesson);
        expect(removeStep(lesson, -1)).toBe(lesson);
    });

    test('moveStep yer değiştirir, sınırda aynen döner', () => {
        const lesson = lessonWithSteps(['a', 'b', 'c']);
        expect(moveStep(lesson, 0, 1).steps.map(s => s.text)).toEqual(['b', 'a', 'c']);
        expect(moveStep(lesson, 2, -1).steps.map(s => s.text)).toEqual(['a', 'c', 'b']);
        expect(moveStep(lesson, 0, -1)).toBe(lesson);
        expect(moveStep(lesson, 2, 1)).toBe(lesson);
    });

    test('updateStep / updateLesson yama uygular', () => {
        const lesson = lessonWithSteps(['a', 'b']);
        const next = updateStep(lesson, 1, {text: 'yeni', hint: 'ipucu'});
        expect(next.steps[1]).toEqual(Object.assign(emptyStep(), {text: 'yeni', hint: 'ipucu'}));
        expect(lesson.steps[1].text).toBe('b');
        expect(updateStep(lesson, 5, {text: 'x'})).toBe(lesson);
        expect(updateLesson(lesson, {title: 'Yeni'}).title).toBe('Yeni');
        expect(lesson.title).toBe('Deneme');
    });
});

describe('kontrol işlemleri', () => {
    test('ekle, değiştir, sil', () => {
        let lesson = lessonWithSteps(['a']);
        lesson = addCheck(lesson, 0, newOutcomeCheck());
        lesson = addCheck(lesson, 0, {type: 'blocks', pattern: {opcode: 'x', fields: {}, inputs: {}, next: null}});
        expect(lesson.steps[0].checks.map(c => c.type)).toEqual(['outcome', 'blocks']);
        lesson = replaceCheck(lesson, 0, 0, Object.assign(newOutcomeCheck(), {waitMs: 900}));
        expect(lesson.steps[0].checks[0].waitMs).toBe(900);
        lesson = removeCheck(lesson, 0, 1);
        expect(lesson.steps[0].checks).toHaveLength(1);
        expect(removeCheck(lesson, 0, 7)).toBe(lesson);
        expect(replaceCheck(lesson, 3, 0, newOutcomeCheck())).toBe(lesson);
    });

    test('yeni sonuç kontrolü şemaya uygundur', () => {
        const lesson = addCheck(lessonWithSteps(['Bir adım metni']), 0, newOutcomeCheck());
        lesson.id = 'deneme';
        expect(validateLesson(lesson).errors).toEqual([]);
    });
});

describe('rehber', () => {
    test('yeni eylemler şemaya uygundur', () => {
        const lesson = lessonWithSteps(['Bir adım metni']);
        lesson.steps[0].guide = [newGuideAction('click'), newGuideAction('drag')];
        expect(validateLesson(lesson).errors).toEqual([]);
        expect(newGuideAction('click').type).toBe('click');
        expect(newGuideAction('drag').type).toBe('drag');
    });

    test('paletteDragCount yalnızca palet bloğu sürüklemelerini sayar', () => {
        const step = Object.assign(emptyStep(), {guide: [
            {type: 'drag', from: {kind: 'block', opcode: 'a'}, to: {kind: 'workspace'}},
            {type: 'drag', from: {kind: 'workspaceBlock', opcode: 'b'}, to: {kind: 'workspace'}},
            {type: 'click', target: {kind: 'category', id: 'motion'}},
            {type: 'drag', from: {kind: 'block', opcode: 'c'}, to: {kind: 'workspace'}}
        ]});
        expect(paletteDragCount(step)).toBe(2);
        expect(paletteDragCount(emptyStep())).toBe(0);
    });
});

describe('appendRecordedStep', () => {
    const recorded = Object.assign(emptyStep(), {text: 'Kayıtlı adım'});

    test('tek boş adım varsa onun yerine geçer', () => {
        const lesson = emptyLesson();
        const next = appendRecordedStep(lesson, recorded);
        expect(next.steps).toEqual([recorded]);
        expect(lesson.steps).toHaveLength(1);
        expect(lesson.steps[0].text).toBe('');
    });

    test('son adım doluysa sona eklenir', () => {
        const lesson = lessonWithSteps(['Birinci']);
        const next = appendRecordedStep(lesson, recorded);
        expect(next.steps.map(step => step.text)).toEqual(['Birinci', 'Kayıtlı adım']);
    });

    test('sondaki boş adım kayıtla değiştirilir, aradaki boş adımlar korunur', () => {
        const lesson = lessonWithSteps(['Birinci', '', '']);
        const next = appendRecordedStep(lesson, recorded);
        expect(next.steps.map(step => step.text)).toEqual(['Birinci', '', 'Kayıtlı adım']);
    });
});
