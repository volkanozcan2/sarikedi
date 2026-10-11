import {snapshotWorkspace, recordStep, categoryOf} from '../../../src/lib/lessons/recorder';
import {validateLesson} from '../../../src/lib/lessons/schema';
import {emptyLesson} from '../../../src/lib/lessons/draft';
import {ANY} from '../../../src/lib/lessons/block-pattern';
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
const named = names => () => names.map(name => ({name: name}));

// bayrak -> 10 adım git
const hatMove = () => [
    block('hat', 'event_whenflagclicked', {topLevel: true, next: 'move'}),
    block('move', 'motion_movesteps', {parent: 'hat', inputs: {STEPS: literalInput('STEPS', 'n10')}}),
    num('n10', '10', 'move')
];
// bayrak -> 10 adım git -> 15 derece dön
const hatMoveTurn = () => [
    block('hat', 'event_whenflagclicked', {topLevel: true, next: 'move'}),
    block('move', 'motion_movesteps', {
        parent: 'hat', next: 'turn', inputs: {STEPS: literalInput('STEPS', 'n10')}
    }),
    num('n10', '10', 'move'),
    block('turn', 'motion_turnright', {parent: 'move', inputs: {DEGREES: literalInput('DEGREES', 'n15')}}),
    num('n15', '15', 'turn')
];
const vmWith = list => fakeVm([fakeTarget('Cool Cat', toMap(list))]);
const palette = ['event_whenflagclicked', 'motion_movesteps', 'motion_turnright', 'control_forever'];

describe('categoryOf', () => {
    test('opcode önekinden kategori kimliği ve Türkçe ad', () => {
        expect(categoryOf('event_whenflagclicked')).toEqual({id: 'events', label: 'Olaylar'});
        expect(categoryOf('motion_movesteps')).toEqual({id: 'motion', label: 'Hareket'});
        expect(categoryOf('operator_add')).toEqual({id: 'operators', label: 'İşlemler'});
        expect(categoryOf('data_setvariableto')).toEqual({id: 'variables', label: 'Değişkenler'});
        expect(categoryOf('pen_clear')).toBeNull();
    });
});

describe('recordStep', () => {
    test('değişiklik yoksa adım üretmez', () => {
        const vm = vmWith(hatMove());
        const result = recordStep(vm, snapshotWorkspace(vm), {paletteOpcodes: palette});
        expect(result.step).toBeNull();
    });

    test('betiğe eklenen blok için kontrol, rehber ve metin üretir', () => {
        const baseline = snapshotWorkspace(vmWith(hatMove()));
        const vm = vmWith(hatMoveTurn());
        const result = recordStep(vm, baseline, {
            paletteOpcodes: palette, labels: {motion_turnright: '? derece sağa dön'}
        });
        const step = result.step;
        expect(step.checks).toHaveLength(1);
        expect(step.checks[0].type).toBe('blocks');
        expect(step.checks[0].sprite).toBe('Cool Cat');
        expect(step.checks[0].pattern.opcode).toBe('event_whenflagclicked');
        expect(step.checks[0].pattern.next.next.opcode).toBe('motion_turnright');
        expect(step.checks[0].pattern.next.inputs.STEPS.literal).toBe(ANY);
        expect(step.guide).toEqual([
            {type: 'click', target: {kind: 'category', id: 'motion'}, label: 'Hareket'},
            {
                type: 'drag',
                from: {kind: 'block', opcode: 'motion_turnright'},
                to: {kind: 'workspaceBlock', opcode: 'motion_movesteps'},
                label: 'Sürükle'
            }
        ]);
        expect(step.text).toContain('Hareket');
        expect(step.text).toContain('? derece sağa dön');
        expect(step.media).toBeNull();
    });

    test('yeni betik: ilk blok çalışma alanına bırakılır, aynı kategoride tek tıklama', () => {
        const baseline = snapshotWorkspace(vmWith([]));
        const vm = vmWith(hatMove());
        const step = recordStep(vm, baseline, {paletteOpcodes: palette}).step;
        expect(step.guide.map(a => a.type)).toEqual(['click', 'drag', 'click', 'drag']);
        expect(step.guide[1].to).toEqual({kind: 'workspace'});
        expect(step.guide[3].to).toEqual({kind: 'workspaceBlock', opcode: 'event_whenflagclicked'});
    });

    test('sadece sayı değiştiyse rehbersiz, değer düzenleme metniyle adım üretir', () => {
        const baseline = snapshotWorkspace(vmWith(hatMove()));
        const changed = hatMove();
        changed[2] = num('n10', '25', 'move');
        const step = recordStep(vmWith(changed), baseline, {paletteOpcodes: palette}).step;
        expect(step.guide).toEqual([]);
        expect(step.text.length).toBeGreaterThan(0);
        expect(step.checks).toHaveLength(1);
    });

    test('paletteOpcodes içinde olmayan blok için rehber eklenmez', () => {
        const baseline = snapshotWorkspace(vmWith(hatMove()));
        const step = recordStep(vmWith(hatMoveTurn()), baseline, {paletteOpcodes: ['event_whenflagclicked']}).step;
        expect(step.guide).toEqual([]);
    });

    test('yeni anlık görüntüyü döndürür; art arda kayıt yalnızca yeni değişikliği alır', () => {
        const first = recordStep(vmWith(hatMove()), snapshotWorkspace(vmWith([])), {paletteOpcodes: palette});
        const second = recordStep(vmWith(hatMoveTurn()), first.snapshot, {paletteOpcodes: palette});
        expect(second.step.guide.filter(a => a.type === 'drag')).toHaveLength(1);
        expect(recordStep(vmWith(hatMoveTurn()), second.snapshot, {paletteOpcodes: palette}).step).toBeNull();
    });

    test('üretilen adım şemadan geçer', () => {
        const baseline = snapshotWorkspace(vmWith(hatMove()));
        const step = recordStep(vmWith(hatMoveTurn()), baseline, {paletteOpcodes: palette}).step;
        const lesson = Object.assign(emptyLesson(), {id: 'kayit', title: 'Kayıt', steps: [step]});
        expect(validateLesson(lesson)).toEqual({valid: true, errors: []});
    });

    test('birden çok kuklada değişiklik: her biri kendi kuklasına bağlı kontrol alır', () => {
        const stage = fakeTarget('Stage', toMap([]), {isStage: true});
        const before = fakeVm([fakeTarget('Cool Cat', toMap(hatMove())), stage]);
        const after = fakeVm([
            fakeTarget('Cool Cat', toMap(hatMoveTurn())),
            fakeTarget('Stage', toMap([block('s', 'control_forever', {topLevel: true})]), {isStage: true})
        ]);
        const step = recordStep(after, snapshotWorkspace(before), {paletteOpcodes: palette}).step;
        expect(step.checks.map(c => c.sprite).sort()).toEqual(['Cool Cat', 'Sahne']);
    });
});

