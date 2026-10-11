import {createAdminApi, AdminApiError} from '../../../src/lib/lessons/admin-api';

const reply = (status, body) => Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    json: () => (body === null ? Promise.reject(new Error('gövde yok')) : Promise.resolve(body))
});

const makeApi = handler => {
    const calls = [];
    const fetchFn = (url, options) => {
        calls.push({url: url, options: options});
        return handler(url, options);
    };
    return {api: createAdminApi({fetchFn: fetchFn}), calls};
};

describe('createAdminApi', () => {
    test('istekler doğru yola, yönteme ve çerez ayarıyla gider', () => {
        const {api, calls} = makeApi(() => reply(200, {ok: true}));
        return api.list()
            .then(() => api.get('ilk ders/1'))
            .then(() => api.logout())
            .then(() => {
                expect(calls[0].url).toBe('/api/admin/lessons');
                expect(calls[0].options.method).toBe('GET');
                expect(calls[0].options.credentials).toBe('same-origin');
                expect(calls[1].url).toBe('/api/admin/lessons/ilk%20ders%2F1');
                expect(calls[2]).toEqual(expect.objectContaining({url: '/api/admin/logout'}));
                expect(calls[2].options.method).toBe('POST');
            });
    });

    test('JSON gövdeli istekler', () => {
        const {api, calls} = makeApi(() => reply(200, {id: 'x'}));
        const lesson = {id: 'x', title: 'Başlık'};
        return api.login('sifre')
            .then(() => api.create(lesson))
            .then(() => api.replace('x', lesson))
            .then(() => api.reorder(['b', 'a']))
            .then(() => {
                expect(calls.map(c => [c.options.method, c.url])).toEqual([
                    ['POST', '/api/admin/login'], ['POST', '/api/admin/lessons'],
                    ['PUT', '/api/admin/lessons/x'], ['PUT', '/api/admin/order']
                ]);
                expect(calls[0].options.headers['Content-Type']).toBe('application/json');
                expect(JSON.parse(calls[0].options.body)).toEqual({password: 'sifre'});
                expect(JSON.parse(calls[3].options.body)).toEqual({ids: ['b', 'a']});
            });
    });

    test('yükleme ham gövdeyle gider', () => {
        const {api, calls} = makeApi(() => reply(201, {url: '/uploads/a.png'}));
        const body = new ArrayBuffer(8);
        return api.upload(body).then(result => {
            expect(result).toEqual({url: '/uploads/a.png'});
            expect(calls[0].options.body).toBe(body);
            expect(calls[0].options.headers['Content-Type']).toBe('application/octet-stream');
        });
    });

    test('silme 204 yanıtında null döner', () => {
        const {api} = makeApi(() => Promise.resolve({ok: true, status: 204, json: () => Promise.reject(new Error('yok'))}));
        return api.remove('x').then(result => expect(result).toBeNull());
    });

    test('me(): 200 true, 401 false, diğer hatalar reddedilir', () => {
        const ok = makeApi(() => reply(200, {admin: true}));
        const no = makeApi(() => reply(401, {error: 'Giriş gerekli'}));
        const bad = makeApi(() => reply(500, {error: 'Sunucu hatası'}));
        return ok.api.me()
            .then(result => {
                expect(result).toBe(true);
                return no.api.me();
            })
            .then(result => {
                expect(result).toBe(false);
                return bad.api.me().then(() => {
                    throw new Error('reddedilmeliydi');
                }, error => expect(error.status).toBe(500));
            });
    });

    test('sunucu hatası mesaj ve doğrulama listesiyle AdminApiError olur', () => {
        const {api} = makeApi(() => reply(400, {error: 'Ders geçersiz', errors: ['title: 1-120 karakter olmalı']}));
        return api.create({}).then(() => {
            throw new Error('reddedilmeliydi');
        }, error => {
            expect(error).toBeInstanceOf(AdminApiError);
            expect(error.message).toBe('Ders geçersiz');
            expect(error.status).toBe(400);
            expect(error.errors).toEqual(['title: 1-120 karakter olmalı']);
        });
    });

    test('JSON olmayan hata gövdesi varsayılan mesaj verir', () => {
        const {api} = makeApi(() => reply(502, null));
        return api.list().then(() => {
            throw new Error('reddedilmeliydi');
        }, error => {
            expect(error.message).toBe('İstek başarısız (502)');
            expect(error.errors).toEqual([]);
        });
    });

    test('ağ hatası Türkçe mesajla ve status 0 ile reddedilir', () => {
        const {api} = makeApi(() => Promise.reject(new Error('offline')));
        return api.list().then(() => {
            throw new Error('reddedilmeliydi');
        }, error => {
            expect(error.message).toBe('Sunucuya ulaşılamadı');
            expect(error.status).toBe(0);
        });
    });

    test('baseUrl değiştirilebilir', () => {
        const calls = [];
        const api = createAdminApi({
            baseUrl: '/x', fetchFn: url => {
                calls.push(url);
                return reply(200, []);
            }
        });
        return api.list().then(() => expect(calls).toEqual(['/x/lessons']));
    });
});
