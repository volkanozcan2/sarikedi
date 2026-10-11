/**
 * Ders yazma dili (DSL). Çözüm bloklarını küçük bir kodla yazarız; bu dosya onları
 * gerçek bir Scratch 3 projesine (sb3 JSON) çevirir. Projeyi scratch-vm'e yükleyip
 * kalıpları ve kontrolleri gerçek VM üzerinden üretir/doğrularız.
 *
 * Girdi tipleri (SIG): 4 sayı, 5 pozitif sayı, 6 tam sayı, 8 açı, 9 renk, 10 metin,
 * 'bool' mantıksal boşluk, 'menu:<gölge opcode>:<alan>' açılır menü.
 */

const menu = (shadowOpcode, field) => `menu:${shadowOpcode}:${field}`;

const SIG = {
    event_whenflagclicked: {hat: true},
    event_whenkeypressed: {hat: true, fields: ['KEY_OPTION']},
    event_whenthisspriteclicked: {hat: true},
    control_start_as_clone: {hat: true},

    motion_movesteps: {inputs: {STEPS: 4}},
    motion_turnright: {inputs: {DEGREES: 4}},
    motion_turnleft: {inputs: {DEGREES: 4}},
    motion_gotoxy: {inputs: {X: 4, Y: 4}},
    motion_goto: {inputs: {TO: menu('motion_goto_menu', 'TO')}},
    motion_pointindirection: {inputs: {DIRECTION: 8}},
    motion_pointtowards: {inputs: {TOWARDS: menu('motion_pointtowards_menu', 'TOWARDS')}},
    motion_changexby: {inputs: {DX: 4}},
    motion_setx: {inputs: {X: 4}},
    motion_changeyby: {inputs: {DY: 4}},
    motion_sety: {inputs: {Y: 4}},
    motion_ifonedgebounce: {},
    motion_xposition: {},
    motion_yposition: {},
    motion_direction: {},

    looks_say: {inputs: {MESSAGE: 10}},
    looks_sayforsecs: {inputs: {MESSAGE: 10, SECS: 4}},
    looks_show: {},
    looks_hide: {},
    looks_setsizeto: {inputs: {SIZE: 4}},

    sound_play: {inputs: {SOUND_MENU: menu('sound_sounds_menu', 'SOUND_MENU')}},

    control_wait: {inputs: {DURATION: 5}},
    control_repeat: {inputs: {TIMES: 6}, subs: ['SUBSTACK']},
    control_forever: {subs: ['SUBSTACK']},
    control_if: {inputs: {CONDITION: 'bool'}, subs: ['SUBSTACK']},
    control_if_else: {inputs: {CONDITION: 'bool'}, subs: ['SUBSTACK', 'SUBSTACK2']},
    control_wait_until: {inputs: {CONDITION: 'bool'}},
    control_repeat_until: {inputs: {CONDITION: 'bool'}, subs: ['SUBSTACK']},
    control_stop: {fields: ['STOP_OPTION'], mutation: {hasnext: 'false'}},
    control_create_clone_of: {inputs: {CLONE_OPTION: menu('control_create_clone_of_menu', 'CLONE_OPTION')}},
    control_delete_this_clone: {},

    sensing_touchingobject: {inputs: {TOUCHINGOBJECTMENU: menu('sensing_touchingobjectmenu', 'TOUCHINGOBJECTMENU')}},
    sensing_touchingcolor: {inputs: {COLOR: 9}},
    sensing_keypressed: {inputs: {KEY_OPTION: menu('sensing_keyoptions', 'KEY_OPTION')}},
    sensing_mousex: {},
    sensing_mousey: {},
    sensing_askandwait: {inputs: {QUESTION: 10}},
    sensing_answer: {},
    sensing_resettimer: {},
    sensing_timer: {},

    operator_add: {inputs: {NUM1: 4, NUM2: 4}},
    operator_subtract: {inputs: {NUM1: 4, NUM2: 4}},
    operator_multiply: {inputs: {NUM1: 4, NUM2: 4}},
    operator_divide: {inputs: {NUM1: 4, NUM2: 4}},
    operator_random: {inputs: {FROM: 4, TO: 4}},
    operator_gt: {inputs: {OPERAND1: 10, OPERAND2: 10}},
    operator_lt: {inputs: {OPERAND1: 10, OPERAND2: 10}},
    operator_equals: {inputs: {OPERAND1: 10, OPERAND2: 10}},
    operator_and: {inputs: {OPERAND1: 'bool', OPERAND2: 'bool'}},
    operator_or: {inputs: {OPERAND1: 'bool', OPERAND2: 'bool'}},
    operator_not: {inputs: {OPERAND: 'bool'}},
    operator_join: {inputs: {STRING1: 10, STRING2: 10}},

    data_setvariableto: {inputs: {VALUE: 10}, variableField: true},
    data_changevariableby: {inputs: {VALUE: 4}, variableField: true},
    data_variable: {variableField: true}
};

