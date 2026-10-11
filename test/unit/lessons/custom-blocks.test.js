import {extractPattern, matchPattern} from '../../../src/lib/lessons/block-pattern';
import {block, num, toMap, literalInput} from './helpers/blocks-fixture';

const definition = proccode => toMap([
    block('def', 'procedures_definition', {
        topLevel: true,
        inputs: {custom_block: {name: 'custom_block', block: 'proto', shadow: 'proto'}}
    }),
    block('proto', 'procedures_prototype', {
        shadow: true,
        parent: 'def',
        mutation: {tagName: 'mutation', proccode: proccode, argumentids: '[]'}
    })
]);

const call = (proccode, argId) => toMap([
    block('call', 'procedures_call', {
        topLevel: true,
        mutation: {tagName: 'mutation', proccode: proccode, argumentids: `["${argId}"]`},
        inputs: {[argId]: literalInput(argId, 'n')}
    }),
    num('n', '5', 'call')
]);

describe('özel bloklar (procedures)', () => {
    test('tanım kalıbı yalnızca aynı adlı tanımla eşleşir', () => {
        const pattern = extractPattern(definition('zıpla'), 'def');
        expect(matchPattern(definition('zıpla'), pattern)).toBe(true);
        expect(matchPattern(definition('koş'), pattern)).toBe(false);
    });

    test('çağrı kalıbı aynı adlı çağrıyla eşleşir, argüman kimliği farklı olsa da', () => {
        const pattern = extractPattern(call('zıpla %s', 'argA'), 'call');
        expect(matchPattern(call('zıpla %s', 'argB'), pattern)).toBe(true);
    });

    test('çağrı kalıbı başka adlı çağrıyla eşleşmez', () => {
        const pattern = extractPattern(call('zıpla %s', 'argA'), 'call');
        expect(matchPattern(call('koş %s', 'argA'), pattern)).toBe(false);
    });
});
