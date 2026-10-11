/**
 * Dersleri SQLite'ta saklar. Ders JSON'u `data` sütununda durur; sıralama ve
 * listeleme için birkaç alan ayrıca sütunlardadır. Her yazma ders şemasından geçer.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const {validateLesson} = require('./lib/schema');

const MAX_SEED_FILE_BYTES = 1024 * 1024;

class ValidationError extends Error {
    constructor (errors) {
        super('Ders geçersiz');
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

class NotFoundError extends Error {
    constructor (message) {
        super(message || 'Ders bulunamadı');
        this.name = 'NotFoundError';
    }
}

class ConflictError extends Error {
    constructor (message) {
        super(message || 'Bu kimlikte bir ders zaten var');
        this.name = 'ConflictError';
    }
}

const summarize = lesson => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    level: lesson.level,
    cover: lesson.cover || null,
    order: lesson.order,
    stepCount: lesson.steps.length
});

const assertValid = lesson => {
    const result = validateLesson(lesson);
    if (!result.valid) throw new ValidationError(result.errors);
};

const openStore = file => {
    const db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.exec(`CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        order_index INTEGER NOT NULL,
        published INTEGER NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`);

    db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    // Tohumdan eklenmiş (ya da zaten var olan) kimlikler: sonradan silinseler de yeniden eklenmez
    db.exec('CREATE TABLE IF NOT EXISTS seeded (id TEXT PRIMARY KEY)');

    const insertStmt = db.prepare(
        'INSERT INTO lessons (id, order_index, published, data, updated_at) VALUES (?, ?, ?, ?, ?)'
    );
    const updateStmt = db.prepare(
        'UPDATE lessons SET order_index = ?, published = ?, data = ?, updated_at = ? WHERE id = ?'
    );
    const getStmt = db.prepare('SELECT data FROM lessons WHERE id = ?');
    const existsStmt = db.prepare('SELECT 1 FROM lessons WHERE id = ?');
    const deleteStmt = db.prepare('DELETE FROM lessons WHERE id = ?');
    const publishedStmt = db.prepare('SELECT data FROM lessons WHERE published = 1 ORDER BY order_index, id');
    const allStmt = db.prepare('SELECT data, published, updated_at FROM lessons ORDER BY order_index, id');

    const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const setSettingStmt = db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    const seededStmt = db.prepare('SELECT 1 FROM seeded WHERE id = ?');
    const markSeededStmt = db.prepare('INSERT OR IGNORE INTO seeded (id) VALUES (?)');

    const getRevokedBefore = () => {
        const row = getSettingStmt.get('revoked_before');
        return row ? Number(row.value) || 0 : 0;
    };
    const setRevokedBefore = ms => setSettingStmt.run('revoked_before', String(ms));

    const exists = id => Boolean(existsStmt.get(id));
    const now = () => new Date().toISOString();

    const create = lesson => {
        assertValid(lesson);
        if (exists(lesson.id)) throw new ConflictError();
        insertStmt.run(lesson.id, lesson.order, lesson.published ? 1 : 0, JSON.stringify(lesson), now());
    };

    const replace = (id, lesson) => {
        assertValid(lesson);
        if (lesson.id !== id) throw new ValidationError(['id: adresteki kimlikle aynı olmalı']);
        if (!exists(id)) throw new NotFoundError();
        updateStmt.run(lesson.order, lesson.published ? 1 : 0, JSON.stringify(lesson), now(), id);
    };

    const get = id => {
        const row = getStmt.get(id);
        return row ? JSON.parse(row.data) : null;
    };

    const remove = id => deleteStmt.run(id).changes > 0;

    const reorder = ids => {
        if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
            throw new ValidationError(['ids: kimliklerden oluşan bir dizi olmalı']);
        }
        if (new Set(ids).size !== ids.length) throw new ValidationError(['ids: tekrar eden kimlik var']);
        db.transaction(() => {
            ids.forEach(id => {
                if (!exists(id)) throw new NotFoundError(`Ders bulunamadı: ${id}`);
            });
            ids.forEach((id, index) => {
                const lesson = get(id);
                lesson.order = index;
                updateStmt.run(index, lesson.published ? 1 : 0, JSON.stringify(lesson), now(), id);
            });
        })();
    };

    const listPublished = () => publishedStmt.all().map(row => summarize(JSON.parse(row.data)));

    const listAll = () => allStmt.all().map(row => Object.assign(summarize(JSON.parse(row.data)), {
        published: row.published === 1,
        updatedAt: row.updated_at
    }));

    const seedFromDir = dir => {
        const result = {added: [], skipped: [], invalid: []};
        let names;
        try {
            names = fs.readdirSync(dir).filter(name => name.endsWith('.json'))
                .sort();
        } catch (e) {
            return result;
        }
        names.forEach(name => {
            try {
                const full = path.join(dir, name);
                if (fs.statSync(full).size > MAX_SEED_FILE_BYTES) {
                    result.invalid.push({file: name, errors: ['dosya çok büyük (en çok 1 MB)']});
                    return;
                }
                const lesson = JSON.parse(fs.readFileSync(full, 'utf8'));
                const check = validateLesson(lesson);
                if (!check.valid) {
                    result.invalid.push({file: name, errors: check.errors});
                } else if (exists(lesson.id) || seededStmt.get(lesson.id)) {
                    markSeededStmt.run(lesson.id);
                    result.skipped.push(lesson.id);
                } else {
                    create(lesson);
                    markSeededStmt.run(lesson.id);
                    result.added.push(lesson.id);
                }
            } catch (e) {
                result.invalid.push({file: name, errors: [`okunamadı: ${e.message}`]});
            }
        });
        return result;
    };

    return {
        create: create,
        replace: replace,
        get: get,
        remove: remove,
        reorder: reorder,
        listPublished: listPublished,
        listAll: listAll,
        seedFromDir: seedFromDir,
        markSeeded: id => markSeededStmt.run(id),
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