const block = (op, inputs, fields, subs) => {
    if (!SIG[op]) throw new Error(`Bilinmeyen blok: ${op}`);
    return {op: op, inputs: inputs || {}, fields: fields || {}, subs: subs || {}};
};

const B = {
    // olaylar
    flag: () => block('event_whenflagclicked'),
    key: name => block('event_whenkeypressed', {}, {KEY_OPTION: name}),
    clicked: () => block('event_whenthisspriteclicked'),
    asClone: () => block('control_start_as_clone'),
    // hareket
    go: (x, y) => block('motion_gotoxy', {X: x, Y: y}),
    goTo: target => block('motion_goto', {TO: target}),
    move: n => block('motion_movesteps', {STEPS: n}),
    turnRight: n => block('motion_turnright', {DEGREES: n}),
    turnLeft: n => block('motion_turnleft', {DEGREES: n}),
    point: d => block('motion_pointindirection', {DIRECTION: d}),
    towards: target => block('motion_pointtowards', {TOWARDS: target}),
    dx: n => block('motion_changexby', {DX: n}),
    dy: n => block('motion_changeyby', {DY: n}),
    setX: n => block('motion_setx', {X: n}),
    setY: n => block('motion_sety', {Y: n}),
    bounce: () => block('motion_ifonedgebounce'),
    xpos: () => block('motion_xposition'),
    ypos: () => block('motion_yposition'),
    direction: () => block('motion_direction'),
    // görünüm / ses
    say: (text, secs) => (typeof secs === 'undefined' ?
        block('looks_say', {MESSAGE: text}) :
        block('looks_sayforsecs', {MESSAGE: text, SECS: secs})),
    show: () => block('looks_show'),
    hide: () => block('looks_hide'),
    size: n => block('looks_setsizeto', {SIZE: n}),
    play: sound => block('sound_play', {SOUND_MENU: sound}),
    // kontrol
    wait: secs => block('control_wait', {DURATION: secs}),
    repeat: (times, body) => block('control_repeat', {TIMES: times}, {}, {SUBSTACK: body}),
    forever: body => block('control_forever', {}, {}, {SUBSTACK: body}),
    if_: (condition, body) => block('control_if', {CONDITION: condition}, {}, {SUBSTACK: body}),
    ifElse: (condition, yes, no) => block('control_if_else', {CONDITION: condition}, {},
        {SUBSTACK: yes, SUBSTACK2: no}),
    waitUntil: condition => block('control_wait_until', {CONDITION: condition}),
    repeatUntil: (condition, body) => block('control_repeat_until', {CONDITION: condition}, {}, {SUBSTACK: body}),
    stopAll: () => block('control_stop', {}, {STOP_OPTION: 'all'}),
    cloneOf: target => block('control_create_clone_of', {CLONE_OPTION: target}),
    deleteClone: () => block('control_delete_this_clone'),
    // algılama
    touching: target => block('sensing_touchingobject', {TOUCHINGOBJECTMENU: target}),
    touchingColor: color => block('sensing_touchingcolor', {COLOR: color}),
    keyDown: name => block('sensing_keypressed', {KEY_OPTION: name}),
    mouseX: () => block('sensing_mousex'),
    mouseY: () => block('sensing_mousey'),
    ask: question => block('sensing_askandwait', {QUESTION: question}),
    answer: () => block('sensing_answer'),
    resetTimer: () => block('sensing_resettimer'),
    timer: () => block('sensing_timer'),
    // işlemler
    add: (a, b) => block('operator_add', {NUM1: a, NUM2: b}),
    sub: (a, b) => block('operator_subtract', {NUM1: a, NUM2: b}),
    mul: (a, b) => block('operator_multiply', {NUM1: a, NUM2: b}),
    div: (a, b) => block('operator_divide', {NUM1: a, NUM2: b}),
    random: (a, b) => block('operator_random', {FROM: a, TO: b}),
    gt: (a, b) => block('operator_gt', {OPERAND1: a, OPERAND2: b}),
    lt: (a, b) => block('operator_lt', {OPERAND1: a, OPERAND2: b}),
    eq: (a, b) => block('operator_equals', {OPERAND1: a, OPERAND2: b}),
    and: (a, b) => block('operator_and', {OPERAND1: a, OPERAND2: b}),
    or: (a, b) => block('operator_or', {OPERAND1: a, OPERAND2: b}),
    not: a => block('operator_not', {OPERAND: a}),
    join: (a, b) => block('operator_join', {STRING1: a, STRING2: b}),
    // değişkenler
    setVar: (name, value) => block('data_setvariableto', {VALUE: value}, {VARIABLE: name}),
    changeVar: (name, value) => block('data_changevariableby', {VALUE: value}, {VARIABLE: name}),
    variable: name => block('data_variable', {}, {VARIABLE: name})
};

