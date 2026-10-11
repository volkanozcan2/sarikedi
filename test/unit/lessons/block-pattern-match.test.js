import {ANY, extractPattern, matchPattern, workspaceMatches} from '../../../src/lib/lessons/block-pattern';
import {
    block, num, toMap, literalInput,
    movesFixture, repeatFixture, reporterFixture, menuFixture, keyFixture
} from './helpers/blocks-fixture';

describe('matchPattern', () => {
    test('kalıp çıkarıldığı çalışma alanıyla eşleşir', () => {
        const blocks = movesFixture();
        expect(matchPattern(blocks, extractPattern(blocks, 'hat'))).toBe(true);
        expect(matchPattern(repeatFixture(), extractPattern(repeatFixture(), 'rep'))).toBe(true);
        expect(matchPattern(reporterFixture(), extractPattern(reporterFixture(), 'goto'))).toBe(true);
        expect(matchPattern(menuFixture(), extractPattern(menuFixture(), 'goto'))).toBe(true);
        expect(matchPattern(keyFixture(), extractPattern(keyFixture(), 'key'))).toBe(true);
    });

    test('kalıp script ortasından başlayabilir ve fazladan bloklar sorun olmaz', () => {
        const pattern = extractPattern(movesFixture(), 'move');
        expect(matchPattern(movesFixture(), pattern)).toBe(true);
        const shortPattern = {opcode: 'event_whenflagclicked', fields: {}, inputs: {}, next: null};
        expect(matchPattern(movesFixture(), shortPattern)).toBe(true);
    });

    test('atlanan blok eşleşmeyi bozar', () => {
        const pattern = {
            opcode: 'event_whenflagclicked', fields: {}, inputs: {},
            next: {opcode: 'motion_turnright', fields: {}, inputs: {}, next: null}
        };
        expect(matchPattern(movesFixture(), pattern)).toBe(false);
    });

    test('tam değer eşleşir, farklı değer eşleşmez, ANY her değerle eşleşir', () => {
        const exact = extractPattern(movesFixture(), 'move', {exactLiterals: true});
        expect(matchPattern(movesFixture(), exact)).toBe(true);

        const other = movesFixture();
        other.n10.fields.NUM.value = '20';
        expect(matchPattern(other, exact)).toBe(false);
        expect(matchPattern(other, extractPattern(movesFixture(), 'move'))).toBe(true);
    });

    test('değer yerine reporter konursa: tam değer eşleşmez, ANY eşleşir', () => {
        const exact = extractPattern(reporterFixture(), 'goto', {exactLiterals: true});
        exact.inputs.X = {literal: '0'};
        expect(matchPattern(reporterFixture(), exact)).toBe(false);

        const loose = extractPattern(reporterFixture(), 'goto');
        loose.inputs.X = {literal: ANY};
        expect(matchPattern(reporterFixture(), loose)).toBe(true);
    });

    test('kalıp reporter ister ama öğrencide sayı varsa eşleşmez', () => {
        const pattern = extractPattern(reporterFixture(), 'goto');
        const student = toMap([
            block('goto', 'motion_gotoxy', {
                topLevel: true,
                inputs: {X: literalInput('X', 'nx'), Y: literalInput('Y', 'ny')}
            }),
            num('nx', '3', 'goto'),
            num('ny', '5', 'goto')
        ]);
        expect(matchPattern(student, pattern)).toBe(false);
    });

    test('dolu olması gereken giriş boşsa eşleşmez', () => {
        const pattern = extractPattern(movesFixture(), 'move');
        const student = toMap([block('move', 'motion_movesteps', {topLevel: true})]);
        expect(matchPattern(student, pattern)).toBe(false);
    });

    test('farklı alan değeri eşleşmez', () => {
        const pattern = extractPattern(keyFixture(), 'key');
        const other = keyFixture();
        other.key.fields.KEY_OPTION.value = 'a';
        expect(matchPattern(other, pattern)).toBe(false);
    });

    test('boş çalışma alanı çökmeden false döner', () => {
        expect(matchPattern({}, extractPattern(movesFixture(), 'hat'))).toBe(false);
    });

    test('gölge bloklar kalıbın kökü olarak sayılmaz', () => {
        const pattern = {opcode: 'math_number', fields: {NUM: ANY}, inputs: {}, next: null};
        expect(matchPattern(movesFixture(), pattern)).toBe(false);
    });
});

describe('workspaceMatches', () => {
    const target = blocks => ({blocks: {_blocks: blocks}});

    test('herhangi bir hedefte (sahne dahil) kalıp varsa true', () => {
        const pattern = extractPattern(movesFixture(), 'hat');
        const vm = {runtime: {targets: [target({}), target(movesFixture())]}};
        expect(workspaceMatches(vm, pattern)).toBe(true);
    });

    test('hiçbir hedefte yoksa false', () => {
        const pattern = extractPattern(movesFixture(), 'hat');
        const vm = {runtime: {targets: [target({}), target(keyFixture())]}};
        expect(workspaceMatches(vm, pattern)).toBe(false);
        expect(workspaceMatches({runtime: {targets: []}}, pattern)).toBe(false);
    });
});

describe('workspaceMatches: kukla kapsamı', () => {
    const named = (name, blocks, extra) => Object.assign({
        isStage: false, getName: () => name, blocks: {_blocks: blocks}
    }, extra);
    const pattern = extractPattern(movesFixture(), 'hat');

    test('kukla adı verilirse yalnızca o kuklada aranır', () => {
        const vm = {runtime: {targets: [named('Cool Cat', {}), named('Star', movesFixture())]}};
        expect(workspaceMatches(vm, pattern)).toBe(true);
        expect(workspaceMatches(vm, pattern, 'Star')).toBe(true);
        expect(workspaceMatches(vm, pattern, 'Cool Cat')).toBe(false);
        expect(workspaceMatches(vm, pattern, 'Yok')).toBe(false);
    });

    test('"Sahne" adı sahne hedefini bulur', () => {
        const vm = {runtime: {targets: [
            named('Stage', movesFixture(), {isStage: true}),
            named('Cool Cat', {})
        ]}};
        expect(workspaceMatches(vm, pattern, 'Sahne')).toBe(true);
        expect(workspaceMatches(vm, pattern, 'Cool Cat')).toBe(false);
    });

    test('boş ya da verilmeyen kukla adı tüm hedeflerde arar', () => {
        const vm = {runtime: {targets: [named('Star', movesFixture())]}};
        expect(workspaceMatches(vm, pattern, '')).toBe(true);
        expect(workspaceMatches(vm, pattern, null)).toBe(true);
    });
});

