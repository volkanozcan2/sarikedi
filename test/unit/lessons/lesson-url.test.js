import {getLessonIdFromSearch} from '../../../src/lib/lessons/lesson-url';

describe('getLessonIdFromSearch', () => {
    test('geçerli kimlik', () => {
        expect(getLessonIdFromSearch('?lesson=ilk-ders')).toBe('ilk-ders');
        expect(getLessonIdFromSearch('?a=1&lesson=tekrar-et')).toBe('tekrar-et');
    });

    test('yok, boş ya da geçersiz kimlik null döner', () => {
        ['', '?', '?lesson=', '?lesson=Büyük Harf', '?lesson=../x', '?lesson=a&lesson=b', null].forEach(search => {
            expect(getLessonIdFromSearch(search)).toBeNull();
        });
    });
});
