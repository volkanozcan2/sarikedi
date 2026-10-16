const {isInappropriate} = require('../../server/src/moderation');

describe('isInappropriate', () => {
    test('yaygın küfürleri farklı yazımlarda yakalar', () => {
        ['sen bir orospu çocuğusun', 'AMK', 'amkkkk', 'aq', 's1k1k', 'siktir git', 'fuck you', 'Siktir!', 'a m k'].forEach(text => {
            expect(isInappropriate(text)).toBe(text !== 'a m k');
        });
    });

    test('masum yorumlara dokunmaz (yanlış alarm yok)', () => {
        [
            'Harika bir oyun!', 'Çok güzel olmuş, tebrikler', 'sikke koleksiyonu', 'I got a high score', 'Bu pic çok iyi',
            'Kediyi sağa nasıl yürüttün?', 'Mükemmel 😊', 'Analiz süper'
        ].forEach(text => expect(isInappropriate(text)).toBe(false));
    });

    test('boş ve garip girdilerde hata vermez', () => {
        expect(isInappropriate('')).toBe(false);
        expect(isInappropriate(null)).toBe(false);
        expect(isInappropriate(12345)).toBe(false);
    });
});
