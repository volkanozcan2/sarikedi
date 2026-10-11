/**
 * @fileoverview
 * Yönetici API'sinin (/api/admin/*) istemcisi. Hata mesajları Türkçedir.
 */

class AdminApiError extends Error {
    constructor (message, status, errors) {
        super(message);
        this.name = 'AdminApiError';
        this.status = status;
        this.errors = errors || [];
    }
}

const createAdminApi = ({fetchFn, baseUrl = '/api/admin'}) => {
    const call = (method, path, body, raw) => {
        const options = {method: method, credentials: 'same-origin', headers: {}};
        if (typeof body !== 'undefined') {
            if (raw) {
                options.headers['Content-Type'] = 'application/octet-stream';
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        return fetchFn(`${baseUrl}${path}`, options)
            .catch(() => {
                throw new AdminApiError('Sunucuya ulaşılamadı', 0);
            })
            .then(response => {
                if (response.status === 204) return null;
                return response.json().catch(() => ({}))
                    .then(data => {
                        if (!response.ok) {
                            throw new AdminApiError(
                                data.error || `İstek başarısız (${response.status})`, response.status, data.errors
                            );
                        }
                        return data;
                    });
            });
    };

    const lessonPath = id => `/lessons/${encodeURIComponent(id)}`;

    return {
        me: () => call('GET', '/me').then(() => true, error => {
            if (error.status === 401) return false;
            throw error;
        }),
        login: password => call('POST', '/login', {password: password}),
        logout: () => call('POST', '/logout'),
        list: () => call('GET', '/lessons'),
        get: id => call('GET', lessonPath(id)),
        create: lesson => call('POST', '/lessons', lesson),
        replace: (id, lesson) => call('PUT', lessonPath(id), lesson),
        remove: id => call('DELETE', lessonPath(id)),
        reorder: ids => call('PUT', '/order', {ids: ids}),
        upload: body => call('POST', '/upload', body, true)
    };
};

export {
    AdminApiError,
    createAdminApi
};
