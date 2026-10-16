/* eslint-disable react/jsx-no-literals, react/jsx-handler-names */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import AuthorAccounts from '../components/author/author-accounts.jsx';
import AuthorLogin from '../components/author/author-login.jsx';
import styles from '../components/author/author.css';
import {createAdminApi} from '../lib/admin/admin-api';
import {isAuthorMode} from '../lib/admin/admin-mode';

const SESSION_ENDED = 'Oturum bitti, tekrar giriş yap';

/** Yönetici paneli (/?author): yönetici girişi ve öğretmen hesaplarının onayı/yönetimi. */
class AuthorPanel extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['toggleOpen', 'login', 'logout', 'approveTeacher', 'removeTeacher', 'resetTeacherPassword']);
        this.enabled = typeof props.isAuthorMode === 'boolean' ? props.isAuthorMode :
            isAuthorMode(window.location.search);
        this.api = props.api || createAdminApi({fetchFn: (...args) => window.fetch(...args)});
        this.state = {open: false, status: 'checking', busy: false, error: null, message: null, teachers: []};
        this.checkedSession = false;
    }
    run (task) {
        this.setState({busy: true, error: null});
        return Promise.resolve().then(task)
            .then(result => {
                this.setState({busy: false});
                return result;
            }, error => {
                if (error && error.status === 401 && this.state.status !== 'login') {
                    this.setState({busy: false, status: 'login', error: SESSION_ENDED});
                } else {
                    this.setState({busy: false, error: error && error.message ? error.message : 'Bir hata oluştu'});
                }
                return null;
            });
    }
    reloadAccounts () {
        return this.api.accounts().then(overview => this.setState({status: 'accounts', teachers: overview.teachers}));
    }
    toggleOpen () {
        const open = !this.state.open;
        this.setState({open: open});
        if (open && !this.checkedSession) {
            this.checkedSession = true;
            this.run(() => this.api.me().then(isAdmin => (
                isAdmin ? this.reloadAccounts() : this.setState({status: 'login'})
            )));
        }
    }
    login (password) {
        return this.run(() => this.api.login(password).then(() => this.reloadAccounts()));
    }
    logout () {
        return this.run(() => this.api.logout().then(() => this.setState({
            status: 'login', teachers: [], error: null, message: null
        })));
    }
    approveTeacher (id, approved) {
        return this.run(() => this.api.approveTeacher(id, approved).then(() => this.reloadAccounts()));
    }
    removeTeacher (id) {
        return this.run(() => this.api.removeTeacher(id).then(() => this.reloadAccounts()));
    }
    resetTeacherPassword (id, password) {
        return this.run(() => this.api.resetTeacherPassword(id, password)
            .then(() => this.setState({message: 'Şifre değiştirildi'})));
    }
    renderBody () {
        const s = this.state;
        if (s.status === 'checking') return <p className={styles.muted}>Denetleniyor…</p>;
        if (s.status === 'login') {
            return (
                <AuthorLogin
                    busy={s.busy}
                    error={s.error}
                    onLogin={this.login}
                />
            );
        }
        return (
            <div>
                {s.message ? <div className={styles.message}>{s.message}</div> : null}
                <AuthorAccounts
                    busy={s.busy}
                    teachers={s.teachers}
                    onApprove={this.approveTeacher}
                    onLogout={this.logout}
                    onRemove={this.removeTeacher}
                    onResetPassword={this.resetTeacherPassword}
                />
            </div>
        );
    }
    render () {
        if (!this.enabled) return null;
        if (!this.state.open) {
            return (
                <button
                    className={styles.authorToggle}
                    onClick={this.toggleOpen}
                >
                    Yönetici
                </button>
            );
        }
        return (
            <div className={styles.authorPanel}>
                <div className={styles.authorHeader}>
                    <span className={styles.authorHeaderTitle}>Yönetici</span>
                    <button
                        className={styles.button}
                        onClick={this.toggleOpen}
                    >
                        Küçült
                    </button>
                </div>
                <div className={styles.authorBody}>
                    {this.state.error && this.state.status !== 'login' ?
                        <div className={styles.error}>{this.state.error}</div> : null}
                    {this.renderBody()}
                </div>
            </div>
        );
    }
}

AuthorPanel.propTypes = {
    api: PropTypes.shape({me: PropTypes.func}),
    isAuthorMode: PropTypes.bool
};

export {
    AuthorPanel as AuthorPanelComponent
};

export default AuthorPanel;
