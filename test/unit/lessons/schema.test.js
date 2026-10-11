import {validateLesson} from '../../../src/lib/lessons/schema';

const pattern = () => ({
    opcode: 'motion_movesteps',
    fields: {},
    inputs: {STEPS: {literal: {any: true}}},
    next: null
});

const validLesson = () => ({
    id: 'ilk-ders',
    title: 'İlk dersim',
    description: 'Kediyi yürüt',
    level: 'baslangic',
    cover: '/uploads/kapak.png',
    order: 0,
    published: true,
    startProject: null,
    steps: [
        {
            text: 'Hareket kategorisine tıkla',
            media: null,
            hint: null,
            checks: [],
            guide: [{type: 'click', target: {kind: 'category', id: 'motion'}, label: 'Buraya tıkla'}]
        },
        {
            text: 'Bloğu sürükle',
            media: 'https://ornek.com/a.gif',
            hint: 'Mavi blok',
            checks: [
                {type: 'blocks', pattern: pattern()},
                {
                    type: 'outcome',
                    trigger: 'flag',
                    waitMs: 500,
                    expect: [{target: '', prop: 'x', op: 'gt', value: 5}]
                }
            ],
            guide: [{
                type: 'drag',
                from: {kind: 'block', opcode: 'motion_movesteps'},
                to: {kind: 'workspace'}
            }]
        }
    ]
});

const errorsOf = lesson => validateLesson(lesson).errors.join('\n');

