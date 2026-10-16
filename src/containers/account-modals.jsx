/* eslint-disable react/jsx-handler-names, react/no-did-update-set-state */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import LoginModal from '../components/account/login-modal.jsx';
import RegisterModal from '../components/account/register-modal.jsx';
import TeacherPanel from '../components/account/teacher-panel.jsx';
import {createAccountApi} from '../lib/accounts/account-api';
import {
    closeLoginModal, closeRegisterModal, closeTeacherPanel, openLoginModal, openRegisterModal
} from '../reducers/modals';
import {setAccount} from '../reducers/account';

/**
 * Hesap pencereleri (giriş, kayıt, öğretmen paneli) ve oturum durumunun sunucudan okunması. Açılışta
 * "kimim?" diye sorar; sonucu redux'a yazar, böylece menü çubuğu doğru düğmeleri gösterir.
 */
class AccountModals extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'login', 'register', 'switchToRegister', 'switchToLogin', 'createClass', 'toggleClass', 'resetPassword',
            'removeStudent', 'closeLogin', 'closeRegister', 'restoreComment', 'deleteReportedComment', 'unshareProject'
        ]);
        this.api = props.api || createAccountApi({fetchFn: (...args) => window.fetch(...args)});
        this.state = {
            busy: false,
            error: null,
            errors: [],
            pendingNotice: false,
            classes: [],
            studentsByClass: {},
            expandedId: null,
            teacherError: null,
            teacherMessage: null
        };
    }
    componentDidMount () {
        this.api.me().then(user => this.props.onSetUser(user), () => this.props.onSetUser(null));
        if (this.props.teacherOpen) this.loadClasses();
    }
    componentDidUpdate (prevProps) {
        if (this.props.teacherOpen && !prevProps.teacherOpen) this.loadClasses();
        if (this.props.registerOpen && !prevProps.registerOpen) {
            this.setState({error: null, errors: [], pendingNotice: false});
        }
        if (this.props.loginOpen && !prevProps.loginOpen) this.setState({error: null});
    }
    // ---- ortak ----
    run (task) {
        this.setState({busy: true});
        return Promise.resolve().then(task)
            .then(result => {
                this.setState({busy: false});
                return result;
            }, error => {
                this.setState({busy: false});
                throw error;
            });
    }
    // ---- giriş / kayıt ----
    login (username, password) {
        this.setState({error: null});
        return this.run(() => this.api.login(username, password)).then(user => {
            this.props.onSetUser(user);
            this.props.onCloseLogin();
        }, error => this.setState({error: error.message}));
    }
    register (role, fields) {
        this.setState({error: null, errors: []});
        const task = role === 'teacher' ? this.api.registerTeacher(fields) : this.api.registerStudent(fields);
        return this.run(() => task).then(result => {
            if (role === 'teacher') {
                this.setState({pendingNotice: true});
                return;
            }
            this.props.onSetUser(result);
            this.props.onCloseRegister();
        }, error => this.setState({error: error.message, errors: error.errors || []}));
    }
    closeLogin () {
        this.setState({error: null});
        this.props.onCloseLogin();
    }
    closeRegister () {
        this.setState({error: null, errors: [], pendingNotice: false});
        this.props.onCloseRegister();
    }
    switchToRegister () {
        this.props.onCloseLogin();
        this.props.onOpenRegister();
    }
    switchToLogin () {
        this.props.onCloseRegister();
        this.props.onOpenLogin();
    }
    // ---- öğretmen paneli ----
    teacherFailure (error) {
        this.setState({teacherError: error.message, teacherMessage: null});
    }
    loadReports () {
        return this.api.reports().then(
            reports => this.setState({reports: reports}),
            () => this.setState({reports: []})
        );
    }
    restoreComment (commentId) {
        return this.run(() => this.api.restoreComment(commentId)).then(
            () => this.loadReports(),
            error => this.teacherFailure(error)
        );
    }
    deleteReportedComment (projectId, commentId) {
        return this.run(() => this.api.deleteComment(projectId, commentId)).then(
            () => this.loadReports(),
            error => this.teacherFailure(error)
        );
    }
    unshareProject (projectId) {
        return this.run(() => this.api.unshareProject(projectId)).then(
            () => this.loadReports(),
            error => this.teacherFailure(error)
        );
    }
    loadClasses () {
        this.setState({teacherError: null, teacherMessage: null});
        this.loadReports();
        return this.api.classes().then(
            classes => this.setState({classes: classes}),
            error => this.teacherFailure(error)
        );
    }
    createClass (name) {
        this.setState({teacherError: null, teacherMessage: null});
        return this.run(() => this.api.createClass(name)).then(
            () => this.loadClasses(),
            error => this.teacherFailure(error)
        );
    }
    toggleClass (classId) {
        if (this.state.expandedId === classId) {
            this.setState({expandedId: null});
            return Promise.resolve();
        }
        return this.api.students(classId).then(students => this.setState(state => ({
            expandedId: classId,
            studentsByClass: Object.assign({}, state.studentsByClass, {[classId]: students})
        })), error => this.teacherFailure(error));
    }
    resetPassword (studentId, password) {
        this.setState({teacherError: null, teacherMessage: null});
        return this.run(() => this.api.resetStudentPassword(studentId, password)).then(
            () => this.setState({teacherMessage: 'Şifre değiştirildi. Yeni şifreyi öğrenciye ilet.'}),
            error => this.teacherFailure(error)
        );
    }
    removeStudent (studentId) {
        this.setState({teacherError: null, teacherMessage: null});
        return this.run(() => this.api.removeStudent(studentId)).then(
            () => this.refreshOpenClass(),
            error => this.teacherFailure(error)
        );
    }
    refreshOpenClass () {
        const open = this.state.expandedId;
        return this.loadClasses().then(() => {
            if (!open) return null;
            return this.api.students(open).then(students => this.setState(state => ({
                studentsByClass: Object.assign({}, state.studentsByClass, {[open]: students})
            })));
        });
    }
    render () {
        const s = this.state;
        return (
            <React.Fragment>
                {this.props.loginOpen ? (
                    <LoginModal
                        busy={s.busy}
                        error={s.error}
                        onClose={this.closeLogin}
                        onSubmit={this.login}
                        onSwitch={this.switchToRegister}
                    />
                ) : null}
                {this.props.registerOpen ? (
                    <RegisterModal
                        busy={s.busy}
                        error={s.error}
                        errors={s.errors}
                        pendingNotice={s.pendingNotice}
                        onClose={this.closeRegister}
                        onSubmit={this.register}
                        onSwitch={this.switchToLogin}
                    />
                ) : null}
                {this.props.teacherOpen ? (
                    <TeacherPanel
                        busy={s.busy}
                        classes={s.classes}
                        error={s.teacherError}
                        expandedId={s.expandedId}
                        message={s.teacherMessage}
                        reports={s.reports}
                        studentsByClass={s.studentsByClass}
                        onClose={this.props.onCloseTeacher}
                        onCreateClass={this.createClass}
                        onDeleteReportedComment={this.deleteReportedComment}
                        onRemoveStudent={this.removeStudent}
                        onRestoreComment={this.restoreComment}
                        onUnshareProject={this.unshareProject}
                        onResetPassword={this.resetPassword}
                        onToggleClass={this.toggleClass}
                    />
                ) : null}
            </React.Fragment>
        );
    }
}

