/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {openStore} = require('../../server/src/db');

describe('store', () => {
    test('yönetici oturum iptal zamanı varsayılan 0, ayarlanır ve okunur', () => {
        const store = openStore(':memory:');
        expect(store.getRevokedBefore()).toBe(0);
        store.setRevokedBefore(98765);
        expect(store.getRevokedBefore()).toBe(98765);
        store.setRevokedBefore(111);
        expect(store.getRevokedBefore()).toBe(111);
        store.close();
    });

    test('hesap deposu bağlıdır', () => {
        const store = openStore(':memory:');
        expect(typeof store.accounts.registerTeacher).toBe('function');
        store.close();
    });

    test('veri kalıcıdır (dosya)', () => {
        const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sk-db-')), 'sarikedi.db');
        const first = openStore(file);
        first.setRevokedBefore(4242);
        first.close();
        const second = openStore(file);
        expect(second.getRevokedBefore()).toBe(4242);
        second.close();
    });

    test('eski dersler tablosu varsa dokunulmaz (veri silme işi ayrı betikte)', () => {
        const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sk-db-')), 'sarikedi.db');
        const first = openStore(file);
        first.db.exec("CREATE TABLE lessons (id TEXT PRIMARY KEY, data TEXT)");
        first.db.exec("INSERT INTO lessons (id, data) VALUES ('a', '{}')");
        first.close();
        const second = openStore(file);
        expect(second.db.prepare('SELECT COUNT(*) AS n FROM lessons').get().n).toBe(1);
        second.close();
    });
});