describe('validateLesson', () => {
    test('geçerli ders kabul edilir', () => {
        expect(validateLesson(validLesson())).toEqual({valid: true, errors: []});
    });

    test('guide alanı isteğe bağlıdır', () => {
        const lesson = validLesson();
        delete lesson.steps[0].guide;
        expect(validateLesson(lesson).valid).toBe(true);
    });

    test('bozuk girişlerde atmaz, hata döner', () => {
        [null, undefined, [], 5, 'x', {}].forEach(input => {
            const result = validateLesson(input);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    test('geçersiz id, seviye, boş başlık ve adımsız ders reddedilir', () => {
        const lesson = validLesson();
        lesson.id = 'Büyük Harf';
        lesson.level = 'uzman';
        lesson.title = '';
        lesson.steps = [];
        const text = errorsOf(lesson);
        expect(text).toContain('id:');
        expect(text).toContain('level:');
        expect(text).toContain('title:');
        expect(text).toContain('steps:');
    });

    test('100 adımdan fazlası reddedilir', () => {
        const lesson = validLesson();
        lesson.steps = [];
        for (let i = 0; i < 101; i++) lesson.steps.push({text: 'x', checks: []});
        expect(errorsOf(lesson)).toContain('steps:');
    });

    test('tehlikeli adresler reddedilir', () => {
        ['javascript:alert(1)', 'data:text/html,x', '/uploads/../etc/passwd', 'http://ornek.com/a.png', 'a.png']
            .forEach(url => {
                const lesson = validLesson();
                lesson.cover = url;
                lesson.startProject = url;
                lesson.steps[0].media = url;
                const text = errorsOf(lesson);
                expect(text).toContain('cover:');
                expect(text).toContain('startProject:');
                expect(text).toContain('steps[0].media:');
            });
    });

    test('bilinmeyen kontrol türü ve eksik kalıp reddedilir', () => {
        const lesson = validLesson();
        lesson.steps[1].checks = [{type: 'sihir'}, {type: 'blocks'}];
        const text = errorsOf(lesson);
        expect(text).toContain('steps[1].checks[0].type:');
        expect(text).toContain('steps[1].checks[1].pattern:');
    });

    test('blok kontrolünde isteğe bağlı kukla adı doğrulanır', () => {
        const ok = validLesson();
        ok.steps[1].checks[0].sprite = 'Star';
        expect(validateLesson(ok).valid).toBe(true);
        [5, '', 'x'.repeat(101), null].forEach(sprite => {
            const bad = validLesson();
            bad.steps[1].checks[0].sprite = sprite;
            expect(errorsOf(bad)).toContain('steps[1].checks[0].sprite:');
        });
    });

    test('501 düğümlük kalıp reddedilir ve çökmez', () => {
        const lesson = validLesson();
        let node = pattern();
        const root = node;
        for (let i = 0; i < 500; i++) {
            node.next = pattern();
            node = node.next;
        }
        lesson.steps[1].checks = [{type: 'blocks', pattern: root}];
        expect(errorsOf(lesson)).toContain('kalıp çok büyük');
    });

    test('kalıpta geçersiz değer türü reddedilir', () => {
        const lesson = validLesson();
        const bad = pattern();
        bad.fields = {KEY_OPTION: true};
        bad.inputs = {STEPS: {literal: {nested: 1}}};
        lesson.steps[1].checks = [{type: 'blocks', pattern: bad}];
        const text = errorsOf(lesson);
        expect(text).toContain('pattern.fields.KEY_OPTION');
        expect(text).toContain('pattern.inputs.STEPS.literal');
    });

    test('sonuç kontrolü kuralları', () => {
        const lesson = validLesson();
        lesson.steps[1].checks = [{
            type: 'outcome',
            trigger: 'fare',
            waitMs: 99999,
            expect: [
                {target: '', prop: 'renk', op: 'eq', value: 1},
                {target: '', prop: 'x', op: 'gt', value: 'abc'},
                {target: '', prop: 'said', op: 'contains', value: 5},
                {target: '', prop: 'variable:', op: 'eq', value: 1}
            ]
        }];
        const text = errorsOf(lesson);
        expect(text).toContain('trigger:');
        expect(text).toContain('waitMs:');
        expect(text).toContain('expect[0].prop:');
        expect(text).toContain('expect[1].value:');
        expect(text).toContain('expect[2].value:');
        expect(text).toContain('expect[3].prop:');
    });

    test('tuş tetiği ve değişken beklentisi kabul edilir', () => {
        const lesson = validLesson();
        lesson.steps[1].checks = [{
            type: 'outcome',
            trigger: {key: 'a'},
            expect: [{target: 'stage', prop: 'variable:skor', op: 'eq', value: 3}]
        }];
        expect(validateLesson(lesson).valid).toBe(true);
    });

    test('beklentisiz sonuç kontrolü reddedilir', () => {
        const lesson = validLesson();
        lesson.steps[1].checks = [{type: 'outcome', trigger: 'flag', expect: []}];
        expect(errorsOf(lesson)).toContain('expect:');
    });

    test('rehber hedefleri doğrulanır', () => {
        const lesson = validLesson();
        lesson.steps[0].guide = [
            {type: 'click', target: {kind: 'ui', id: 'yok'}},
            {type: 'click', target: {kind: 'uzay'}},
            {type: 'drag', from: {kind: 'block'}},
            {type: 'sallan', target: {kind: 'workspace'}}
        ];
        const text = errorsOf(lesson);
        expect(text).toContain('guide[0].target.id:');
        expect(text).toContain('guide[1].target.kind:');
        expect(text).toContain('guide[2].from.opcode:');
        expect(text).toContain('guide[2].to:');
        expect(text).toContain('guide[3].type:');
    });

    test('adım içi sınırlar', () => {
        const lesson = validLesson();
        lesson.steps[0].text = 'x'.repeat(2001);
        lesson.steps[0].checks = new Array(11).fill({type: 'blocks', pattern: pattern()});
        lesson.steps[0].guide = new Array(21).fill({type: 'click', target: {kind: 'workspace'}});
        const text = errorsOf(lesson);
        expect(text).toContain('steps[0].text:');
        expect(text).toContain('steps[0].checks:');
        expect(text).toContain('steps[0].guide:');
    });
});