const isBlock = value => value !== null && typeof value === 'object' && typeof value.op === 'string';

const DUMMY_COSTUME = {
    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
    name: 'kostum',
    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
    dataFormat: 'svg',
    rotationCenterX: 0,
    rotationCenterY: 0
};

const varId = name => `var_${name}`;

/**
 * @param {object} state {sprites: {[ad]: Script[]}, variables: string[]}; Script = Block[] (ilki şapka)
 * @return {{project: object, trees: object}} sb3 projesi ve kimlik ağaçları (locate için)
 */
const buildProject = state => {
    let counter = 0;
    const nextId = prefix => `${prefix}${++counter}`;
    const trees = {};

    const emitStack = (blocks, list, parentId, topLevel, position) => {
        const ids = list.map(() => nextId('b'));
        return list.map((b, i) => {
            const id = ids[i];
            const isTop = topLevel && i === 0;
            const out = {
                opcode: b.op,
                next: i + 1 < list.length ? ids[i + 1] : null,
                parent: i === 0 ? parentId : ids[i - 1],
                inputs: {},
                fields: {},
                shadow: false,
                topLevel: isTop
            };
            if (isTop) {
                out.x = 20;
                out.y = 20 + (position * 200);
            }
            blocks[id] = out;
            const node = {id: id, subs: {}};
            // eslint-disable-next-line no-use-before-define
            fillBlock(blocks, b, id, out, node);
            return node;
        });
    };

    const emitReporter = (blocks, reporter, parentId) => {
        const id = nextId('r');
        const out = {
            opcode: reporter.op,
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
        };
        blocks[id] = out;
        // eslint-disable-next-line no-use-before-define
        fillBlock(blocks, reporter, id, out, {id: id, subs: {}});
        return id;
    };

    const fillBlock = (blocks, b, id, out, node) => {
        const sig = SIG[b.op];
        Object.keys(sig.inputs || {}).forEach(name => {
            const type = sig.inputs[name];
            const value = b.inputs[name];
            if (typeof value === 'undefined') return;
            if (type === 'bool') {
                if (!isBlock(value)) throw new Error(`${b.op}.${name} bir blok olmalı`);
                out.inputs[name] = [2, emitReporter(blocks, value, id)];
            } else if (typeof type === 'string' && type.indexOf('menu:') === 0) {
                const parts = type.split(':');
                const menuId = nextId('m');
                blocks[menuId] = {
                    opcode: parts[1],
                    next: null,
                    parent: id,
                    inputs: {},
                    fields: {[parts[2]]: [String(value), null]},
                    shadow: true,
                    topLevel: false
                };
                out.inputs[name] = [1, menuId];
            } else if (isBlock(value)) {
                out.inputs[name] = [3, emitReporter(blocks, value, id), [type, '']];
            } else {
                out.inputs[name] = [1, [type, String(value)]];
            }
        });
        (sig.fields || []).forEach(name => {
            out.fields[name] = [String(b.fields[name]), null];
        });
        if (sig.variableField) {
            const name = String(b.fields.VARIABLE);
            out.fields.VARIABLE = [name, varId(name)];
        }
        if (sig.mutation) out.mutation = Object.assign({tagName: 'mutation', children: []}, sig.mutation);
        (sig.subs || []).forEach(name => {
            const body = b.subs[name];
            if (!body || body.length === 0) return;
            const subNodes = emitStack(blocks, body, id, false, 0);
            out.inputs[name] = [2, subNodes[0].id];
            node.subs[name] = subNodes;
        });
    };

    const sprites = Object.assign({'Cool Cat': []}, state.sprites);
    const variables = {};
    (state.variables || []).forEach(name => {
        variables[varId(name)] = [name, 0];
    });

    const targets = [{
        isStage: true,
        name: 'Stage',
        variables: variables,
        lists: {},
        broadcasts: {},
        blocks: {},
        currentCostume: 0,
        costumes: [DUMMY_COSTUME],
        sounds: [],
        volume: 100,
        layerOrder: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: 'on',
        textToSpeechLanguage: null
    }];
    Object.keys(sprites).forEach((name, index) => {
        const blocks = {};
        trees[name] = sprites[name].map((script, position) => emitStack(blocks, script, null, true, position));
        targets.push({
            isStage: false,
            name: name,
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: blocks,
            currentCostume: 0,
            costumes: [DUMMY_COSTUME],
            sounds: [],
            volume: 100,
            layerOrder: index + 1,
            visible: true,
            x: 0,
            y: 0,
            size: 100,
            direction: 90,
            draggable: false,
            rotationStyle: 'all around'
        });
    });

    return {
        project: {targets: targets, monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '0.2.0', agent: 'lessons'}},
        trees: trees
    };
};

/**
 * Bir betikteki bloğun kimliğini yoldan bulur.
 * yol: sayı = yığındaki sıra, metin = o bloğun alt yığını (örn. [3, 'SUBSTACK', 1]).
 */
const locate = (trees, sprite, scriptIndex, path) => {
    let nodes = trees[sprite] && trees[sprite][scriptIndex];
    if (!nodes) throw new Error(`Betik yok: ${sprite}[${scriptIndex}]`);
    let current = null;
    (path || [0]).forEach(part => {
        if (typeof part === 'number') {
            current = nodes[part];
            if (!current) throw new Error(`Blok yok: ${sprite}[${scriptIndex}] yol ${JSON.stringify(path)}`);
        } else {
            nodes = current && current.subs[part];
            if (!nodes) throw new Error(`Alt yığın yok: ${part} (${JSON.stringify(path)})`);
        }
    });
    return current.id;
};

module.exports = {SIG, B, buildProject, locate, isBlock};
