/**
 * @fileoverview
 * Yönetici API'sinin (/api/admin/*) istemcisi: oturum ve hesap yönetimi. Hata mesajları Türkçedir.
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
    const call = (method, path, body) => {
        const options = {method: method, credentials: 'same-origin', headers: {}};
        if (typeof body !== 'undefined') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
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

    return {
        me: () => call('GET', '/me').then(() => true, error => {
            if (error.status === 401) return false;
            throw error;
        }),
        login: password => call('POST', '/login', {password: password}),
        logout: () => call('POST', '/logout'),
        accounts: () => call('GET', '/accounts'),
        approveTeacher: (id, approved) => call('POST', `/teachers/${id}/approve`, {approved: Boolean(approved)}),
        removeTeacher: id => call('DELETE', `/teachers/${id}`),
        resetTeacherPassword: (id, password) => call('POST', `/teachers/${id}/reset-password`, {password: password})
    };
};

export {
    AdminApiError,
    createAdminApi
};
