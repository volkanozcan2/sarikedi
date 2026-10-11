const block = (id, opcode, extra) => Object.assign({
    id: id,
    opcode: opcode,
    fields: {},
    inputs: {},
    next: null,
    parent: null,
    shadow: false,
    topLevel: false
}, extra);

const num = (id, value, parent, opcode) => block(id, opcode || 'math_number', {
    shadow: true,
    parent: parent,
    fields: {NUM: {name: 'NUM', value: value}}
});

const toMap = list => list.reduce((map, b) => {
    map[b.id] = b;
    return map;
}, {});

const literalInput = (name, shadowId) => ({name: name, block: shadowId, shadow: shadowId});

// bayrak -> 10 adım git -> 15 derece dön
const movesFixture = () => toMap([
    block('hat', 'event_whenflagclicked', {topLevel: true, next: 'move'}),
    block('move', 'motion_movesteps', {
        parent: 'hat',
        next: 'turn',
        inputs: {STEPS: literalInput('STEPS', 'n10')}
    }),
    num('n10', '10', 'move'),
    block('turn', 'motion_turnright', {
        parent: 'move',
        inputs: {DEGREES: literalInput('DEGREES', 'n15')}
    }),
    num('n15', '15', 'turn')
]);

// bayrak -> 3 kez tekrarla { 10 adım git }
const repeatFixture = () => toMap([
    block('hat', 'event_whenflagclicked', {topLevel: true, next: 'rep'}),
    block('rep', 'control_repeat', {
        parent: 'hat',
        inputs: {
            TIMES: literalInput('TIMES', 'n3'),
            SUBSTACK: {name: 'SUBSTACK', block: 'move', shadow: null}
        }
    }),
    num('n3', '3', 'rep', 'math_whole_number'),
    block('move', 'motion_movesteps', {
        parent: 'rep',
        inputs: {STEPS: literalInput('STEPS', 'n10')}
    }),
    num('n10', '10', 'move')
]);

// x: (1 + 2), y: 5 konumuna git
const reporterFixture = () => toMap([
    block('goto', 'motion_gotoxy', {
        topLevel: true,
        inputs: {
            X: {name: 'X', block: 'add', shadow: 'nx'},
            Y: literalInput('Y', 'ny')
        }
    }),
    num('nx', '0', 'goto'),
    num('ny', '5', 'goto'),
    block('add', 'operator_add', {
        parent: 'goto',
        inputs: {
            NUM1: literalInput('NUM1', 'a1'),
            NUM2: literalInput('NUM2', 'a2')
        }
    }),
    num('a1', '1', 'add'),
    num('a2', '2', 'add')
]);

// rastgele konuma git (menü gölge bloğu)
const menuFixture = () => toMap([
    block('goto', 'motion_goto', {topLevel: true, inputs: {TO: literalInput('TO', 'menu')}}),
    block('menu', 'motion_goto_menu', {
        shadow: true,
        parent: 'goto',
        fields: {TO: {name: 'TO', value: '_random_'}}
    })
]);

// boşluk tuşuna basılınca
const keyFixture = () => toMap([
    block('key', 'event_whenkeypressed', {
        topLevel: true,
        fields: {KEY_OPTION: {name: 'KEY_OPTION', value: 'space'}}
    })
]);

export {
    block,
    num,
    toMap,
    literalInput,
    movesFixture,
    repeatFixture,
    reporterFixture,
    menuFixture,
    keyFixture
};
