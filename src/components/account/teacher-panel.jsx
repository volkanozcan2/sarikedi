/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import styles from './account.css';

const idOf = event => Number(event.currentTarget.getAttribute('data-id'));

class TeacherPanel extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClassName', 'handleCreate', 'handleToggle', 'handleResetStart', 'handleNewPassword',
            'handleResetSave', 'handleRemove', 'handleCopy', 'handleRestore', 'handleDeleteReported', 'handleUnshare'
        ]);
        this.state = {className: '', resetting: null, newPassword: ''};
    }
    handleClassName (event) {
        this.setState({className: event.target.value});
    }
    handleCreate (event) {
        event.preventDefault();
        this.props.onCreateClass(this.state.className);
        this.setState({className: ''});
    }
    handleToggle (event) {
        this.props.onToggleClass(idOf(event));
    }
    handleResetStart (event) {
        this.setState({resetting: idOf(event), newPassword: ''});
    }
    handleNewPassword (event) {
        this.setState({newPassword: event.target.value});
    }
    handleResetSave () {
        this.props.onResetPassword(this.state.resetting, this.state.newPassword);
        this.setState({resetting: null, newPassword: ''});
    }
    handleRemove (event) {
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu öğrenci ve tüm projeleri silinecek. Emin misin?')) {
            this.props.onRemoveStudent(idOf(event));
        }
    }
    handleRestore (event) {
        this.props.onRestoreComment(Number(event.currentTarget.getAttribute('data-comment')));
    }
    handleDeleteReported (event) {
        const button = event.currentTarget;
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu yorum silinecek. Emin misin?')) {
            this.props.onDeleteReportedComment(
                Number(button.getAttribute('data-project')), Number(button.getAttribute('data-comment'))
            );
        }
    }
    handleUnshare (event) {
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu proje paylaşımdan kaldırılacak. Emin misin?')) {
            this.props.onUnshareProject(Number(event.currentTarget.getAttribute('data-project')));
        }
    }
    handleCopy (event) {
        const code = event.currentTarget.getAttribute('data-code');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code);
    }
    renderStudent (student) {
        const editing = this.state.resetting === student.id;
        return (
            <li
                className={styles.student}
                key={student.id}
            >
                <span className={styles.studentName}>
                    <strong>{student.username}</strong>
                    <span className={styles.realName}>{student.realName}</span>
                </span>
                {editing ? (
                    <span className={styles.inline}>
                        <input
                            className={styles.input}
                            data-field="newPassword"
                            placeholder="Yeni şifre"
                            type="text"
                            value={this.state.newPassword}
                            onChange={this.handleNewPassword}
                        />
                        <button
                            className={styles.small}
                            data-action="reset-save"
                            disabled={this.props.busy}
                            onClick={this.handleResetSave}
                        >
                            Kaydet
                        </button>
                    </span>
                ) : (
                    <span className={styles.inline}>
                        <button
                            className={styles.small}
                            data-action="reset-start"
                            data-id={student.id}
                            onClick={this.handleResetStart}
                        >
                            Şifre sıfırla
                        </button>
                        <button
                            className={styles.smallDanger}
                            data-action="remove-student"
                            data-id={student.id}
                            onClick={this.handleRemove}
                        >
                            Çıkar
                        </button>
                    </span>
                )}
            </li>
        );
    }
    renderClass (klass) {
        const open = this.props.expandedId === klass.id;
        const students = this.props.studentsByClass[klass.id] || [];
        return (
            <li
                className={styles.klass}
                key={klass.id}
            >
                <div className={styles.klassHead}>
                    <span>
                        <strong>{klass.name}</strong>
                        <span className={styles.realName}>{`${klass.studentCount} öğrenci`}</span>
                    </span>
                    <span className={styles.inline}>
                        <code className={styles.code}>{klass.code}</code>
                        <button
                            className={styles.small}
                            data-action="copy-code"
                            data-code={klass.code}
                            onClick={this.handleCopy}
                        >
                            Kopyala
                        </button>
                        <button
                            className={styles.small}
                            data-action="toggle-class"
                            data-id={klass.id}
                            onClick={this.handleToggle}
                        >
                            {open ? 'Gizle' : 'Öğrenciler'}
                        </button>
                    </span>
                </div>
                {open ? (
                    <ul className={styles.students}>
                        {students.length === 0 ? <li className={styles.hint}>Bu sınıfta henüz öğrenci yok.</li> : null}
                        {students.map(student => this.renderStudent(student))}
                    </ul>
                ) : null}
            </li>
        );
    }
    renderReports () {
        if (this.props.reports.length === 0) return null;
        return (
            <div className={styles.moderation}>
                <div>
                    <strong>Bildirimler</strong>
                    <ul className={styles.comments}>
                        {this.props.reports.map(item => (
                            <li
                                className={styles.comment}
                                key={`${item.kind}-${item.commentId || item.projectId}`}
                            >
                                {item.kind === 'comment' ? (
                                    <React.Fragment>
                                        <div>
                                            <div>{`"${item.body}" — ${item.author}`}</div>
                                            <div className={styles.realName}>
                                                {`Proje: ${item.projectTitle} · ${item.reports} bildirim`}
                                                {item.hidden ? ' · gizlendi' : ''}
                                            </div>
                                        </div>
                                        <span className={styles.inline}>
                                            <button
                                                className={styles.small}
                                                data-action="restore-comment"
                                                data-comment={item.commentId}
                                                onClick={this.handleRestore}
                                            >
                                                Geri getir
                                            </button>
                                            <button
                                                className={styles.smallDanger}
                                                data-action="delete-reported"
                                                data-comment={item.commentId}
                                                data-project={item.projectId}
                                                onClick={this.handleDeleteReported}
                                            >
                                                Sil
                                            </button>
                                        </span>
                                    </React.Fragment>
                                ) : (
                                    <React.Fragment>
                                        <div>
                                            <div>{`Proje: ${item.projectTitle}`}</div>
                                            <div className={styles.realName}>{`${item.reports} bildirim`}</div>
                                        </div>
                                        <button
                                            className={styles.smallDanger}
                                            data-action="unshare-reported"
                                            data-project={item.projectId}
                                            onClick={this.handleUnshare}
                                        >
                                            Paylaşımdan kaldır
                                        </button>
                                    </React.Fragment>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
    render () {
        return (
            <Modal
                className={styles.wideModal}
                contentLabel="Sınıflarım"
                headerClassName={styles.header}
                id="teacherPanelModal"
                onRequestClose={this.props.onClose}
            >
                <div className={styles.body}>
                    <p className={styles.hint}>
                        {'Öğrencilerin kaydolurken sınıf kodunu girer. Kodu sadece öğrencilerinle paylaş.'}
                    </p>
                    {this.props.error ? <div className={styles.error}>{this.props.error}</div> : null}
                    {this.renderReports()}
                    {this.props.message ? <div className={styles.notice}>{this.props.message}</div> : null}
                    <form
                        className={styles.inline}
                        onSubmit={this.handleCreate}
                    >
                        <input
                            className={styles.input}
                            data-field="className"
                            placeholder="Yeni sınıf adı (ör. 5-A)"
                            type="text"
                            value={this.state.className}
                            onChange={this.handleClassName}
                        />
                        <button
                            className={styles.small}
                            disabled={this.props.busy}
                            type="submit"
                        >
                            Sınıf aç
                        </button>
                    </form>
                    {this.props.classes.length === 0 ? (
                        <p className={styles.hint}>Henüz sınıfın yok. Yukarıdan bir sınıf aç.</p>
                    ) : (
                        <ul className={styles.classes}>
                            {this.props.classes.map(klass => this.renderClass(klass))}
                        </ul>
                    )}
                </div>
            </Modal>
        );
    }
}

TeacherPanel.defaultProps = {
    reports: []
};

TeacherPanel.propTypes = {
    busy: PropTypes.bool,
    classes: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number, name: PropTypes.string, code: PropTypes.string, studentCount: PropTypes.number
    })).isRequired,
    error: PropTypes.string,
    expandedId: PropTypes.number,
    message: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onCreateClass: PropTypes.func.isRequired,
    onDeleteReportedComment: PropTypes.func,
    onRemoveStudent: PropTypes.func.isRequired,
    onRestoreComment: PropTypes.func,
    onUnshareProject: PropTypes.func,
    onResetPassword: PropTypes.func.isRequired,
    onToggleClass: PropTypes.func.isRequired,
    reports: PropTypes.arrayOf(PropTypes.shape({kind: PropTypes.string})),
    studentsByClass: PropTypes.objectOf(PropTypes.array).isRequired
};

export default TeacherPanel;
