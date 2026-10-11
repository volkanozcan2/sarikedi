/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {openStore, ValidationError, NotFoundError, ConflictError} = require('../../server/src/db');
const {validLesson} = require('./helpers');

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sk-db-'));

describe('store', () => {
    let store;

    beforeEach(() => {
        store = openStore(':memory:');
    });

    afterEach(() => store.close());

    test('oluştur, oku, listele', () => {
        store.create(validLesson({id: 'b-ders', order: 2, title: 'B'}));
        store.create(validLesson({id: 'a-ders', order: 1, title: 'A', cover: '/uploads/a.png'}));
        store.create(validLesson({id: 'gizli', order: 0, published: false}));
        expect(store.get('a-ders').title).toBe('A');
        expect(store.get('yok')).toBeNull();
        expect(store.listPublished().map(l => l.id)).toEqual(['a-ders', 'b-ders']);
        expect(store.listPublished()[0]).toEqual({
            id: 'a-ders', title: 'A', description: 'Açıklama', level: 'baslangic',
            cover: '/uploads/a.png', order: 1, stepCount: 1
        });
        const all = store.listAll();
        expect(all.map(l => l.id)).toEqual(['gizli', 'a-ders', 'b-ders']);
        expect(all[0].published).toBe(false);
        expect(typeof all[0].updatedAt).toBe('string');
    });

    test('aynı sıradaki dersler kimliğe göre sıralanır', () => {
        store.create(validLesson({id: 'z-ders', order: 1}));
        store.create(validLesson({id: 'a-ders', order: 1}));
        expect(store.listPublished().map(l => l.id)).toEqual(['a-ders', 'z-ders']);
    });

    test('var olan kimlikle oluşturma ConflictError', () => {
        store.create(validLesson());
        expect(() => store.create(validLesson())).toThrow(ConflictError);
        expect(() => store.create(validLesson())).toThrow('Bu kimlikte bir ders zaten var');
    });

    test('geçersiz ders ValidationError ve hata listesi', () => {
        let error;
        try {
            store.create(validLesson({level: 'uzman', title: ''}));
        } catch (e) {
            error = e;
        }
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.errors.join('\n')).toContain('level:');
        expect(error.errors.join('\n')).toContain('title:');
        expect(store.listAll()).toHaveLength(0);
    });

    test('şema dışı girişlerde atmak yerine ValidationError', () => {
        [null, undefined, [], 5, 'x', {}, {id: '__proto__'}].forEach(bad => {
            expect(() => store.create(bad)).toThrow(ValidationError);
        });
    });

    test('replace günceller; yoksa NotFoundError; kimlik uyuşmazlığı ValidationError', () => {
        store.create(validLesson());
        store.replace('ilk-ders', validLesson({title: 'Yeni başlık'}));
        expect(store.get('ilk-ders').title).toBe('Yeni başlık');
        expect(() => store.replace('yok', validLesson({id: 'yok'}))).toThrow(NotFoundError);
        expect(() => store.replace('ilk-ders', validLesson({id: 'baska'}))).toThrow(ValidationError);
        expect(store.get('ilk-ders').title).toBe('Yeni başlık');
    });

    test('remove', () => {
        store.create(validLesson());
        expect(store.remove('ilk-ders')).toBe(true);
        expect(store.remove('ilk-ders')).toBe(false);
        expect(store.get('ilk-ders')).toBeNull();
    });

    test('reorder derslerin sırasını (JSON dahil) günceller', () => {
        store.create(validLesson({id: 'a-ders', order: 0}));
        store.create(validLesson({id: 'b-ders', order: 1}));
        store.create(validLesson({id: 'c-ders', order: 2}));
        store.reorder(['c-ders', 'a-ders', 'b-ders']);
        expect(store.listPublished().map(l => l.id)).toEqual(['c-ders', 'a-ders', 'b-ders']);
        expect(store.get('c-ders').order).toBe(0);
        expect(store.get('b-ders').order).toBe(2);
    });

    test('reorder geçersiz girişleri reddeder ve hiçbir şeyi değiştirmez', () => {
        store.create(validLesson({id: 'a-ders', order: 0}));
        store.create(validLesson({id: 'b-ders', order: 1}));
        expect(() => store.reorder('a-ders')).toThrow(ValidationError);
        expect(() => store.reorder(['a-ders', 'a-ders'])).toThrow(ValidationError);
        expect(() => store.reorder([1, 2])).toThrow(ValidationError);
        expect(() => store.reorder(['b-ders', 'yok'])).toThrow(NotFoundError);
        expect(store.get('b-ders').order).toBe(1);
    });

    test('veri kalıcıdır (dosya)', () => {
        const file = path.join(tmpDir(), 'test.db');
        const first = openStore(file);
        first.create(validLesson());
        first.close();
        const second = openStore(file);
        expect(second.get('ilk-ders').title).toBe('İlk ders');
        second.close();
    });
});

