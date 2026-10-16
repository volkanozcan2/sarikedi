/**
 * Öğretmen ve öğrenci hesapları, sınıflar. SQLite tablolarını kurar ve tüm yetki kurallarını (öğretmen yalnızca
 * kendi sınıfını/öğrencisini yönetir, onaysız öğretmen sınıf açamaz...) burada uygular. Parola özetleri
 * yalnızca `findForLogin` ile (giriş doğrulaması için) dışarı çıkar; diğer çıktılar herkese gösterilebilir alanlardır.
 */

const crypto = require('crypto');
const {ValidationError, NotFoundError, ConflictError} = require('./errors');
const {isInappropriate} = require('./moderation');

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 0/O, 1/I/L karışmasın
const CODE_LENGTH = 6;
const USERNAME_PATTERN = /^[A-Za-z0-9_.çğıöşüÇĞİÖŞÜ-]{3,30}$/;
const MESSAGE = 'Kayıt bilgileri geçersiz';

const key = text => String(text).trim()
    .toLocaleLowerCase('tr');

const lengthOk = (text, min, max) => typeof text === 'string' && text.trim().length >= min && text.trim().length <= max;

const publicUser = row => (row ? {
    id: row.id,
    role: row.role,
    username: row.username,
    realName: row.real_name,
    school: row.school || null,
    approved: row.approved === 1,
    classId: row.class_id || null,
    createdAt: row.created_at
} : null);