describe('kukla / dekor / kostüm / ses eklemeleri', () => {
    const cat = (extra, blocks) => fakeTarget('Cool Cat', toMap(blocks || []), Object.assign({
        getCostumes: named(['cool cat']), getSounds: named(['Meow'])
    }, extra));
    const stage = extra => fakeTarget('Stage', toMap([]), Object.assign({
        isStage: true, getCostumes: named(['dekor1']), getSounds: named([])
    }, extra));
    const record = (before, after) => recordStep(fakeVm(after), snapshotWorkspace(fakeVm(before)), {
        paletteOpcodes: palette
    });

    test('yeni kukla: kontrolsüz adım, "Kukla ekle" rehberi ve kukla adı metinde', () => {
        const result = record([cat(), stage()], [cat(), fakeTarget('Apple', toMap([]), {
            getCostumes: named(['apple']), getSounds: named([])
        }), stage()]);
        const step = result.step;
        expect(step.checks).toEqual([]);
        expect(step.guide).toEqual([{type: 'click', target: {kind: 'ui', id: 'addSprite'}, label: 'Kukla ekle'}]);
        expect(step.text).toContain('Kukla ekle');
        expect(step.text).toContain('Apple');
    });

    test('yeni dekor', () => {
        const step = record([cat(), stage()], [cat(), stage({getCostumes: named(['dekor1', 'Blue Sky'])})]).step;
        expect(step.guide[0].target).toEqual({kind: 'ui', id: 'addBackdrop'});
        expect(step.text).toContain('Blue Sky');
        expect(step.text).toContain('dekor');
    });

    test('yeni kostüm ve ses: ilgili sekmeye tıklatır', () => {
        const costume = record([cat(), stage()], [cat({getCostumes: named(['cool cat', 'cat-b'])}), stage()]).step;
        expect(costume.guide[0].target).toEqual({kind: 'ui', id: 'costumesTab'});
        expect(costume.text).toContain('cat-b');
        const sound = record([cat(), stage()], [cat({getSounds: named(['Meow', 'Pop'])}), stage()]).step;
        expect(sound.guide[0].target).toEqual({kind: 'ui', id: 'soundsTab'});
        expect(sound.text).toContain('Pop');
    });

    test('yeni kuklanın kostümü ayrıca anlatılmaz; değişiklik yoksa adım yok', () => {
        const added = fakeTarget('Apple', toMap([]), {getCostumes: named(['apple', 'apple2']), getSounds: named([])});
        const step = record([cat(), stage()], [cat(), added, stage()]).step;
        expect(step.text).not.toContain('apple2');
        expect(record([cat(), stage()], [cat(), stage()]).step).toBeNull();
    });

    test('eklemeyle birlikte blok değişikliği aynı adımda: önce ekleme rehberi, sonra bloklar', () => {
        const before = [cat({}, hatMove()), stage()];
        const after = [cat({}, hatMoveTurn()), fakeTarget('Apple', toMap([]), {
            getCostumes: named(['apple']), getSounds: named([])
        }), stage()];
        const step = record(before, after).step;
        expect(step.guide[0].target.id).toBe('addSprite');
        expect(step.guide.some(a => a.type === 'drag')).toBe(true);
        expect(step.checks).toHaveLength(1);
        expect(step.text.indexOf('Apple')).toBeLessThan(step.text.indexOf('motion_turnright'));
    });

    test('ekleme adımı şemadan geçer', () => {
        const step = record([cat(), stage()], [cat(), stage({getCostumes: named(['dekor1', 'Blue Sky'])})]).step;
        const lesson = Object.assign(emptyLesson(), {id: 'kayit', title: 'Kayıt', steps: [step]});
        expect(validateLesson(lesson)).toEqual({valid: true, errors: []});
    });
});

