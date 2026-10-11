import {isAuthorMode} from '../../../src/lib/lessons/author-url';

describe('isAuthorMode', () => {
    test('?author varsa true', () => {
        ['?author', '?author=1', '?a=1&author', '?lessons=sample&author=true'].forEach(search => {
            expect(isAuthorMode(search)).toBe(true);
        });
    });

    test('yoksa false', () => {
        ['', '?', '?authors=1', '?a=author', null, undefined].forEach(search => {
            expect(isAuthorMode(search)).toBe(false);
        });
    });
});
