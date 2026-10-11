import {ANY, isAny, extractPattern} from '../../../src/lib/lessons/block-pattern';
import {
    block, num, toMap, literalInput,
    movesFixture, repeatFixture, reporterFixture, menuFixture, keyFixture
} from './helpers/blocks-fixture';

describe('extractPattern', () => {
    test('ANY ve isAny', () => {
        expect(ANY).toEqual({any: true});
        expect(isAny(ANY)).toBe(true);
        expect(isAny({any: true})).toBe(true);
        expect(isAny('10')).toBe(false);
        expect(isAny(null)).toBe(false);
    });

    test('sayı değerleri varsayılan olarak ANY olur', () => {
        const pattern = extractPattern(movesFixture(), 'move');
        expect(pattern).toEqual({
            opcode: 'motion_movesteps',
            fields: {},
            inputs: {STEPS: {literal: ANY}},
            next: {
                opcode: 'motion_turnright',
                fields: {},
                inputs: {DEGREES: {literal: ANY}},
                next: null
            }
        });
    });

    test('exactLiterals: true ise sayılar tam değer olur', () => {
        const pattern = extractPattern(movesFixture(), 'move', {exactLiterals: true});
        expect(pattern.inputs.STEPS).toEqual({literal: '10'});
        expect(pattern.next.inputs.DEGREES).toEqual({literal: '15'});
    });

    test('şapka bloktan başlayınca zincir next ile bağlanır', () => {
        const pattern = extractPattern(movesFixture(), 'hat');
        expect(pattern.opcode).toBe('event_whenflagclicked');
        expect(pattern.next.opcode).toBe('motion_movesteps');
        expect(pattern.next.next.opcode).toBe('motion_turnright');
        expect(pattern.next.next.next).toBeNull();
    });

    test('menü gölge blokları ve alanlar tam değer kalır', () => {
        expect(extractPattern(menuFixture(), 'goto').inputs.TO).toEqual({literal: '_random_'});
        expect(extractPattern(keyFixture(), 'key').fields).toEqual({KEY_OPTION: 'space'});
    });

    test('girişteki reporter iç içe düğüm olur', () => {
        const pattern = extractPattern(reporterFixture(), 'goto');
        expect(pattern.inputs.Y).toEqual({literal: ANY});
        expect(pattern.inputs.X.opcode).toBe('operator_add');
        expect(pattern.inputs.X.inputs.NUM1).toEqual({literal: ANY});
    });

    test('SUBSTACK içindeki bloklar düğüm olur', () => {
        const pattern = extractPattern(repeatFixture(), 'rep');
        expect(pattern.inputs.TIMES).toEqual({literal: ANY});
        expect(pattern.inputs.SUBSTACK.opcode).toBe('motion_movesteps');
    });

    test('olmayan blok için Türkçe hata atar', () => {
        expect(() => extractPattern(movesFixture(), 'yok')).toThrow('Blok bulunamadı: yok');
    });

    test('500 bloktan büyük kalıp reddedilir', () => {
        const list = [];
        for (let i = 0; i < 501; i++) {
            list.push(block(`b${i}`, 'motion_movesteps', {next: i < 500 ? `b${i + 1}` : null}));
        }
        expect(() => extractPattern(toMap(list), 'b0')).toThrow('Kalıp çok büyük');
    });

    test('kalıp JSON gidiş-dönüşünde aynı kalır', () => {
        const pattern = extractPattern(reporterFixture(), 'goto');
        expect(JSON.parse(JSON.stringify(pattern))).toEqual(pattern);
    });
});
