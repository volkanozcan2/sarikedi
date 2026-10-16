/**
 * Öğretmenlerin kaydettiği rehberli dersler. Üstverisi ve adımları SQLite'ta (guided_lessons), başlangıç projesi
 * `dir` altında `<id>.sb3` olarak durur. Görünürlük: sınıfı boş olan ders herkese açıktır; sınıfı olan ders
 * yalnızca o sınıfın öğrencilerine ve dersin öğretmenine görünür.
 *
 * Hazır dersler (builtin) repodaki bir klasörden gelir: `<anahtar>.json` (title, description, steps) ve
 * `<anahtar>.sb3`. syncBuiltins sunucu her açıldığında bunları tabloya yazar; öğretmeni yoktur (teacher_id 0),
 * herkese açıktır ve hiçbir öğretmen düzenleyemez/silemez.
 */

const fs = require('fs');
const path = require('path');
const {ValidationError, NotFoundError, ConflictError, UnsupportedError, TooLargeError} = require('./errors');

const MAX_LESSONS = 100; // öğretmen başına
const MAX_STEPS = 300;
const MAX_STEPS_BYTES = 300 * 1024;
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_BYTES = 22;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const MESSAGE = 'Ders kaydedilemedi';

const createLessons = (db, {dir, now = () => new Date().toISOString()}) => {
    db.exec(`CREATE TABLE IF NOT EXISTS guided_lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        class_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        steps TEXT NOT NULL,
        step_count INTEGER NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`);

    const columns = db.prepare('PRAGMA table_info(guided_lessons)').all()
        .map(column => column.name);
    if (columns.indexOf('builtin_key') === -1) db.exec('ALTER TABLE guided_lessons ADD COLUMN builtin_key TEXT');

    const fileOf = id => path.join(dir, `${id}.sb3`);
    const getRow = id => db.prepare('SELECT * FROM guided_lessons WHERE id = ?').get(id);

    const checkMeta = fields => {
        const errors = [];
        const title = typeof fields.title === 'string' ? fields.title.trim() : '';
        if (title.length < 1 || title.length > 80) errors.push('Ders adı 1-80 karakter olmalı');
        const description = typeof fields.description === 'string' ? fields.description.trim() : '';
        if (description.length > 500) errors.push('Açıklama en çok 500 karakter olabilir');
        const steps = fields.steps;
        if (!Array.isArray(steps) || steps.length < 1) errors.push('Derste en az bir adım olmalı');
        else if (steps.length > MAX_STEPS) errors.push(`Derste en çok ${MAX_STEPS} adım olabilir`);
        else if (!steps.every(step => step && typeof step === 'object' && typeof step.type === 'string')) {
            errors.push('Adımlar geçersiz');
        }
        const json = JSON.stringify(steps || []);
        if (Buffer.byteLength(json) > MAX_STEPS_BYTES) errors.push('Adımlar çok büyük');
        if (errors.length) throw new ValidationError(errors, MESSAGE);
        return {title, description, steps: json, stepCount: steps.length};
    };

    const checkFile = buffer => {
        if (!Buffer.isBuffer(buffer) || buffer.length < MIN_BYTES) {
            throw new ValidationError(['Başlangıç projesi boş ya da çok küçük'], MESSAGE);
        }
        if (buffer.length > MAX_BYTES) throw new TooLargeError('Başlangıç projesi çok büyük (en çok 10 MB)');
        if (!ZIP_MAGIC.every((byte, index) => buffer[index] === byte)) {
            throw new UnsupportedError('Geçerli bir Scratch projesi (.sb3) değil');
        }
    };

    const meta = row => ({
        id: row.id,
        teacherId: row.teacher_id,
        classId: row.class_id || null,
        title: row.title,
        description: row.description,
        stepCount: row.step_count,
        hasFile: row.size > 0,
        builtin: Boolean(row.builtin_key),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    });

    const owned = (teacherId, id) => {
        const row = getRow(id);
        if (!row || row.teacher_id !== teacherId) throw new NotFoundError('Ders bulunamadı');
        return row;
    };

    const create = (teacherId, classId, fields) => {
        const clean = checkMeta(fields);
        const count = db.prepare('SELECT COUNT(*) AS n FROM guided_lessons WHERE teacher_id = ?').get(teacherId).n;
        if (count >= MAX_LESSONS) throw new ConflictError(`En çok ${MAX_LESSONS} ders oluşturabilirsin`);
        const stamp = now();
        const info = db.prepare(`INSERT INTO guided_lessons
            (teacher_id, class_id, title, description, steps, step_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(teacherId, classId || null, clean.title, clean.description, clean.steps, clean.stepCount,
                stamp, stamp);
        return meta(getRow(info.lastInsertRowid));
    };

    const update = (teacherId, id, classId, fields) => {
        owned(teacherId, id);
        const clean = checkMeta(fields);
        db.prepare(`UPDATE guided_lessons SET class_id = ?, title = ?, description = ?, steps = ?, step_count = ?,
            updated_at = ? WHERE id = ?`)
            .run(classId || null, clean.title, clean.description, clean.steps, clean.stepCount, now(), id);
        return meta(getRow(id));
    };

    const saveFile = (teacherId, id, buffer) => {
        owned(teacherId, id);
        checkFile(buffer);
        fs.mkdirSync(dir, {recursive: true});
        fs.writeFileSync(fileOf(id), buffer);
        db.prepare('UPDATE guided_lessons SET size = ?, updated_at = ? WHERE id = ?').run(buffer.length, now(), id);
        return meta(getRow(id));
    };

    const remove = (teacherId, id) => {
        owned(teacherId, id);
        db.prepare('DELETE FROM guided_lessons WHERE id = ?').run(id);
        fs.rmSync(fileOf(id), {force: true});
    };

    const removeAllOf = teacherId => {
        db.prepare('SELECT id FROM guided_lessons WHERE teacher_id = ?').all(teacherId)
            .forEach(row => {
                db.prepare('DELETE FROM guided_lessons WHERE id = ?').run(row.id);
                fs.rmSync(fileOf(row.id), {force: true});
            });
    };

    // viewer: {id, role, classId} ya da null (girişsiz). Öğretmen kendi derslerinin hepsini görür.
    const canView = (viewer, row) => {
        if (!row) return false;
        if (viewer && viewer.role === 'teacher' && viewer.id === row.teacher_id) return true;
        if (row.size === 0) return false; // başlangıç projesi yüklenmemiş (yarım kalmış) ders
        if (!row.class_id) return true;
        return Boolean(viewer && viewer.role === 'student' && viewer.classId === row.class_id);
    };

    // hazır dersler en başta
    const list = viewer => db.prepare(
        'SELECT * FROM guided_lessons ORDER BY (builtin_key IS NULL), updated_at DESC, id DESC'
    ).all()
        .filter(row => canView(viewer, row))
        .map(meta);

    const get = (viewer, id) => {
        const row = getRow(id);
        if (!canView(viewer, row)) throw new NotFoundError('Ders bulunamadı');
        return Object.assign(meta(row), {steps: JSON.parse(row.steps)});
    };

    const filePath = (viewer, id) => {
        const row = getRow(id);
        if (!canView(viewer, row) || row.size === 0) throw new NotFoundError('Ders bulunamadı');
        return fileOf(id);
    };

    /**
     * Hazır dersleri klasörden tabloya eşitler.
     * @param {string} source - .json ve .sb3 dosyalarının olduğu klasör
     * @returns {string[]} eşitlenen ders anahtarları
     */
    const syncBuiltins = source => {
        const keys = fs.existsSync(source) ? fs.readdirSync(source)
            .filter(name => /^[a-z0-9-]+\.json$/.test(name))
            .map(name => name.replace(/\.json$/, '')) : [];
        keys.forEach(key => {
            const fields = JSON.parse(fs.readFileSync(path.join(source, `${key}.json`), 'utf8'));
            const clean = checkMeta(fields);
            const buffer = fs.readFileSync(path.join(source, `${key}.sb3`));
            checkFile(buffer);
            let row = db.prepare('SELECT * FROM guided_lessons WHERE builtin_key = ?').get(key);
            const same = row && row.title === clean.title && row.description === clean.description &&
                row.steps === clean.steps && row.size === buffer.length;
            if (!row) {
                const stamp = now();
                const info = db.prepare(`INSERT INTO guided_lessons
                    (teacher_id, class_id, title, description, steps, step_count, size, created_at, updated_at,
                    builtin_key) VALUES (0, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(clean.title, clean.description, clean.steps, clean.stepCount, buffer.length, stamp, stamp,
                        key);
                row = getRow(info.lastInsertRowid);
            } else if (!same) {
                db.prepare(`UPDATE guided_lessons SET title = ?, description = ?, steps = ?, step_count = ?,
                    size = ?, updated_at = ? WHERE id = ?`)
                    .run(clean.title, clean.description, clean.steps, clean.stepCount, buffer.length, now(), row.id);
            }
            fs.mkdirSync(dir, {recursive: true});
            fs.writeFileSync(fileOf(row.id), buffer);
        });
        // klasörden kaldırılan hazır dersler silinir
        db.prepare('SELECT id, builtin_key FROM guided_lessons WHERE builtin_key IS NOT NULL').all()
            .filter(row => keys.indexOf(row.builtin_key) === -1)
            .forEach(row => {
                db.prepare('DELETE FROM guided_lessons WHERE id = ?').run(row.id);
                fs.rmSync(fileOf(row.id), {force: true});
            });
        return keys;
    };

    return {create, update, saveFile, remove, removeAllOf, list, get, filePath, syncBuiltins};
};

module.exports = {createLessons, MAX_STEPS, MAX_LESSONS};
