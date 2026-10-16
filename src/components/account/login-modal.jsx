/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import styles from './account.css';

class LoginModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleUsername', 'handlePassword', 'handleSubmit']);
        this.state = {username: '', password: ''};
    }
    handleUsername (event) {
        this.setState({username: event.target.value});
    }
    handlePassword (event) {
        this.setState({password: event.target.value});
    }
    handleSubmit (event) {
        event.preventDefault();
        this.props.onSubmit(this.state.username, this.state.password);
    }
    render () {
        return (
            <Modal
                className={styles.modalContent}
                contentLabel="Giriş"
                headerClassName={styles.header}
                id="accountLoginModal"
                onRequestClose={this.props.onClose}
            >
                <form
                    className={styles.body}
                    onSubmit={this.handleSubmit}
                >
                    {this.props.error ? <div
                        className={styles.error}
                        data-role="error"
                    >{this.props.error}</div> : null}
                    <label className={styles.field}>
                        <span>Kullanıcı adı / takma ad</span>
                        <input
                            autoComplete="username"
                            className={styles.input}
                            data-field="username"
                            type="text"
                            value={this.state.username}
                            onChange={this.handleUsername}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Şifre</span>
                        <input
                            autoComplete="current-password"
                            className={styles.input}
                            data-field="password"
                            type="password"
                            value={this.state.password}
                            onChange={this.handlePassword}
                        />
                    </label>
                    <button
                        className={styles.primary}
                        disabled={this.props.busy}
                        type="submit"
                    >
                        Giriş yap
                    </button>
                    <p className={styles.switch}>
                        {'Hesabın yok mu? '}
                        <button
                            className={styles.link}
                            data-action="switch"
                            type="button"
                            onClick={this.props.onSwitch}
                        >
                            Kaydol
                        </button>
                    </p>
                </form>
            </Modal>
        );
    }
}

LoginModal.propTypes = {
    busy: PropTypes.bool,
    error: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onSwitch: PropTypes.func.isRequired
};

export default LoginModal;
