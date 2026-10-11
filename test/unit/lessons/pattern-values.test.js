import {ANY, extractPattern} from '../../../src/lib/lessons/block-pattern';
import {listPatternValues, setPatternValue, countPatternBlocks} from '../../../src/lib/lessons/pattern-values';
import {movesFixture, repeatFixture, menuFixture, keyFixture, reporterFixture} from './helpers/blocks-fixture';

describe('listPatternValues', () => {
    test('giriş değerleri, alanlar ve next zinciri listelenir', () => {
        const pattern = extractPattern(movesFixture(), 'hat');
        const values = listPatternValues(pattern);
        expect(values.map(v => v.label)).toEqual(['motion_movesteps.STEPS', 'motion_turnright.DEGREES']);
        expect(values[0]).toEqual({
            path: ['next', 'inputs', 'STEPS', 'literal'], label: 'motion_movesteps.STEPS',
            kind: 'literal', any: true, value: ''
        });
    });

    test('alanlar ve menü değerleri tam değerdir', () => {
        const key = listPatternValues(extractPattern(keyFixture(), 'key'));
        expect(key).toEqual([{
            path: ['fields', 'KEY_OPTION'], label: 'event_whenkeypressed.KEY_OPTION',
            kind: 'field', any: false, value: 'space'
        }]);
        const menu = listPatternValues(extractPattern(menuFixture(), 'goto'));
        expect(menu[0]).toEqual(expect.objectContaining({kind: 'literal', any: false, value: '_random_'}));
    });

    test('iç içe düğümler (substack, reporter) gezilir', () => {
        const repeat = listPatternValues(extractPattern(repeatFixture(), 'rep'));
        expect(repeat.map(v => v.label)).toEqual(['control_repeat.TIMES', 'motion_movesteps.STEPS']);
        const reporter = listPatternValues(extractPattern(reporterFixture(), 'goto'));
        expect(reporter.map(v => v.label)).toEqual([
            'operator_add.NUM1', 'operator_add.NUM2', 'motion_gotoxy.Y'
        ]);
    });

    test('exactLiterals ile gelen değerler tam değer olarak listelenir', () => {
        const values = listPatternValues(extractPattern(movesFixture(), 'move', {exactLiterals: true}));
        expect(values.map(v => [v.any, v.value])).toEqual([[false, '10'], [false, '15']]);
    });
});

describe('setPatternValue', () => {
    test('değeri değiştirir, girdiyi bozmaz', () => {
        const pattern = extractPattern(movesFixture(), 'move');
        const before = JSON.stringify(pattern);
        const exact = setPatternValue(pattern, ['inputs', 'STEPS', 'literal'], '25');
        expect(exact.inputs.STEPS).toEqual({literal: '25'});
        expect(JSON.stringify(pattern)).toBe(before);
        const back = setPatternValue(exact, ['inputs', 'STEPS', 'literal'], ANY);
        expect(back.inputs.STEPS).toEqual({literal: {any: true}});
    });

    test('alan değeri ve sayı değeri metne çevrilir', () => {
        const pattern = extractPattern(keyFixture(), 'key');
        expect(setPatternValue(pattern, ['fields', 'KEY_OPTION'], 5).fields.KEY_OPTION).toBe('5');
        expect(setPatternValue(pattern, ['fields', 'KEY_OPTION'], {any: true}).fields.KEY_OPTION).toEqual({any: true});
    });

    test('geçersiz yol atar', () => {
        const pattern = extractPattern(movesFixture(), 'move');
        expect(() => setPatternValue(pattern, ['inputs', 'YOK', 'literal'], '1')).toThrow('Değer yolu geçersiz');
        expect(() => setPatternValue(pattern, [], '1')).toThrow('Değer yolu geçersiz');
        expect(() => setPatternValue(pattern, ['next', 'next', 'next', 'fields', 'A'], '1')).toThrow('Değer yolu geçersiz');
    });

    test('JSON gidiş-dönüşünde aynı kalır', () => {
        const pattern = setPatternValue(extractPattern(movesFixture(), 'move'), ['inputs', 'STEPS', 'literal'], '7');
        expect(JSON.parse(JSON.stringify(pattern))).toEqual(pattern);
    });
});

describe('countPatternBlocks', () => {
    test('düğümleri sayar', () => {
        expect(countPatternBlocks(extractPattern(movesFixture(), 'hat'))).toBe(3);
        expect(countPatternBlocks(extractPattern(reporterFixture(), 'goto'))).toBe(2);
        expect(countPatternBlocks(extractPattern(repeatFixture(), 'rep'))).toBe(2);
    });
});