describe('oturum iptali', () => {
    test('revokedBefore kalıcıdır ve varsayılan 0', () => {
        const file = path.join(tmpDir(), 'rev.db');
        const first = openStore(file);
        expect(first.getRevokedBefore()).toBe(0);
        first.setRevokedBefore(12345);
        first.close();
        const second = openStore(file);
        expect(second.getRevokedBefore()).toBe(12345);
        second.close();
    });
});

describe('seedFromDir', () => {
    let store;
    let dir;

    beforeEach(() => {
        store = openStore(':memory:');
        dir = tmpDir();
    });

    afterEach(() => store.close());

    const write = (name, content) => fs.writeFileSync(path.join(dir, name), typeof content === 'string' ?
        content : JSON.stringify(content));

    test('geçerli dersleri ekler, alfabetik sırayla', () => {
        write('b.json', validLesson({id: 'b-ders'}));
        write('a.json', validLesson({id: 'a-ders'}));
        write('notlar.txt', 'ders değil');
        const result = store.seedFromDir(dir);
        expect(result).toEqual({added: ['a-ders', 'b-ders'], skipped: [], invalid: []});
        expect(store.get('a-ders')).not.toBeNull();
    });

    test('mevcut (panelden düzenlenmiş olabilecek) ders ezilmez', () => {
        store.create(validLesson({title: 'Düzenlenmiş başlık'}));
        write('ders.json', validLesson({title: 'Tohum başlığı'}));
        const result = store.seedFromDir(dir);
        expect(result.skipped).toEqual(['ilk-ders']);
        expect(result.added).toEqual([]);
        expect(store.get('ilk-ders').title).toBe('Düzenlenmiş başlık');
    });

    test('aynı kimlikli iki dosyada ilki eklenir, ikincisi atlanır', () => {
        write('a.json', validLesson({title: 'Birinci'}));
        write('b.json', validLesson({title: 'İkinci'}));
        const result = store.seedFromDir(dir);
        expect(result.added).toEqual(['ilk-ders']);
        expect(result.skipped).toEqual(['ilk-ders']);
        expect(store.get('ilk-ders').title).toBe('Birinci');
    });

    test('bozuk JSON, şema dışı ve çok büyük dosyalar atlanır, sunucu çökmez', () => {
        write('bozuk.json', '{ bu json değil');
        write('sema.json', validLesson({level: 'uzman'}));
        write('dizi.json', '[]');
        write('buyuk.json', JSON.stringify(validLesson({description: 'x'.repeat(1.1 * 1024 * 1024)})));
        write('iyi.json', validLesson({id: 'iyi-ders'}));
        const result = store.seedFromDir(dir);
        expect(result.added).toEqual(['iyi-ders']);
        expect(result.invalid.map(i => i.file).sort()).toEqual(['bozuk.json', 'buyuk.json', 'dizi.json', 'sema.json']);
        result.invalid.forEach(item => expect(item.errors.length).toBeGreaterThan(0));
    });

    test('silinen tohum ders yeniden başlatmada geri gelmez', () => {
        write('ders.json', validLesson());
        expect(store.seedFromDir(dir).added).toEqual(['ilk-ders']);
        expect(store.remove('ilk-ders')).toBe(true);
        const second = store.seedFromDir(dir);
        expect(second.added).toEqual([]);
        expect(second.skipped).toEqual(['ilk-ders']);
        expect(store.get('ilk-ders')).toBeNull();
    });

    test('veritabanında zaten olan ders de tohum olarak işaretlenir (sonradan silinse de geri gelmez)', () => {
        store.create(validLesson());
        write('ders.json', validLesson());
        store.seedFromDir(dir);
        store.remove('ilk-ders');
        expect(store.seedFromDir(dir).added).toEqual([]);
    });

    test('olmayan klasör boş sonuç verir', () => {
        expect(store.seedFromDir(path.join(dir, 'yok'))).toEqual({added: [], skipped: [], invalid: []});
    });
});
