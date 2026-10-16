/**
 * @fileoverview
 * Hesap API'sinin (/api/auth/*, /api/teacher/*) istemcisi. Hata mesajları Türkçedir.
 */

class AccountApiError extends Error {
    constructor (message, status, extra) {
        super(message);
        this.name = 'AccountApiError';
        this.status = status;
        this.errors = (extra && extra.errors) || [];
        this.pending = Boolean(extra && extra.pending);
    }
}

const createAccountApi = ({fetchFn, baseUrl = '/api'}) => {
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
                            throw new AccountApiError(
                                data.error || `İstek başarısız (${response.status})`, response.status, data
                            );
                        }
                        return data;
                    });
            });
    };

    const download = path => fetchFn(`${baseUrl}${path}`, {credentials: 'same-origin'})
        .catch(() => {
            throw new AccountApiError('Sunucuya ulaşılamadı', 0);
        })
        .then(response => {
            if (!response.ok) throw new AccountApiError('Proje indirilemedi', response.status);
            return response.arrayBuffer();
        });

    return {
        me: () => call('GET', '/auth/me').then(data => data.user),
        login: (username, password) => call('POST', '/auth/login', {username: username, password: password})
            .then(data => data.user),
        logout: () => call('POST', '/auth/logout'),
        registerTeacher: fields => call('POST', '/auth/register-teacher', fields),
        registerStudent: fields => call('POST', '/auth/register-student', fields).then(data => data.user),
        classes: () => call('GET', '/teacher/classes'),
        createClass: name => call('POST', '/teacher/classes', {name: name}),
        students: classId => call('GET', `/teacher/classes/${classId}/students`),
        resetStudentPassword: (studentId, password) => call(
            'POST', `/teacher/students/${studentId}/reset-password`, {password: password}
        ),
        removeStudent: studentId => call('DELETE', `/teacher/students/${studentId}`),
        // ---- projelerim ----
        projects: () => call('GET', '/projects'),
        saveProject: (title, blob) => call('POST', `/projects?title=${encodeURIComponent(title)}`, blob, 'raw'),
        updateProject: (id, blob) => call('PUT', `/projects/${id}`, blob, 'raw'),
        renameProject: (id, title) => call('POST', `/projects/${id}/rename`, {title: title}),
        removeProject: id => call('DELETE', `/projects/${id}`),
        shareProject: (id, shared, scope) => call('POST', `/projects/${id}/share`, {shared: shared, scope: scope}),
        saveThumbnail: (id, blob) => call('PUT', `/projects/${id}/thumbnail`, blob, 'raw'),
        // ---- paylaşılanlar ----
        shared: () => call('GET', '/shared'),
        sharedProject: id => call('GET', `/shared/${id}`),
        like: id => call('POST', `/shared/${id}/like`),
        addComment: (id, body) => call('POST', `/shared/${id}/comments`, {body: body}),
        deleteComment: (id, commentId) => call('DELETE', `/shared/${id}/comments/${commentId}`),
        report: (id, commentId) => call('POST', `/shared/${id}/report`, commentId ? {commentId: commentId} : {}),
        downloadShared: id => download(`/shared/${id}/file`),
        // ---- öğretmen: moderasyon ----
        reports: () => call('GET', '/teacher/reports'),
        restoreComment: commentId => call('POST', `/teacher/comments/${commentId}/restore`),
        setProjectScope: (id, scope) => call('POST', `/teacher/projects/${id}/scope`, {scope: scope}),
        removeStudentProject: id => call('DELETE', `/teacher/projects/${id}`),
        unshareProject: id => call('POST', `/teacher/projects/${id}/unshare`),
        downloadProject: id => download(`/projects/${id}/file`)
    };
};

export {
    AccountApiError,
    createAccountApi
};
