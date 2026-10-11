import {buildImportSteps, truncatePattern} from '../../../src/lib/lessons/importer';
import {validateLesson} from '../../../src/lib/lessons/schema';
import {emptyLesson} from '../../../src/lib/lessons/draft';
import {extractPattern} from '../../../src/lib/lessons/block-pattern';
import {block, num, toMap, literalInput} from './helpers/blocks-fixture';

const fakeTarget = (name, blocks, extra) => Object.assign({
    isStage: false,
    isOriginal: true,
    getName: () => name,
    blocks: {
        _blocks: blocks,
        getScripts: () => Object.keys(blocks).filter(id => blocks[id].topLevel && !blocks[id].shadow)
    }
}, extra);
const fakeVm = targets => ({runtime: {targets: targets}});

// bayrak -> sürekli tekrarla { 10 adım git; 15 derece dön } -> 5 adım git (6 deyim)
const bigScript = () => toMap([
    block('hat', 'event_whenflagclicked', {topLevel: true, next: 'fv'}),
    block('fv', 'control_forever', {
        parent: 'hat', next: 'last',
        inputs: {SUBSTACK: {name: 'SUBSTACK', block: 'm1', shadow: null}}
    }),
    block('m1', 'motion_movesteps', {parent: 'fv', next: 't1', inputs: {STEPS: literalInput('STEPS', 'n10')}}),
    num('n10', '10', 'm1'),
    block('t1', 'motion_turnright', {parent: 'm1', inputs: {DEGREES: literalInput('DEGREES', 'n15')}}),
    num('n15', '15', 't1'),
    block('last', 'motion_movesteps', {parent: 'fv', inputs: {STEPS: literalInput('STEPS', 'n5')}}),
    num('n5', '5', 'last')
]);

describe('truncatePattern', () => {
    const full = () => extractPattern(bigScript(), 'hat');

    test('deyim sayısına göre önekten keser; kapsayıcının içi ve sonrası sırayla sayılır', () => {
        expect(truncatePattern(full(), 1).next).toBeNull();
        const two = truncatePattern(full(), 2);
        expect(two.next.opcode).toBe('control_forever');
        expect(two.next.inputs.SUBSTACK).toBeUndefined();
        expect(two.next.next).toBeNull();
        const four = truncatePattern(full(), 4);
        expect(four.next.inputs.SUBSTACK.next.opcode).toBe('motion_turnright');
        expect(four.next.next).toBeNull();
        expect(truncatePattern(full(), 5).next.next.opcode).toBe('motion_movesteps');
    });

    test('girişlerdeki değerler ve alanlar korunur, girdi değişmez', () => {
        const pattern = full();
        const cut = truncatePattern(pattern, 3);
        expect(cut.next.inputs.SUBSTACK.inputs.STEPS).toEqual(pattern.next.inputs.SUBSTACK.inputs.STEPS);
        expect(pattern.next.next.opcode).toBe('motion_movesteps');
    });
});

