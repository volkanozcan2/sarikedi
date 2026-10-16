const {openStore} = require('../../server/src/db');
const {ValidationError, ConflictError, NotFoundError} = require('../../server/src/errors');

const setup = () => {
    const store = openStore(':memory:');
    return {store, accounts: store.accounts};
};

const teacherInput = overrides => Object.assign({
    username: 'ayse.ogretmen', realName: 'Ayşe Yılmaz', school: 'Atatürk İlkokulu', passwordHash: 'scrypt:x:y'
}, overrides);

describe('öğretmen kaydı', () => {
    test('onay bekleyen öğretmen oluşur; parola özeti dışarı sızmaz', () => {
        const {accounts} = setup();
        const teacher = accounts.registerTeacher(teacherInput());
        expect(teacher).toMatchObject({
            role: 'teacher', username: 'ayse.ogretmen', realName: 'Ayşe Yılmaz', school: 'Atatürk İlkokulu', approved: false
        });
        expect(JSON.stringify(teacher)).not.toContain('scrypt');
    });

    test('kullanıcı adı büyük/küçük harf ve Türkçe harf duyarsız tekil', () => {
        const {accounts} = setup();
        accounts.registerTeacher(teacherInput({username: 'Ali'}));
        expect(() => accounts.registerTeacher(teacherInput({username: 'ALİ'}))).toThrow(ConflictError);
        expect(() => accounts.registerTeacher(teacherInput({username: 'ali'}))).toThrow(ConflictError);
    });

    test('geçersiz alanlar ValidationError verir', () => {
        const {accounts} = setup();
        ['ab', 'a'.repeat(31), 'boşluk var', 'ünlem!', ''].forEach(username => {
            expect(() => accounts.registerTeacher(teacherInput({username}))).toThrow(ValidationError);
        });
        expect(() => accounts.registerTeacher(teacherInput({realName: 'A'}))).toThrow(ValidationError);
        expect(() => accounts.registerTeacher(teacherInput({school: ''}))).toThrow(ValidationError);
    });
});

describe('uygunsuz takma ad', () => {
    test('küfürlü kullanıcı adı / takma ad kayıtta reddedilir', () => {
        const {accounts} = setup();
        expect(() => accounts.registerTeacher(teacherInput({username: 'orospu.hoca'}))).toThrow(ValidationError);
        const teacher = accounts.registerTeacher(teacherInput());
        accounts.setApproved(teacher.id, true);
        const klass = accounts.createClass(teacher.id, '5-A');
        ['amk', 's1ktir', 'orospu_cocugu'].forEach(username => {
            expect(() => accounts.registerStudent({
                classCode: klass.code, username: username, realName: 'Ali Veli', passwordHash: 'h'
            })).toThrow(ValidationError);
        });
        expect(accounts.registerStudent({
            classCode: klass.code, username: 'Pamuk', realName: 'Ali Veli', passwordHash: 'h'
        }).username).toBe('Pamuk');
    });
});

