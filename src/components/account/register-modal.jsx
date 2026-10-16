/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import styles from './account.css';

const FIELDS = {
    teacher: [
        {name: 'realName', label: 'İsmin', type: 'text', autoComplete: 'name'},
        {name: 'school', label: 'Okulun', type: 'text', autoComplete: 'organization'},
        {name: 'username', label: 'Kullanıcı adı (giriş için)', type: 'text', autoComplete: 'username'},
        {name: 'password', label: 'Şifre (en az 6 karakter)', type: 'password', autoComplete: 'new-password'}
    ],
    student: [
        {name: 'classCode', label: 'Sınıf kodu (öğretmeninden al)', type: 'text', autoComplete: 'off'},
        {name: 'realName', label: 'Gerçek ismin', type: 'text', autoComplete: 'name'},
        {name: 'username', label: 'Takma ad', type: 'text', autoComplete: 'username'},
        {name: 'password', label: 'Şifre (en az 6 karakter)', type: 'password', autoComplete: 'new-password'}
    ]
};

class RegisterModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleSubmit', 'handleTeacher', 'handleStudent']);
        this.state = {role: null, values: {}};
        this.changers = {};
    }
    handleTeacher () {
        this.setState({role: 'teacher', values: {}});
    }
    handleStudent () {
        this.setState({role: 'student', values: {}});
    }
    getChanger (name) {
        if (!this.changers[name]) {
            this.changers[name] = event => {
                const values = Object.assign({}, this.state.values, {[name]: event.target.value});
                this.setState({values: values});
            };
        }
        return this.changers[name];
    }
    handleSubmit (event) {
        event.preventDefault();
        this.props.onSubmit(this.state.role, this.state.values);
    }
    renderRoleChoice () {
        return (
            <div className={styles.body}>
                <div className={styles.roles}>
                    <button
                        className={styles.role}
                        data-role="teacher"
                        type="button"
                        onClick={this.handleTeacher}
                    >
                        Öğretmenim
                        <small>Sınıf aç, öğrencilerini yönet</small>
                    </button>
                    <button
                        className={styles.role}
                        data-role="student"
                        type="button"
                        onClick={this.handleStudent}
                    >
                        Öğrenciyim
                        <small>Öğretmenimin verdiği kodla</small>
                    </button>
                </div>
                {this.renderSwitch()}
            </div>
        );
    }
    renderSwitch () {
        return (
            <p className={styles.switch}>
                {'Zaten hesabın var mı? '}
                <button
                    className={styles.link}
                    data-action="switch"
                    type="button"
                    onClick={this.props.onSwitch}
                >
                    Giriş yap
                </button>
            </p>
        );
    }
    renderForm () {
        const role = this.state.role;
        const errors = this.props.errors && this.props.errors.length > 0 ? this.props.errors : [this.props.error];
        return (
            <form
                className={styles.body}
                onSubmit={this.handleSubmit}
            >
                {this.props.error ? (
                    <div
                        className={styles.error}
                        data-role="error"
                    >
                        {errors.filter(Boolean).map((message, index) => <div key={index}>{message}</div>)}
                    </div>
                ) : null}
                {role === 'student' ? (
                    <p className={styles.hint}>
                        {'Takma adın herkese görünür. Gerçek ismini sadece öğretmenin görür; yorumlarda ve ' +
                        'paylaşımlarda yalnızca takma adın yazar.'}
                    </p>
                ) : null}
                {FIELDS[role].map(field => (
                    <label
                        className={styles.field}
                        key={field.name}
                    >
                        <span>{field.label}</span>
                        <input
                            autoComplete={field.autoComplete}
                            className={styles.input}
                            data-field={field.name}
                            type={field.type}
                            value={this.state.values[field.name] || ''}
                            onChange={this.getChanger(field.name)}
                        />
                    </label>
                ))}
                <button
                    className={styles.primary}
                    disabled={this.props.busy}
                    type="submit"
                >
                    Kaydol
                </button>
                {this.renderSwitch()}
            </form>
        );
    }
    render () {
        let content;
        if (this.props.pendingNotice) {
            content = (
                <div className={styles.body}>
                    <div className={styles.notice}>
                        {'Kaydın alındı. Yönetici hesabını onayladığında giriş yapabilir, sınıf açıp ' +
                        'öğrencilerine kod verebilirsin.'}
                    </div>
                </div>
            );
        } else {
            content = this.state.role ? this.renderForm() : this.renderRoleChoice();
        }
        return (
            <Modal
                className={styles.modalContent}
                contentLabel="Kaydol"
                headerClassName={styles.header}
                id="accountRegisterModal"
                onRequestClose={this.props.onClose}
            >
                {content}
            </Modal>
        );
    }
}

RegisterModal.propTypes = {
    busy: PropTypes.bool,
    error: PropTypes.string,
    errors: PropTypes.arrayOf(PropTypes.string),
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onSwitch: PropTypes.func.isRequired,
    pendingNotice: PropTypes.bool
};

export default RegisterModal;
