/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

const idOf = event => Number(event.currentTarget.getAttribute('data-id'));

class AuthorAccounts extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleApprove', 'handleUnapprove', 'handleRemove', 'handleResetStart', 'handlePassword', 'handleResetSave'
        ]);
        this.state = {resetting: null, newPassword: ''};
    }
    handleApprove (event) {
        this.props.onApprove(idOf(event), true);
    }
    handleUnapprove (event) {
        this.props.onApprove(idOf(event), false);
    }
    handleRemove (event) {
        // eslint-disable-next-line no-alert
        if (window.confirm('Öğretmen, sınıfları ve tüm öğrencileri silinecek. Emin misin?')) {
            this.props.onRemove(idOf(event));
        }
    }
    handleResetStart (event) {
        this.setState({resetting: idOf(event), newPassword: ''});
    }
    handlePassword (event) {
        this.setState({newPassword: event.target.value});
    }
    handleResetSave () {
        this.props.onResetPassword(this.state.resetting, this.state.newPassword);
        this.setState({resetting: null, newPassword: ''});
    }
    renderTeacher (teacher) {
        const act = (action, label, handler, extra) => (
            <button
                className={`${styles.button} ${extra || ''}`}
                data-action={action}
                data-id={teacher.id}
                disabled={this.props.busy}
                onClick={handler}
            >
                {label}
            </button>
        );
        return (
            <div
                className={styles.checkBox}
                key={teacher.id}
            >
                <div className={styles.row}>
                    <strong>{teacher.realName}</strong>
                    <span className={styles.muted}>{`${teacher.school} · ${teacher.username}`}</span>
                    <span className={teacher.approved ? styles.muted : styles.warning}>
                        {teacher.approved ? 'Onaylı' : 'Onay bekliyor'}
                    </span>
                </div>
                <div className={styles.row}>
                    {teacher.approved ?
                        act('unapprove', 'Onayı kaldır', this.handleUnapprove) :
                        act('approve', 'Onayla', this.handleApprove, styles.primary)}
                    {act('reset-start', 'Şifre sıfırla', this.handleResetStart)}
                    {act('remove', 'Sil', this.handleRemove, styles.danger)}
                </div>
                {this.state.resetting === teacher.id ? (
                    <div className={styles.row}>
                        <input
                            className={styles.input}
                            data-field="newPassword"
                            placeholder="Yeni şifre (en az 6 karakter)"
                            type="text"
                            value={this.state.newPassword}
                            onChange={this.handlePassword}
                        />
                        <button
                            className={`${styles.button} ${styles.primary}`}
                            data-action="reset-save"
                            onClick={this.handleResetSave}
                        >
                            Kaydet
                        </button>
                    </div>
                ) : null}
                {teacher.classes.map(klass => (
                    <div
                        className={styles.muted}
                        key={klass.id}
                    >
                        <strong>{`${klass.name} (kod: ${klass.code})`}</strong>
                        {klass.students.length === 0 ? ' · öğrenci yok' : ''}
                        {klass.students.map(student => (
                            <div key={student.id}>{`  ${student.username} — ${student.realName}`}</div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }
    render () {
        return (
            <div>
                <div className={styles.row}>
                    {this.props.onBack ? (
                        <button
                            className={styles.button}
                            data-action="back"
                            onClick={this.props.onBack}
                        >
                            Geri
                        </button>
                    ) : null}
                    <strong>Hesaplar</strong>
                    {this.props.onLogout ? (
                        <button
                            className={styles.button}
                            data-action="logout"
                            onClick={this.props.onLogout}
                        >
                            Çıkış
                        </button>
                    ) : null}
                </div>
                {this.props.teachers.length === 0 ?
                    <p className={styles.muted}>Henüz kayıtlı öğretmen yok.</p> : null}
                {this.props.teachers.map(teacher => this.renderTeacher(teacher))}
            </div>
        );
    }
}

AuthorAccounts.propTypes = {
    busy: PropTypes.bool,
    onApprove: PropTypes.func.isRequired,
    onBack: PropTypes.func,
    onLogout: PropTypes.func,
    onRemove: PropTypes.func.isRequired,
    onResetPassword: PropTypes.func.isRequired,
    teachers: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        username: PropTypes.string,
        realName: PropTypes.string,
        school: PropTypes.string,
        approved: PropTypes.bool,
        classes: PropTypes.array
    })).isRequired
};

export default AuthorAccounts;