AccountModals.propTypes = {
    api: PropTypes.shape({me: PropTypes.func}),
    loginOpen: PropTypes.bool,
    onCloseLogin: PropTypes.func.isRequired,
    onCloseRegister: PropTypes.func.isRequired,
    onCloseTeacher: PropTypes.func.isRequired,
    onOpenLogin: PropTypes.func.isRequired,
    onOpenRegister: PropTypes.func.isRequired,
    onSetUser: PropTypes.func.isRequired,
    registerOpen: PropTypes.bool,
    teacherOpen: PropTypes.bool
};

const mapStateToProps = state => ({
    user: state.scratchGui.account.user,
    loginOpen: state.scratchGui.modals.accountLogin,
    registerOpen: state.scratchGui.modals.accountRegister,
    teacherOpen: state.scratchGui.modals.teacherPanel
});

const mapDispatchToProps = dispatch => ({
    onSetUser: user => dispatch(setAccount(user)),
    onCloseLogin: () => dispatch(closeLoginModal()),
    onCloseRegister: () => dispatch(closeRegisterModal()),
    onCloseTeacher: () => dispatch(closeTeacherPanel()),
    onOpenLogin: () => dispatch(openLoginModal()),
    onOpenRegister: () => dispatch(openRegisterModal())
});

export {
    AccountModals as AccountModalsComponent
};

export default connect(mapStateToProps, mapDispatchToProps)(AccountModals);
