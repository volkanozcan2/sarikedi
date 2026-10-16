/**
 * Paylaşılan projelerin beğenileri, yorumları ve bildirimleri. Kim neyi görebilir kararı user-routes.js'tedir;
 * burası yalnızca veriyi saklar ve sayar.
 */

const {ValidationError} = require('./errors');

const COMMENT_MAX = 300;
const HIDE_AFTER_REPORTS = 2;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;

class RateError extends Error {
    constructor () {
        super('Çok fazla yorum yazdın. Biraz bekle.');
        this.name = 'RateError';
    }
}

const createSocial = (db, {now = Date.now}) => {
    db.exec(`CREATE TABLE IF NOT EXISTS likes (
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (project_id, user_id)
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        body TEXT NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_ms INTEGER NOT NULL
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS reports (
        project_id INTEGER NOT NULL,
        comment_id INTEGER NOT NULL DEFAULT 0,
        reporter_id INTEGER NOT NULL,
        created_ms INTEGER NOT NULL,
        PRIMARY KEY (project_id, comment_id, reporter_id)
    )`);

    const likeCount = id => db.prepare('SELECT COUNT(*) AS n FROM likes WHERE project_id = ?').get(id).n;

    const toggleLike = (projectId, userId) => {
        const existing = db.prepare('SELECT 1 FROM likes WHERE project_id = ? AND user_id = ?').get(projectId, userId);
        if (existing) {
            db.prepare('DELETE FROM likes WHERE project_id = ? AND user_id = ?').run(projectId, userId);
        } else {
            db.prepare('INSERT INTO likes (project_id, user_id) VALUES (?, ?)').run(projectId, userId);
        }
        return {liked: !existing, likes: likeCount(projectId)};
    };

    const likeInfo = (projectId, userId) => ({
        likes: likeCount(projectId),
        liked: Boolean(db.prepare('SELECT 1 FROM likes WHERE project_id = ? AND user_id = ?').get(projectId, userId))
    });

    const commentCount = projectId => db
        .prepare('SELECT COUNT(*) AS n FROM comments WHERE project_id = ? AND hidden = 0').get(projectId).n;

    const addComment = (projectId, userId, body) => {
        const text = typeof body === 'string' ? body.trim() : '';
        if (text.length < 1 || text.length > COMMENT_MAX) {
            throw new ValidationError([`Yorum 1-${COMMENT_MAX} karakter olmalı`], 'Yorum eklenemedi');
        }
        const recent = db.prepare('SELECT COUNT(*) AS n FROM comments WHERE user_id = ? AND created_ms > ?')
            .get(userId, now() - RATE_WINDOW_MS).n;
        if (recent >= RATE_MAX) throw new RateError();
        const info = db.prepare('INSERT INTO comments (project_id, user_id, body, created_ms) VALUES (?, ?, ?, ?)')
            .run(projectId, userId, text, now());
        return info.lastInsertRowid;
    };

    const commentRow = id => db.prepare(`SELECT c.*, u.username AS author_name, u.role AS author_role
        FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`).get(id) || null;

    const listComments = projectId => db.prepare(`SELECT c.*, u.username AS author_name, u.role AS author_role
        FROM comments c JOIN users u ON u.id = c.user_id
        WHERE c.project_id = ? AND c.hidden = 0 ORDER BY c.id`).all(projectId);

    const deleteComment = id => {
        db.prepare('DELETE FROM reports WHERE comment_id = ?').run(id);
        db.prepare('DELETE FROM comments WHERE id = ?').run(id);
    };

    const report = (projectId, commentId, reporterId) => {
        db.prepare(
            'INSERT OR IGNORE INTO reports (project_id, comment_id, reporter_id, created_ms) VALUES (?, ?, ?, ?)'
        )
            .run(projectId, commentId || 0, reporterId, now());
        if (commentId) {
            const count = db.prepare('SELECT COUNT(*) AS n FROM reports WHERE comment_id = ?').get(commentId).n;
            if (count >= HIDE_AFTER_REPORTS) db.prepare('UPDATE comments SET hidden = 1 WHERE id = ?').run(commentId);
        }
    };

    const restoreComment = id => {
        db.prepare('UPDATE comments SET hidden = 0 WHERE id = ?').run(id);
        db.prepare('DELETE FROM reports WHERE comment_id = ?').run(id);
    };

    // projeler için bildirimler: yorum bildirimleri (sayı + gizli mi) ve proje bildirimleri
    const reportsFor = projectIds => {
        if (projectIds.length === 0) return [];
        const marks = projectIds.map(() => '?').join(',');
        const comments = db.prepare(`SELECT c.id AS comment_id, c.body, c.hidden, c.project_id,
            u.username AS author_name, COUNT(r.reporter_id) AS reports
            FROM reports r JOIN comments c ON c.id = r.comment_id JOIN users u ON u.id = c.user_id
            WHERE r.comment_id != 0 AND r.project_id IN (${marks}) GROUP BY c.id ORDER BY MAX(r.created_ms) DESC`)
            .all(...projectIds)
            .map(row => ({
                kind: 'comment',
                commentId: row.comment_id,
                projectId: row.project_id,
                body: row.body,
                author: row.author_name,
                hidden: row.hidden === 1,
                reports: row.reports
            }));
        const projects = db.prepare(`SELECT r.project_id, COUNT(*) AS reports FROM reports r
            WHERE r.comment_id = 0 AND r.project_id IN (${marks}) GROUP BY r.project_id`).all(...projectIds)
            .map(row => ({kind: 'project', projectId: row.project_id, reports: row.reports}));
        return comments.concat(projects);
    };

    const clearProject = projectId => {
        db.prepare('DELETE FROM likes WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM comments WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM reports WHERE project_id = ?').run(projectId);
    };

    const clearUser = userId => {
        db.prepare('DELETE FROM likes WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM reports WHERE reporter_id = ?').run(userId);
        db.prepare('SELECT id FROM comments WHERE user_id = ?').all(userId)
            .forEach(row => deleteComment(row.id));
    };

    return {
        toggleLike,
        likeInfo,
        commentCount,
        addComment,
        commentRow,
        listComments,
        deleteComment,
        report,
        restoreComment,
        reportsFor,
        clearProject,
        clearUser
    };
};

module.exports = {createSocial, RateError, COMMENT_MAX};
