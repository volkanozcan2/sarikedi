/**
 * SQLite deposu: ayarlar (yönetici oturum iptali), hesaplar, projeler ve paylaşım tabloları.
 */

const Database = require('better-sqlite3');
const {ValidationError, NotFoundError, ConflictError} = require('./errors');
const {createAccounts} = require('./accounts');

const openStore = file => {
    const db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

    const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const setSettingStmt = db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );

    const getRevokedBefore = () => {
        const row = getSettingStmt.get('revoked_before');
        return row ? Number(row.value) || 0 : 0;
    };
    const setRevokedBefore = ms => setSettingStmt.run('revoked_before', String(ms));

    return {
        db: db,
        accounts: createAccounts(db),
        getRevokedBefore: getRevokedBefore,
        setRevokedBefore: setRevokedBefore,
        close: () => db.close()
    };
};

module.exports = {
    openStore,
    ValidationError,
    NotFoundError,
    ConflictError
};
