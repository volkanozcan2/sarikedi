import {createAccountApi, AccountApiError} from '../../../src/lib/accounts/account-api';

const response = (status, body) => ({
    status: status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body)
});

const makeApi = handler => {
    const fetchFn = jest.fn((url, options) => Promise.resolve(handler(url, options)));
    return {api: createAccountApi({fetchFn}), fetchFn};
};

describe('createAccountApi', () => {
    test('me: kullanıcı ya da null döner', () => {
        const {api, fetchFn} = makeApi(() => response(200, {user: {id: 1, username: 'ayse'}}));
        return api.me().then(user => {
            expect(user.username).toBe('ayse');
            expect(fetchFn.mock.calls[0][0]).toBe('/api/auth/me');
            expect(fetchFn.mock.calls[0][1].credentials).toBe('same-origin');
        });
    });

    test('login: JSON gönderir, kullanıcıyı verir', () => {
        const {api, fetchFn} = makeApi(() => response(200, {user: {id: 2, role: 'student'}}));
        return api.login('Pamuk', 'gizli12').then(user => {
            expect(user.role).toBe('student');
            const [url, options] = fetchFn.mock.calls[0];
            expect(url).toBe('/api/auth/login');
            expect(options.method).toBe('POST');
            expect(JSON.parse(options.body)).toEqual({username: 'Pamuk', password: 'gizli12'});
        });
    });

    test('hata: sunucu mesajı, durum, alan hataları ve "pending" bayrağı korunur', () => {
        const {api} = makeApi(() => response(403, {error: 'Hesabın henüz onaylanmadı', pending: true}));
        return api.login('a', 'b').then(() => {
            throw new Error('hata beklenirdi');
        }, error => {
            expect(error).toBeInstanceOf(AccountApiError);
            expect(error.status).toBe(403);
            expect(error.pending).toBe(true);
            expect(error.message).toBe('Hesabın henüz onaylanmadı');
        });
    });

    test('ağ hatası Türkçe mesajla', () => {
        const api = createAccountApi({fetchFn: () => Promise.reject(new Error('x'))});
        return api.me().then(() => {
            throw new Error('hata beklenirdi');
        }, error => expect(error.message).toBe('Sunucuya ulaşılamadı'));
    });

    test('kayıt ve öğretmen uç noktaları doğru yola gider', () => {
        const {api, fetchFn} = makeApi(() => response(201, {user: {id: 3}, id: 9, name: '5-A', code: 'ABCDEF'}));
        return api.registerTeacher({username: 'a', realName: 'b', school: 'c', password: 'dddddd'})
            .then(() => api.registerStudent({classCode: 'X', username: 'u', realName: 'r', password: 'pppppp'}))
            .then(() => api.createClass('5-A'))
            .then(() => api.classes())
            .then(() => api.students(7))
            .then(() => api.resetStudentPassword(4, 'yeni-sifre'))
            .then(() => api.removeStudent(4))
            .then(() => api.logout())
            .then(() => {
                const calls = fetchFn.mock.calls.map(c => `${c[1].method} ${c[0]}`);
                expect(calls).toEqual([
                    'POST /api/auth/register-teacher',
                    'POST /api/auth/register-student',
                    'POST /api/teacher/classes',
                    'GET /api/teacher/classes',
                    'GET /api/teacher/classes/7/students',
                    'POST /api/teacher/students/4/reset-password',
                    'DELETE /api/teacher/students/4',
                    'POST /api/auth/logout'
                ]);
            });
    });

    test('204 yanıtı null verir', () => {
        const {api} = makeApi(() => ({status: 204, ok: true, json: () => Promise.reject(new Error('boş'))}));
        return api.removeStudent(1).then(result => expect(result).toBeNull());
    });

    test('projeler: listele, kaydet (ham gövde), güncelle, yeniden adlandır, sil', () => {
        const {api, fetchFn} = makeApi(() => response(200, {id: 5, title: 'x'}));
        const blob = {size: 10};
        return api.projects()
            .then(() => api.saveProject('Yıldız oyunum', blob))
            .then(() => api.updateProject(5, blob))
            .then(() => api.renameProject(5, 'Yeni'))
            .then(() => api.removeProject(5))
            .then(() => {
                const calls = fetchFn.mock.calls.map(c => `${c[1].method} ${c[0]}`);
                expect(calls).toEqual([
                    'GET /api/projects',
                    `POST /api/projects?title=${encodeURIComponent('Yıldız oyunum')}`,
                    'PUT /api/projects/5',
                    'POST /api/projects/5/rename',
                    'DELETE /api/projects/5'
                ]);
                expect(fetchFn.mock.calls[1][1].body).toBe(blob);
                expect(fetchFn.mock.calls[1][1].headers['Content-Type']).toBe('application/octet-stream');
            });
    });

    test('downloadProject: içeriği ArrayBuffer olarak verir, hata durumunda hata fırlatır', () => {
        const buffer = new ArrayBuffer(8);
        const ok = createAccountApi({fetchFn: () => Promise.resolve({ok: true, status: 200, arrayBuffer: () => Promise.resolve(buffer)})});
        const bad = createAccountApi({fetchFn: () => Promise.resolve({ok: false, status: 404})});
        return ok.downloadProject(3).then(result => {
            expect(result).toBe(buffer);
            return bad.downloadProject(3);
        }).then(() => {
            throw new Error('hata beklenirdi');
        }, error => expect(error.status).toBe(404));
    });

    test('paylaşım, beğeni, yorum, bildirim ve moderasyon uç noktaları', () => {
        const {api, fetchFn} = makeApi(() => response(200, {}));
        return api.shareProject(4, true, 'site')
            .then(() => api.saveThumbnail(4, {size: 1}))
            .then(() => api.shared())
            .then(() => api.sharedProject(4))
            .then(() => api.like(4))
            .then(() => api.addComment(4, 'Harika!'))
            .then(() => api.deleteComment(4, 9))
            .then(() => api.report(4, 9))
            .then(() => api.report(4))
            .then(() => api.reports())
            .then(() => api.restoreComment(9))
            .then(() => api.setProjectScope(4, 'site'))
            .then(() => api.unshareProject(4))
            .then(() => {
                expect(fetchFn.mock.calls.map(c => `${c[1].method} ${c[0]}`)).toEqual([
                    'POST /api/projects/4/share',
                    'PUT /api/projects/4/thumbnail',
                    'GET /api/shared',
                    'GET /api/shared/4',
                    'POST /api/shared/4/like',
                    'POST /api/shared/4/comments',
                    'DELETE /api/shared/4/comments/9',
                    'POST /api/shared/4/report',
                    'POST /api/shared/4/report',
                    'GET /api/teacher/reports',
                    'POST /api/teacher/comments/9/restore',
                    'POST /api/teacher/projects/4/scope',
                    'POST /api/teacher/projects/4/unshare'
                ]);
                expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({shared: true, scope: 'site'});
                expect(JSON.parse(fetchFn.mock.calls[7][1].body)).toEqual({commentId: 9});
                expect(JSON.parse(fetchFn.mock.calls[8][1].body)).toEqual({});
            });
    });

    test('downloadShared paylaşılan projeyi indirir', () => {
        const buffer = new ArrayBuffer(4);
        const fetchFn = jest.fn(() => Promise.resolve({ok: true, status: 200, arrayBuffer: () => Promise.resolve(buffer)}));
        return createAccountApi({fetchFn}).downloadShared(6).then(result => {
            expect(result).toBe(buffer);
            expect(fetchFn.mock.calls[0][0]).toBe('/api/shared/6/file');
        });
    });
});