describe('kukla / sahne seçimi', () => {
    const cat = () => fakeTarget('Cool Cat', toMap([]), {getCostumes: named(['c']), getSounds: named([])});
    const apple = () => fakeTarget('Apple', toMap([]), {getCostumes: named(['a']), getSounds: named([])});
    const stage = () => fakeTarget('Stage', toMap([]), {
        isStage: true, getCostumes: named(['d']), getSounds: named([])
    });
    const vmEditing = (targets, editing) => Object.assign(fakeVm(targets), {editingTarget: editing});
    const record = (before, after) => recordStep(after, snapshotWorkspace(before), {paletteOpcodes: palette});

    test('mevcut başka kukla seçilince adım üretir: kukla listesine tıklat, kukla adı metinde', () => {
        const targets = [cat(), apple(), stage()];
        const step = record(vmEditing(targets, targets[0]), vmEditing(targets, targets[1])).step;
        expect(step.checks).toEqual([]);
        expect(step.guide).toEqual([{type: 'click', target: {kind: 'ui', id: 'spriteList'}, label: 'Kukla listesi'}]);
        expect(step.text).toContain('Apple');
        expect(step.text).toContain('seç');
    });

    test('sahne seçilince sahne bölmesine tıklatır', () => {
        const targets = [cat(), apple(), stage()];
        const step = record(vmEditing(targets, targets[0]), vmEditing(targets, targets[2])).step;
        expect(step.guide[0].target).toEqual({kind: 'ui', id: 'stageSelector'});
        expect(step.text).toContain('Sahne');
    });

    test('seçim değişmediyse adım yok; yeni eklenen kukla otomatik seçilince ayrıca seçim adımı olmaz', () => {
        const targets = [cat(), apple(), stage()];
        expect(record(vmEditing(targets, targets[0]), vmEditing(targets, targets[0])).step).toBeNull();
        const before = [cat(), stage()];
        const after = [cat(), apple(), stage()];
        const step = record(vmEditing(before, before[0]), vmEditing(after, after[1])).step;
        expect(step.text).toContain('Kukla ekle');
        expect(step.text).not.toContain('listesinden');
    });

    test('başka kuklaya geçip blok eklenirse önce seçim anlatılır', () => {
        const before = [cat(), apple(), stage()];
        const withBlocks = [cat(), fakeTarget('Apple', toMap(hatMove()), {
            getCostumes: named(['a']), getSounds: named([])
        }), stage()];
        const step = record(vmEditing(before, before[0]), vmEditing(withBlocks, withBlocks[1])).step;
        expect(step.guide[0].target.id).toBe('spriteList');
        expect(step.checks).toHaveLength(1);
        expect(step.text.indexOf('Apple')).toBeLessThan(step.text.indexOf('event_whenflagclicked'));
    });

    test('seçim adımı şemadan geçer', () => {
        const targets = [cat(), apple(), stage()];
        const step = record(vmEditing(targets, targets[0]), vmEditing(targets, targets[2])).step;
        const lesson = Object.assign(emptyLesson(), {id: 'kayit', title: 'Kayıt', steps: [step]});
        expect(validateLesson(lesson)).toEqual({valid: true, errors: []});
    });
});
