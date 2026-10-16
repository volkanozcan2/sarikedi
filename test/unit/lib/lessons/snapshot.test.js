import {snapshotBlocks, diffSnapshots} from '../../../../src/lib/lessons/snapshot';

// VM'deki target.blocks._blocks biçiminde küçük bir blok kümesi
const vmBlocks = () => ({
    hat: {id: 'hat', opcode: 'event_whenflagclicked', parent: null, next: 'move', topLevel: true,
        shadow: false, inputs: {}, fields: {}},
    move: {id: 'move', opcode: 'motion_movesteps', parent: 'hat', next: null, topLevel: false,
        shadow: false, inputs: {STEPS: {name: 'STEPS', block: 'num', shadow: 'num'}}, fields: {}},
    num: {id: 'num', opcode: 'math_number', parent: 'move', next: null, topLevel: false, shadow: true,
        inputs: {}, fields: {NUM: {name: 'NUM', value: '10'}}}
});

describe('lessons/snapshot', () => {
    test('gölge bloklar ayrı kayıt olmaz, değeri sahibinin values alanına yazılır', () => {
        const snap = snapshotBlocks(vmBlocks());
        expect(Object.keys(snap).sort()).toEqual(['hat', 'move']);
        expect(snap.move.values).toEqual({STEPS: '10'});
        expect(snap.move.attach).toEqual({to: 'hat', how: 'next'});
        expect(snap.hat.attach).toEqual({how: 'top'});
    });

    test('bir girdinin içine takılan blok "input" bağlantısıyla görünür', () => {
        const blocks = vmBlocks();
        blocks.loop = {id: 'loop', opcode: 'control_forever', parent: 'move', next: null, topLevel: false,
            shadow: false, inputs: {SUBSTACK: {name: 'SUBSTACK', block: 'say', shadow: null}}, fields: {}};
        blocks.move.next = 'loop';
        blocks.say = {id: 'say', opcode: 'looks_say', parent: 'loop', next: null, topLevel: false,
            shadow: false, inputs: {}, fields: {}};
        const snap = snapshotBlocks(blocks);
        expect(snap.say.attach).toEqual({to: 'loop', how: 'input', input: 'SUBSTACK'});
        expect(snap.loop.values).toEqual({});
    });

    test('fark: eklenen, silinen, taşınan ve değeri değişen bloklar', () => {
        const before = snapshotBlocks(vmBlocks());
        const blocks = vmBlocks();
        blocks.num.fields.NUM.value = '20';
        blocks.turn = {id: 'turn', opcode: 'motion_turnright', parent: 'move', next: null, topLevel: false,
            shadow: false, inputs: {}, fields: {}};
        blocks.move.next = 'turn';
        const diff = diffSnapshots(before, snapshotBlocks(blocks));
        expect(diff.added).toEqual(['turn']);
        expect(diff.removed).toEqual([]);
        expect(diff.moved).toEqual([]);
        expect(diff.changed).toEqual([{id: 'move', key: 'STEPS', value: '20'}]);
    });

    test('fark: eklenenler ebeveynden çocuğa doğru sıralanır', () => {
        const blocks = vmBlocks();
        const diff = diffSnapshots({}, snapshotBlocks(blocks));
        expect(diff.added).toEqual(['hat', 'move']);
    });

    test('fark: başka yere takılan blok taşınmış sayılır, silinen blok removed olur', () => {
        const before = snapshotBlocks(vmBlocks());
        const blocks = vmBlocks();
        blocks.hat.next = null;
        blocks.move.parent = null;
        blocks.move.topLevel = true;
        let diff = diffSnapshots(before, snapshotBlocks(blocks));
        expect(diff.moved).toEqual(['move']);
        delete blocks.move;
        delete blocks.num;
        diff = diffSnapshots(before, snapshotBlocks(blocks));
        expect(diff.removed).toEqual(['move']);
    });
});
