/**
 * Rehberli ders API'sinin (/api/lessons) istemcisi. Hesap API'sinin hata biçimini kullanır.
 */
import {AccountApiError} from '../accounts/account-api';

const createLessonApi = ({fetchFn, baseUrl = '/api/lessons'}) => {
    const call = (method, path, body, kind) => {
        const options = {method: method, credentials: 'same-origin', headers: {}};
        if (typeof body !== 'undefined') {
            if (kind === 'raw') {
                options.headers['Content-Type'] = 'application/octet-stream';
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        return fetchFn(`${baseUrl}${path}`, options)
            .catch(() => {
                throw new AccountApiError('Sunucuya ulaşılamadı', 0);
            })
            .then(response => {
                if (response.status === 204) return null;
                return response.json().catch(() => ({}))
                    .then(data => {
                        if (!response.ok) {
                            const detail = data.errors && data.errors.length ? `: ${data.errors.join(', ')}` : '';
                            const message = data.error || `İstek başarısız (${response.status})`;
                            throw new AccountApiError(`${message}${detail}`, response.status, data);
                        }
                        return data;
                    });
            });
    };
    const fields = draft => ({
        title: draft.title,
        description: draft.description || '',
        classId: draft.classId || null,
        steps: draft.steps
    });
    return {
        list: () => call('GET', ''),
        get: id => call('GET', `/${id}`),
        create: draft => call('POST', '', fields(draft)),
        update: (id, draft) => call('PUT', `/${id}`, fields(draft)),
        uploadProject: (id, blob) => call('PUT', `/${id}/file`, blob, 'raw'),
        remove: id => call('DELETE', `/${id}`),
        download: id => fetchFn(`${baseUrl}/${id}/file`, {credentials: 'same-origin'})
            .catch(() => {
                throw new AccountApiError('Sunucuya ulaşılamadı', 0);
            })
            .then(response => {
                if (!response.ok) throw new AccountApiError('Ders projesi indirilemedi', response.status);
                return response.arrayBuffer();
            })
    };
};

export {createLessonApi};
