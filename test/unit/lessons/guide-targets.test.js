import {resolveTargetRect, UI_SELECTORS} from '../../../src/lib/lessons/guide-targets';

const rectOf = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});

const addElement = (doc, className, rect, tag) => {
    const el = doc.createElement(tag || 'div');
    el.className = className;
    el.getBoundingClientRect = () => rect;
    doc.body.appendChild(el);
    return el;
};

const fakeBlock = (type, rect, y, shadow) => ({
    type: type,
    isShadow: () => Boolean(shadow),
    getRelativeToSurfaceXY: () => ({x: 0, y: y || 0}),
    getSvgRoot: () => ({getBoundingClientRect: () => rect})
});

const makeEnv = (doc, workspace) => ({
    document: doc,
    getWorkspace: () => workspace,
    sleep: () => Promise.resolve()
});

describe('resolveTargetRect', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('kategori: sınıfa göre bulur', () => {
        addElement(document, 'scratchCategoryMenuItem scratchCategoryId-motion', rectOf(1, 93, 60, 46));
        return resolveTargetRect({kind: 'category', id: 'motion'}, makeEnv(document, {})).then(rect => {
            expect(rect).toEqual({left: 1, top: 93, width: 60, height: 46});
        });
    });

    test('kategori: tehlikeli ya da bilinmeyen kimlik null', () => {
        const env = makeEnv(document, {});
        return Promise.all([
            resolveTargetRect({kind: 'category', id: 'a b'}, env),
            resolveTargetRect({kind: 'category', id: '"]x'}, env),
            resolveTargetRect({kind: 'category', id: 'yok'}, env)
        ]).then(results => expect(results).toEqual([null, null, null]));
    });

    test('ui: tablodaki seçiciyle bulur, sekmeler sıra numarasıyla', () => {
        addElement(document, 'green-flag_green-flag_AbC12', rectOf(769, 54, 32, 32), 'img');
        ['Kod', 'Kostümler', 'Sesler'].forEach((label, i) => {
            const tab = addElement(document, 'tab', rectOf(i * 90, 53, 88, 40));
            tab.setAttribute('role', 'tab');
        });
        const env = makeEnv(document, {});
        return Promise.all([
            resolveTargetRect({kind: 'ui', id: 'greenFlag'}, env),
            resolveTargetRect({kind: 'ui', id: 'soundsTab'}, env),
            resolveTargetRect({kind: 'ui', id: 'stop'}, env)
        ]).then(results => {
            expect(results[0]).toEqual({left: 769, top: 54, width: 32, height: 32});
            expect(results[1].left).toBe(180);
            expect(results[2]).toBeNull();
        });
    });

    test('ui: tablo tüm kimlikleri içerir', () => {
        ['greenFlag', 'stop', 'stage', 'spriteList', 'costumesTab', 'soundsTab', 'codeTab', 'addSprite']
            .forEach(id => expect(UI_SELECTORS[id]).toBeDefined());
    });

    test('boyutu sıfır olan öğe null sayılır', () => {
        addElement(document, 'green-flag_green-flag_x', rectOf(0, 0, 0, 0), 'img');
        return resolveTargetRect({kind: 'ui', id: 'greenFlag'}, makeEnv(document, {})).then(rect => {
            expect(rect).toBeNull();
        });
    });

    test('workspace: çalışma alanında sol-üste yakın küçük bir nokta', () => {
        addElement(document, 'injectionDiv', rectOf(0, 92, 761, 1000));
        return resolveTargetRect({kind: 'workspace'}, makeEnv(document, {})).then(rect => {
            expect(rect.width).toBe(40);
            expect(rect.left).toBeCloseTo(266.35, 1);
            expect(rect.top).toBeCloseTo(392, 0);
        });
    });

    test('workspaceBlock: ilk gölge olmayan blok', () => {
        const workspace = {
            getAllBlocks: () => [
                fakeBlock('motion_movesteps', rectOf(1, 1, 5, 5), 0, true),
                fakeBlock('motion_movesteps', rectOf(300, 200, 110, 38))
            ]
        };
        return resolveTargetRect({kind: 'workspaceBlock', opcode: 'motion_movesteps'}, makeEnv(document, workspace))
            .then(rect => expect(rect).toEqual({left: 300, top: 200, width: 110, height: 38}));
    });

    test('workspaceBlock: blok yoksa null', () => {
        const workspace = {getAllBlocks: () => []};
        return resolveTargetRect({kind: 'workspaceBlock', opcode: 'x'}, makeEnv(document, workspace))
            .then(rect => expect(rect).toBeNull());
    });

    test('block (palet): paleti bloğa kaydırır ve konumunu verir', () => {
        const scrollTo = jest.fn();
        const flyoutWorkspace = {
            getAllBlocks: () => [fakeBlock('looks_say', rectOf(69, 111, 110, 38), 1528)]
        };
        const workspace = {getFlyout: () => ({getWorkspace: () => flyoutWorkspace, scrollTo: scrollTo})};
        return resolveTargetRect({kind: 'block', opcode: 'looks_say'}, makeEnv(document, workspace)).then(rect => {
            expect(scrollTo).toHaveBeenCalledWith(1512);
            expect(rect).toEqual({left: 69, top: 111, width: 110, height: 38});
        });
    });

    test('block (palet): blok yoksa kaydırmaz ve null döner', () => {
        const scrollTo = jest.fn();
        const workspace = {getFlyout: () => ({getWorkspace: () => ({getAllBlocks: () => []}), scrollTo: scrollTo})};
        return resolveTargetRect({kind: 'block', opcode: 'yok'}, makeEnv(document, workspace)).then(rect => {
            expect(rect).toBeNull();
            expect(scrollTo).not.toHaveBeenCalled();
        });
    });

    test('hata fırlatan çalışma alanı ve bilinmeyen tür reddetmez, null döner', () => {
        const env = makeEnv(document, null);
        return Promise.all([
            resolveTargetRect({kind: 'block', opcode: 'x'}, env),
            resolveTargetRect({kind: 'uzay'}, env),
            resolveTargetRect(null, env)
        ]).then(results => expect(results).toEqual([null, null, null]));
    });
});