describe('buildImportSteps', () => {
    const vm = () => fakeVm([fakeTarget('Cool Cat', bigScript())]);

    test('betik, adım başına ~3 deyimle bölünür; sonda deneme adımı vardır', () => {
        const steps = buildImportSteps(vm(), {chunkSize: 3, autoCheck: true});
        // 5 deyim: 3 + 2, sonra "oyunu dene"
        expect(steps).toHaveLength(3);
        expect(steps[0].checks[0].sprite).toBe('Cool Cat');
        expect(steps[0].checks[0].pattern.next.opcode).toBe('control_forever');
        expect(steps[1].checks[0].pattern.next.next.opcode).toBe('motion_movesteps');
        expect(steps[2].checks).toEqual([]);
    });

    test('her adımın rehberi yalnızca o adımın yeni bloklarını anlatır', () => {
        const steps = buildImportSteps(vm(), {chunkSize: 3});
        const dragged = step => step.guide.filter(a => a.type === 'drag').map(a => a.from.opcode);
        expect(dragged(steps[0])).toEqual(['event_whenflagclicked', 'control_forever', 'motion_movesteps']);
        expect(dragged(steps[1])).toEqual(['motion_turnright', 'motion_movesteps']);
        expect(steps[0].guide[1].to).toEqual({kind: 'workspace'});
        expect(steps[1].guide[1].to).toEqual({kind: 'workspaceBlock', opcode: 'motion_movesteps'});
    });

    test('seçenek alanları (tuş, değişken) metne yazılır', () => {
        const blocks = toMap([
            block('hat', 'event_whenkeypressed', {
                topLevel: true, fields: {KEY_OPTION: {name: 'KEY_OPTION', value: 'right arrow'}}
            })
        ]);
        const steps = buildImportSteps(fakeVm([fakeTarget('Cool Cat', blocks)]), {chunkSize: 3});
        expect(steps[0].text).toContain('seçenek: sağ ok');
    });

    test('autoCheck verilmezse kontrol yoktur (öğrenci İleri der); verilirse blok kontrolü gelir', () => {
        const manual = buildImportSteps(vm(), {chunkSize: 3});
        expect(manual.every(step => step.checks.length === 0)).toBe(true);
        expect(manual[0].guide.length).toBeGreaterThan(0);
        const checked = buildImportSteps(vm(), {chunkSize: 3, autoCheck: true});
        expect(checked[0].checks).toHaveLength(1);
    });

    test('seçenek değerleri Türkçe yazılır (ok tuşları, boşluk, fare, kenar)', () => {
        const field = (name, value) => ({[name]: {name: name, value: value}});
        const blocks = toMap([
            block('h1', 'event_whenkeypressed', {topLevel: true, fields: field('KEY_OPTION', 'right arrow')}),
            block('h2', 'event_whenkeypressed', {topLevel: true, fields: field('KEY_OPTION', 'space')}),
            block('h3', 'motion_goto', {topLevel: true, fields: field('TO', '_mouse_')}),
            block('h4', 'motion_ifonedgebounce', {topLevel: true, fields: field('X', '_edge_')})
        ]);
        const text = buildImportSteps(fakeVm([fakeTarget('Cool Cat', blocks)]), {chunkSize: 3})
            .map(step => step.text).join(' ');
        expect(text).toContain('sağ ok');
        expect(text).toContain('boşluk');
        expect(text).toContain('fare imleci');
        expect(text).toContain('kenar');
        expect(text).not.toMatch(/right arrow|_mouse_|_edge_/);
    });

    test('değişken bloklarında paletteki varsayılan ad gerçek değişken adıyla değişir', () => {
        const blocks = toMap([
            block('v', 'data_setvariableto', {
                topLevel: true, fields: {VARIABLE: {name: 'VARIABLE', value: 'skor', id: 'x'}}
            })
        ]);
        const text = buildImportSteps(fakeVm([fakeTarget('Cool Cat', blocks)]), {
            chunkSize: 3, labels: {data_setvariableto: 'my variable değişkenini 0 yap'}
        })[0].text;
        expect(text).toContain('skor değişkenini 0 yap');
        expect(text).not.toContain('my variable');
        expect(text).not.toContain('seçenek');
    });

    test('bayrak bloğu "yeşil bayrağa tıklandığında" diye yazılır', () => {
        const blocks = toMap([block('h', 'event_whenflagclicked', {topLevel: true})]);
        const text = buildImportSteps(fakeVm([fakeTarget('Cool Cat', blocks)]), {
            chunkSize: 3, labels: {event_whenflagclicked: 'flag e tıklandığında'}
        })[0].text;
        expect(text).toContain('yeşil bayrağa tıklandığında');
        expect(text).not.toContain('flag');
    });

    test('tek kalan deyim önceki adıma katılır (1 deyimlik artık adım yok)', () => {
        const steps = buildImportSteps(vm(), {chunkSize: 4, autoCheck: true});
        // 5 deyim, boyut 4 => 4 + 1 değil, tek adım (5), sonra deneme adımı
        expect(steps).toHaveLength(2);
        expect(steps[0].checks[0].pattern.next.next.opcode).toBe('motion_movesteps');
    });

    test('birden çok kukla ve betik: kuklalar sırayla, sahne en sona', () => {
        const stage = fakeTarget('Stage', toMap([block('s', 'event_whenflagclicked', {topLevel: true})]), {isStage: true});
        const a = fakeTarget('Cool Cat', toMap([block('h', 'event_whenflagclicked', {topLevel: true})]));
        const steps = buildImportSteps(fakeVm([stage, a]), {chunkSize: 3, autoCheck: true});
        expect(steps.filter(s => s.checks.length).map(s => s.checks[0].sprite)).toEqual(['Cool Cat', 'Sahne']);
    });

    test('hiç blok yoksa hata verir; çok fazla adım hata verir', () => {
        expect(() => buildImportSteps(fakeVm([fakeTarget('Cool Cat', toMap([]))]), {chunkSize: 3})).toThrow();
        const many = {};
        for (let i = 0; i < 120; i++) many[`h${i}`] = block(`h${i}`, 'event_whenflagclicked', {topLevel: true});
        expect(() => buildImportSteps(fakeVm([fakeTarget('Cool Cat', many)]), {chunkSize: 3})).toThrow(/adım/);
    });

    test('üretilen adımlar şemadan geçer', () => {
        const lesson = Object.assign(emptyLesson(), {
            id: 'ice', title: 'İçe', steps: buildImportSteps(vm(), {chunkSize: 3, labels: {motion_movesteps: '10 adım git'}})
        });
        expect(validateLesson(lesson)).toEqual({valid: true, errors: []});
    });
});