const createAccounts = (db, options) => {
    const now = (options && options.now) || (() => new Date().toISOString());

    db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        username TEXT NOT NULL,
        username_key TEXT NOT NULL UNIQUE,
        real_name TEXT NOT NULL,
        school TEXT,
        password_hash TEXT NOT NULL,
        class_id INTEGER,
        approved INTEGER NOT NULL DEFAULT 0,
        epoch INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
    )`);

    const insertUser = db.prepare(`INSERT INTO users
        (role, username, username_key, real_name, school, password_hash, class_id, approved, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const userById = db.prepare('SELECT * FROM users WHERE id = ?');
    const userByKey = db.prepare('SELECT * FROM users WHERE username_key = ?');

    const validateUsername = (username, errors) => {
        if (typeof username !== 'string' || !USERNAME_PATTERN.test(username.trim())) {
            errors.push('Kullanıcı adı 3-30 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullanılabilir');
        } else if (isInappropriate(username)) {
            errors.push('Bu ad uygun değil, başka bir ad seç');
        }
    };

    const insert = (role, fields) => {
        if (userByKey.get(key(fields.username))) throw new ConflictError('Bu kullanıcı adı alınmış');
        const info = insertUser.run(
            role, fields.username.trim(), key(fields.username), fields.realName.trim(), fields.school || null,
            fields.passwordHash, fields.classId || null, fields.approved ? 1 : 0, now()
        );
        return publicUser(userById.get(info.lastInsertRowid));
    };

    const registerTeacher = fields => {
        const errors = [];
        validateUsername(fields.username, errors);
        if (!lengthOk(fields.realName, 2, 60)) errors.push('İsim 2-60 karakter olmalı');
        if (!lengthOk(fields.school, 2, 100)) errors.push('Okul adı 2-100 karakter olmalı');
        if (errors.length > 0) throw new ValidationError(errors, MESSAGE);
        return insert('teacher', {
            username: fields.username,
            realName: fields.realName,
            school: fields.school.trim(),
            passwordHash: fields.passwordHash,
            approved: false
        });
    };

    const classByCodeStmt = db.prepare('SELECT * FROM classes WHERE code = ?');

    const registerStudent = fields => {
        const errors = [];
        validateUsername(fields.username, errors);
        if (!lengthOk(fields.realName, 2, 60)) errors.push('İsim 2-60 karakter olmalı');
        if (errors.length > 0) throw new ValidationError(errors, MESSAGE);
        const code = typeof fields.classCode === 'string' ? fields.classCode.trim().toUpperCase() : '';
        const klass = code ? classByCodeStmt.get(code) : null;
        if (!klass) throw new NotFoundError('Sınıf kodu bulunamadı');
        const teacher = userById.get(klass.teacher_id);
        if (!teacher || teacher.approved !== 1) throw new NotFoundError('Sınıf kodu bulunamadı');
        return insert('student', {
            username: fields.username,
            realName: fields.realName,
            passwordHash: fields.passwordHash,
            classId: klass.id,
            approved: true
        });
    };

    const findForLogin = username => (typeof username === 'string' ? userByKey.get(key(username)) || null : null);
    const getUser = id => publicUser(userById.get(id));
    const getEpoch = id => {
        const row = userById.get(id);
        return row ? row.epoch : null;
    };
    const bumpEpochStmt = db.prepare('UPDATE users SET epoch = epoch + 1 WHERE id = ?');
    const setPasswordStmt = db.prepare('UPDATE users SET password_hash = ?, epoch = epoch + 1 WHERE id = ?');

    const setApproved = (teacherId, approved) => {
        const row = userById.get(teacherId);
        if (!row || row.role !== 'teacher') throw new NotFoundError('Öğretmen bulunamadı');
        db.prepare('UPDATE users SET approved = ? WHERE id = ?').run(approved ? 1 : 0, teacherId);
    };

    const randomCode = () => {
        let code = '';
        for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
        return code;
    };

    const createClass = (teacherId, name) => {
        const teacher = userById.get(teacherId);
        if (!teacher || teacher.role !== 'teacher' || teacher.approved !== 1) {
            throw new ValidationError(['Hesabın henüz onaylanmadı'], 'Sınıf açılamadı');
        }
        if (!lengthOk(name, 1, 40)) throw new ValidationError(['Sınıf adı 1-40 karakter olmalı'], 'Sınıf açılamadı');
        for (let attempt = 0; attempt < 20; attempt++) {
            const code = randomCode();
            if (!classByCodeStmt.get(code)) {
                const info = db.prepare('INSERT INTO classes (teacher_id, name, code, created_at) VALUES (?, ?, ?, ?)')
                    .run(teacherId, name.trim(), code, now());
                return {id: info.lastInsertRowid, name: name.trim(), code: code, studentCount: 0};
            }
        }
        throw new Error('Sınıf kodu üretilemedi');
    };

    const listClasses = teacherId => db.prepare(`SELECT c.id, c.name, c.code,
        (SELECT COUNT(*) FROM users u WHERE u.class_id = c.id) AS student_count
        FROM classes c WHERE c.teacher_id = ? ORDER BY c.id`).all(teacherId)
        .map(row => ({id: row.id, name: row.name, code: row.code, studentCount: row.student_count}));

    const classOf = (teacherId, classId) => {
        const row = db.prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?').get(classId, teacherId);
        if (!row) throw new NotFoundError('Sınıf bulunamadı');
        return row;
    };

    const studentRows = classId => db
        .prepare('SELECT * FROM users WHERE class_id = ? AND role = ? ORDER BY username_key')
        .all(classId, 'student');

    const listStudents = (teacherId, classId) => {
        classOf(teacherId, classId);
        return studentRows(classId).map(publicUser);
    };

    const ownedStudent = (teacherId, studentId) => {
        const student = userById.get(studentId);
        if (!student || student.role !== 'student') throw new NotFoundError('Öğrenci bulunamadı');
        const klass = db.prepare('SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?')
            .get(student.class_id, teacherId);
        if (!klass) throw new NotFoundError('Öğrenci bulunamadı');
        return student;
    };

    const resetStudentPassword = (teacherId, studentId, passwordHash) => {
        ownedStudent(teacherId, studentId);
        setPasswordStmt.run(passwordHash, studentId);
    };

    const removeUser = id => db.prepare('DELETE FROM users WHERE id = ?').run(id);

    // silinen kullanıcı kimlikleri döner (çağıran, bunlara bağlı projeleri de siler)
    const removeStudent = (teacherId, studentId) => {
        ownedStudent(teacherId, studentId);
        removeUser(studentId);
        return [studentId];
    };

    const removeTeacher = teacherId => {
        const row = userById.get(teacherId);
        if (!row || row.role !== 'teacher') throw new NotFoundError('Öğretmen bulunamadı');
        const removed = [teacherId];
        db.transaction(() => {
            db.prepare('SELECT id FROM classes WHERE teacher_id = ?').all(teacherId)
                .forEach(klass => {
                    studentRows(klass.id).forEach(student => removed.push(student.id));
                    db.prepare('DELETE FROM users WHERE class_id = ?').run(klass.id);
                });
            db.prepare('DELETE FROM classes WHERE teacher_id = ?').run(teacherId);
            removeUser(teacherId);
        })();
        return removed;
    };

    const setTeacherPassword = (teacherId, passwordHash) => {
        const row = userById.get(teacherId);
        if (!row || row.role !== 'teacher') throw new NotFoundError('Öğretmen bulunamadı');
        setPasswordStmt.run(passwordHash, teacherId);
    };

    const adminOverview = () => ({
        teachers: db.prepare('SELECT * FROM users WHERE role = ? ORDER BY id').all('teacher')
            .map(row => Object.assign(
                publicUser(row),
                {
                    classes: db.prepare('SELECT * FROM classes WHERE teacher_id = ? ORDER BY id').all(row.id)
                        .map(klass => ({
                            id: klass.id,
                            name: klass.name,
                            code: klass.code,
                            students: studentRows(klass.id).map(publicUser)
                        }))
                }
            ))
    });

    const classTeacher = classId => {
        const row = classId ? db.prepare('SELECT teacher_id FROM classes WHERE id = ?').get(classId) : null;
        return row ? row.teacher_id : null;
    };

    // öğretmenin sınıflarındaki öğrenci kimlikleri
    const studentIdsOf = teacherId => db.prepare(`SELECT u.id FROM users u JOIN classes c ON c.id = u.class_id
        WHERE c.teacher_id = ? AND u.role = 'student'`).all(teacherId)
        .map(row => row.id);

    return {
        classTeacher: classTeacher,
        studentIdsOf: studentIdsOf,
        registerTeacher: registerTeacher,
        registerStudent: registerStudent,
        findForLogin: findForLogin,
        getUser: getUser,
        getEpoch: getEpoch,
        bumpEpoch: id => bumpEpochStmt.run(id),
        setApproved: setApproved,
        createClass: createClass,
        listClasses: listClasses,
        listStudents: listStudents,
        resetStudentPassword: resetStudentPassword,
        removeStudent: removeStudent,
        removeTeacher: removeTeacher,
        setTeacherPassword: setTeacherPassword,
        adminOverview: adminOverview
    };
};

module.exports = {createAccounts, publicUser, key};
