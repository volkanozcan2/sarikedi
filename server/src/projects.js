/**
 * Kullanıcıların hesaplarına kaydettiği Scratch projeleri (.sb3). Üstverisi SQLite'ta, dosyalar `projectsDir`
 * altında `<id>.sb3` adıyla durur (dosya adını kullanıcı belirlemez). Her işlem sahibini denetler.
 */

const fs = require('fs');
const path = require('path');
const {ValidationError, NotFoundError, ConflictError, UnsupportedError, TooLargeError} = require('./errors');

const MAX_PROJECTS = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_BYTES = 22; // en küçük geçerli zip (boş arşiv)
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const MESSAGE = 'Proje kaydedilemedi';
const MAX_THUMBNAIL_BYTES = 300 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const SCOPES = ['class', 'site'];

const meta = row => ({
    id: row.id,
    title: row.title,
    size: row.size,
    shared: row.shared === 1,
    scope: row.scope,
    hasThumbnail: row.has_thumb === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const createProjects = (db, {dir, now = () => new Date().toISOString(), onRemove = () => {}}) => {
    db.exec(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        size INTEGER NOT NULL,
        shared INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`);
    // Var olan veritabanlarına sonradan eklenen sütunlar
    const columns = db.prepare('PRAGMA table_info(projects)').all()
        .map(column => column.name);
    if (columns.indexOf('scope') === -1) db.exec("ALTER TABLE projects ADD COLUMN scope TEXT NOT NULL DEFAULT 'class'");
    if (columns.indexOf('has_thumb') === -1) {
        db.exec('ALTER TABLE projects ADD COLUMN has_thumb INTEGER NOT NULL DEFAULT 0');
    }

    const checkTitle = title => {
        if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 60) {
            throw new ValidationError(['Proje adı 1-60 karakter olmalı'], MESSAGE);
        }
    };

    const checkFile = buffer => {
        if (!Buffer.isBuffer(buffer) || buffer.length < MIN_BYTES) {
            throw new ValidationError(['Proje dosyası boş ya da çok küçük'], MESSAGE);
        }
        if (buffer.length > MAX_BYTES) throw new TooLargeError('Proje çok büyük (en çok 10 MB)');
        if (!ZIP_MAGIC.every((byte, index) => buffer[index] === byte)) {
            throw new UnsupportedError('Geçerli bir Scratch projesi (.sb3) değil');
        }
    };

    const fileOf = id => path.join(dir, `${id}.sb3`);
    const thumbOf = id => path.join(dir, `${id}.png`);
    const owned = (userId, id) => {
        const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
        if (!row) throw new NotFoundError('Proje bulunamadı');
        return row;
    };

    const create = (userId, title, buffer) => {
        checkTitle(title);
        checkFile(buffer);
        const count = db.prepare('SELECT COUNT(*) AS n FROM projects WHERE user_id = ?').get(userId).n;
        if (count >= MAX_PROJECTS) {
            throw new ConflictError(`En çok ${MAX_PROJECTS} proje saklayabilirsin. Eskilerinden birini sil.`);
        }
        const stamp = now();
        const info = db.prepare(
            'INSERT INTO projects (user_id, title, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).run(userId, title.trim(), buffer.length, stamp, stamp);
        try {
            fs.mkdirSync(dir, {recursive: true});
            fs.writeFileSync(fileOf(info.lastInsertRowid), buffer);
        } catch (error) {
            db.prepare('DELETE FROM projects WHERE id = ?').run(info.lastInsertRowid);
            throw error;
        }
        return meta(db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid));
    };

    const update = (userId, id, buffer) => {
        owned(userId, id);
        checkFile(buffer);
        fs.writeFileSync(fileOf(id), buffer);
        db.prepare('UPDATE projects SET size = ?, updated_at = ? WHERE id = ?').run(buffer.length, now(), id);
        return meta(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
    };

    const rename = (userId, id, title) => {
        owned(userId, id);
        checkTitle(title);
        db.prepare('UPDATE projects SET title = ?, updated_at = ? WHERE id = ?').run(title.trim(), now(), id);
        return meta(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
    };

    const list = userId => db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC, id DESC')
        .all(userId)
        .map(meta);

    const purge = id => {
        onRemove(id);
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        fs.rmSync(fileOf(id), {force: true});
        fs.rmSync(thumbOf(id), {force: true});
    };

    const remove = (userId, id) => {
        owned(userId, id);
        purge(id);
    };

    const removeAllOf = userId => {
        db.prepare('SELECT id FROM projects WHERE user_id = ?').all(userId)
            .forEach(row => purge(row.id));
    };

    const getRow = id => db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    const checkScope = scope => {
        if (SCOPES.indexOf(scope) === -1) throw new ValidationError(['Kapsam "class" ya da "site" olmalı'], MESSAGE);
    };

    // sahibi paylaşımı açar/kapatır; kapsamı çağıran belirler (öğrenci için hep sınıf)
    const setShared = (userId, id, shared, scope) => {
        owned(userId, id);
        checkScope(scope);
        db.prepare('UPDATE projects SET shared = ?, scope = ?, updated_at = ? WHERE id = ?')
            .run(shared ? 1 : 0, scope, now(), id);
        return meta(getRow(id));
    };

    // öğretmenin moderasyonu: sahibi kim olursa olsun (yetkiyi çağıran denetler)
    const moderate = (id, patch) => {
        const row = getRow(id);
        if (!row) throw new NotFoundError('Proje bulunamadı');
        if (patch.scope) checkScope(patch.scope);
        db.prepare('UPDATE projects SET shared = ?, scope = ? WHERE id = ?').run(
            typeof patch.shared === 'boolean' ? Number(patch.shared) : row.shared, patch.scope || row.scope, id
        );
        return meta(getRow(id));
    };

    const saveThumbnail = (userId, id, buffer) => {
        owned(userId, id);
        if (!Buffer.isBuffer(buffer) || buffer.length < PNG_MAGIC.length) {
            throw new ValidationError(['Küçük resim boş'], MESSAGE);
        }
        if (buffer.length > MAX_THUMBNAIL_BYTES) throw new TooLargeError('Küçük resim çok büyük (en çok 300 KB)');
        if (!PNG_MAGIC.every((byte, index) => buffer[index] === byte)) {
            throw new UnsupportedError('Küçük resim PNG olmalı');
        }
        fs.writeFileSync(thumbOf(id), buffer);
        db.prepare('UPDATE projects SET has_thumb = 1 WHERE id = ?').run(id);
    };

    const listShared = limit => db
        .prepare('SELECT * FROM projects WHERE shared = 1 ORDER BY updated_at DESC, id DESC LIMIT ?')
        .all(limit)
        .map(row => Object.assign(meta(row), {userId: row.user_id}));

    return {
        create: create,
        update: update,
        rename: rename,
        list: list,
        remove: remove,
        removeAllOf: removeAllOf,
        setShared: setShared,
        moderate: moderate,
        saveThumbnail: saveThumbnail,
        listShared: listShared,
        thumbnailPath: thumbOf,
        fileOwnedBy: (userId, id) => {
            owned(userId, id);
            return fileOf(id);
        },
        get: id => {
            const row = getRow(id);
            return row ? Object.assign(meta(row), {userId: row.user_id}) : null;
        },
        filePath: fileOf
    };
};

module.exports = {createProjects, MAX_PROJECTS, MAX_BYTES, SCOPES};
