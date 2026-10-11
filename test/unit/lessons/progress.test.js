import {createProgressStore} from '../../../src/lib/lessons/progress';

const fakeStorage = initial => {
    const data = initial ? {'sarikedi.progress': initial} : {};
    return {
        data: data,
        getItem: key => (key in data ? data[key] : null),
        setItem: (key, value) => {
            data[key] = value;
        }
    };
};

const brokenStorage = () => ({
    getItem: () => {
        throw new Error('erişim yok');
    },
    setItem: () => {
        throw new Error('erişim yok');
    }
});

describe('createProgressStore', () => {
    test('kayıt yoksa varsayılan döner', () => {
        const store = createProgressStore(fakeStorage());
        expect(store.get('ilk-ders')).toEqual({step: 0, done: false});
    });

    test('kaydeder ve geri okur', () => {
        const storage = fakeStorage();
        const store = createProgressStore(storage);
        store.save('ilk-ders', {step: 2, done: false});
        expect(store.get('ilk-ders')).toEqual({step: 2, done: false});
        expect(JSON.parse(storage.data['sarikedi.progress'])['ilk-ders']).toEqual({step: 2, done: false});
        expect(createProgressStore(storage).get('ilk-ders')).toEqual({step: 2, done: false});
    });

    test('reset ilerlemeyi siler', () => {
        const store = createProgressStore(fakeStorage());
        store.save('ilk-ders', {step: 3, done: true});
        store.reset('ilk-ders');
        expect(store.get('ilk-ders')).toEqual({step: 0, done: false});
    });

    test('depolama hata verirse bellekte çalışır', () => {
        const store = createProgressStore(brokenStorage());
        store.save('ilk-ders', {step: 1, done: false});
        expect(store.get('ilk-ders')).toEqual({step: 1, done: false});
    });

    test('depolama yoksa (null) bellekte çalışır', () => {
        const store = createProgressStore(null);
        store.save('ilk-ders', {step: 4, done: true});
        expect(store.get('ilk-ders')).toEqual({step: 4, done: true});
    });

    test('bozuk JSON ve beklenmeyen biçimler yok sayılır', () => {
        ['x', '[1,2]', '5', 'null', '{"ilk-ders": 5}', '{"ilk-ders": {"step": -3, "done": "evet"}}'].forEach(raw => {
            const store = createProgressStore(fakeStorage(raw));
            expect(store.get('ilk-ders')).toEqual({step: 0, done: false});
        });
    });

    test('geçersiz kimlikler reddedilir (__proto__ dahil)', () => {
        const storage = fakeStorage();
        const store = createProgressStore(storage);
        ['__proto__', 'Büyük', '', 'a b'].forEach(id => {
            store.save(id, {step: 9, done: true});
            expect(store.get(id)).toEqual({step: 0, done: false});
        });
        expect(storage.data['sarikedi.progress']).toBeUndefined();
        expect(({}).step).toBeUndefined();
    });

    test('adım değeri sayıya zorlanır', () => {
        const store = createProgressStore(fakeStorage());
        store.save('ilk-ders', {step: 1.5, done: 'evet'});
        expect(store.get('ilk-ders')).toEqual({step: 0, done: false});
    });
});