describe('sınıf ve öğrenci kaydı', () => {
    const withClass = () => {
        const ctx = setup();
        const teacher = ctx.accounts.registerTeacher(teacherInput());
        ctx.accounts.setApproved(teacher.id, true);
        const klass = ctx.accounts.createClass(teacher.id, '5-A');
        return Object.assign(ctx, {teacher, klass});
    };

    test('sınıf kodu 6 karakter, karışabilen harfler yok', () => {
        const {klass} = withClass();
        expect(klass.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
        expect(klass.name).toBe('5-A');
    });

    test('öğrenci sınıf koduyla kaydolur (kod büyük/küçük harf duyarsız)', () => {
        const {accounts, klass} = withClass();
        const student = accounts.registerStudent({
            classCode: klass.code.toLowerCase(), username: 'Pamuk', realName: 'Ali Veli', passwordHash: 'h'
        });
        expect(student).toMatchObject({role: 'student', username: 'Pamuk', realName: 'Ali Veli', approved: true});
        expect(student.classId).toBe(klass.id);
    });

    test('geçersiz kod NotFoundError, tekrar eden takma ad ConflictError', () => {
        const {accounts, klass} = withClass();
        expect(() => accounts.registerStudent({
            classCode: 'YOKYOK', username: 'Pamuk', realName: 'Ali Veli', passwordHash: 'h'
        })).toThrow(NotFoundError);
        accounts.registerStudent({classCode: klass.code, username: 'Pamuk', realName: 'Ali Veli', passwordHash: 'h'});
        expect(() => accounts.registerStudent({
            classCode: klass.code, username: 'pamuk', realName: 'Veli Can', passwordHash: 'h'
        })).toThrow(ConflictError);
    });

    test('onaylanmamış öğretmenin sınıf kodu çalışmaz', () => {
        const {accounts} = setup();
        const teacher = accounts.registerTeacher(teacherInput());
        expect(() => accounts.createClass(teacher.id, '5-A')).toThrow(ValidationError);
    });

    test('öğretmen kendi sınıflarını ve öğrencilerini görür, başkasınınkini göremez', () => {
        const ctx = withClass();
        const {accounts, klass} = ctx;
        accounts.registerStudent({classCode: klass.code, username: 'Pamuk', realName: 'Ali Veli', passwordHash: 'h'});
        const other = accounts.registerTeacher(teacherInput({username: 'mehmet'}));
        accounts.setApproved(other.id, true);
        expect(accounts.listClasses(ctx.teacher.id)).toEqual([
            expect.objectContaining({id: klass.id, studentCount: 1})
        ]);
        expect(accounts.listStudents(ctx.teacher.id, klass.id)).toEqual([
            expect.objectContaining({username: 'Pamuk', realName: 'Ali Veli'})
        ]);
        expect(() => accounts.listStudents(other.id, klass.id)).toThrow(NotFoundError);
        expect(accounts.listClasses(other.id)).toEqual([]);
    });

    test('öğretmen öğrencinin şifresini sıfırlar ve öğrenciyi çıkarır; yalnızca kendi öğrencisi için', () => {
        const ctx = withClass();
        const {accounts, klass} = ctx;
        const student = accounts.registerStudent({
            classCode: klass.code, username: 'Pamuk', realName: 'Ali Veli', passwordHash: 'eski'
        });
        const other = accounts.registerTeacher(teacherInput({username: 'mehmet'}));
        accounts.setApproved(other.id, true);
        expect(() => accounts.resetStudentPassword(other.id, student.id, 'yeni')).toThrow(NotFoundError);
        const epoch = accounts.getEpoch(student.id);
        accounts.resetStudentPassword(ctx.teacher.id, student.id, 'yeni');
        expect(accounts.findForLogin('pamuk').password_hash).toBe('yeni');
        expect(accounts.getEpoch(student.id)).toBeGreaterThan(epoch);
        expect(() => accounts.removeStudent(other.id, student.id)).toThrow(NotFoundError);
        accounts.removeStudent(ctx.teacher.id, student.id);
        expect(accounts.findForLogin('pamuk')).toBeNull();
    });
});

describe('yönetici görünümü', () => {
    test('tüm öğretmenler, sınıflar ve öğrenciler; onay ve silme', () => {
        const {accounts} = setup();
        const teacher = accounts.registerTeacher(teacherInput());
        accounts.setApproved(teacher.id, true);
        const klass = accounts.createClass(teacher.id, '5-A');
        accounts.registerStudent({classCode: klass.code, username: 'Pamuk', realName: 'Ali Veli', passwordHash: 'h'});
        const pending = accounts.registerTeacher(teacherInput({username: 'bekleyen'}));

        const overview = accounts.adminOverview();
        expect(overview.teachers.map(t => [t.username, t.approved])).toEqual([['ayse.ogretmen', true], ['bekleyen', false]]);
        expect(overview.teachers[0].classes[0]).toMatchObject({name: '5-A', code: klass.code});
        expect(overview.teachers[0].classes[0].students[0]).toMatchObject({username: 'Pamuk', realName: 'Ali Veli'});

        accounts.removeTeacher(teacher.id);
        expect(accounts.findForLogin('pamuk')).toBeNull();
        expect(accounts.findForLogin('ayse.ogretmen')).toBeNull();
        expect(accounts.adminOverview().teachers.map(t => t.id)).toEqual([pending.id]);
    });
});
