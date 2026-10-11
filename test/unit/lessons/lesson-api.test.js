import {createLessonApi, isSampleMode} from '../../../src/lib/lessons/lesson-api';
import {SAMPLE_LESSONS} from '../../../src/lib/lessons/sample-lessons';
import {validateLesson} from '../../../src/lib/lessons/schema';

const respond = (body, ok, status) => Promise.resolve({
    ok: ok !== false,
    status: status || 200,
    json: () => Promise.resolve(body)
});

describe('sample-lessons', () => {
    test('örnek dersler şemaya uygundur', () => {
        expect(SAMPLE_LESSONS.length).toBeGreaterThanOrEqual(2);
        SAMPLE_LESSONS.forEach(lesson => {
            const result = validateLesson(lesson);
            expect(result.errors).toEqual([]);
        });
    });
});

describe('isSampleMode', () => {
    test('?lessons=sample', () => {
        expect(isSampleMode('?lessons=sample')).toBe(true);
        expect(isSampleMode('?a=1&lessons=sample')).toBe(true);
        expect(isSampleMode('?lessons=sample&a=1')).toBe(true);
        expect(isSampleMode('?lessons=other')).toBe(false);
        expect(isSampleMode('')).toBe(false);
        expect(isSampleMode(null)).toBe(false);
    });
});

describe('createLessonApi (örnek mod)', () => {
    const api = createLessonApi({sample: true});

    test('liste özetleri order sırasında gelir', () => api.listLessons().then(list => {
        expect(list.map(item => item.id)).toEqual(
            SAMPLE_LESSONS.slice().sort((a, b) => a.order - b.order).map(l => l.id)
        );
        expect(list[0]).toEqual(expect.objectContaining({
            title: expect.any(String), level: expect.any(String), stepCount: expect.any(Number)
        }));
        expect(list[0].steps).toBeUndefined();
    }));

    test('ders id ile gelir', () => api.getLesson('ilk-ders').then(lesson => {
        expect(lesson.id).toBe('ilk-ders');
        expect(lesson.steps.length).toBeGreaterThan(0);
    }));

    test('bilinmeyen ders reddedilir', () => api.getLesson('yok').then(
        () => {
            throw new Error('reddedilmeliydi');
        },
        error => expect(error.message).toBe('Ders bulunamadı')
    ));
});

describe('createLessonApi (sunucu)', () => {
    const summary = overrides => Object.assign({
        id: 'ilk-ders', title: 'İlk ders', description: '', level: 'baslangic',
        cover: null, order: 0, stepCount: 3
    }, overrides);

    test('listeyi alır, sıralar, geçersiz kayıtları ve güvensiz kapakları temizler', () => {
        const fetchFn = jest.fn(() => respond([
            summary({id: 'b', order: 2}),
            summary({id: 'a', order: 1, cover: 'javascript:alert(1)'}),
            summary({id: 'c', order: 3, cover: '/uploads/c.png'}),
            {id: 'bozuk'},
            null
        ]));
        return createLessonApi({fetchFn: fetchFn}).listLessons().then(list => {
            expect(fetchFn).toHaveBeenCalledWith('/api/lessons');
            expect(list.map(item => item.id)).toEqual(['a', 'b', 'c']);
            expect(list[0].cover).toBeNull();
            expect(list[2].cover).toBe('/uploads/c.png');
        });
    });

    test('liste dizi değilse Türkçe hata', () => createLessonApi({fetchFn: () => respond({x: 1})}).listLessons()
        .then(() => {
            throw new Error('reddedilmeliydi');
        }, error => expect(error.message).toBe('Ders listesi geçersiz')));

    test('HTTP hatası', () => createLessonApi({fetchFn: () => respond({}, false, 500)}).listLessons()
        .then(() => {
            throw new Error('reddedilmeliydi');
        }, error => expect(error.message).toBe('Dersler yüklenemedi (500)')));

    test('ağ hatası', () => createLessonApi({fetchFn: () => Promise.reject(new Error('offline'))}).listLessons()
        .then(() => {
            throw new Error('reddedilmeliydi');
        }, error => expect(error.message).toBe('Dersler şu an yüklenemedi')));

    test('ders alınır ve şemaya karşı doğrulanır', () => {
        const fetchFn = jest.fn(() => respond(SAMPLE_LESSONS[0]));
        return createLessonApi({fetchFn: fetchFn, baseUrl: '/x'}).getLesson('ilk ders/1').then(lesson => {
            expect(fetchFn).toHaveBeenCalledWith('/x/lessons/ilk%20ders%2F1');
            expect(lesson.id).toBe(SAMPLE_LESSONS[0].id);
        });
    });

    test('geçersiz ders reddedilir', () => {
        const bad = Object.assign({}, SAMPLE_LESSONS[0], {cover: 'javascript:alert(1)'});
        return createLessonApi({fetchFn: () => respond(bad)}).getLesson('ilk-ders').then(
            () => {
                throw new Error('reddedilmeliydi');
            },
            error => expect(error.message).toContain('Ders verisi geçersiz: cover')
        );
    });
});
