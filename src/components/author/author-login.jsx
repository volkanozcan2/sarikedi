/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

class AuthorLogin extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleChange', 'handleKeyDown', 'handleSubmit']);
        this.state = {password: ''};
    }
    handleChange (event) {
        this.setState({password: event.target.value});
    }
    handleKeyDown (event) {
        if (event.key === 'Enter' && this.state.password && !this.props.busy) this.handleSubmit();
    }
    handleSubmit () {
        this.props.onLogin(this.state.password);
    }
    render () {
        return (
            <div className={styles.section}>
                <label className={styles.field}>
                    <span>Yönetici şifresi</span>
                    <input
                        className={styles.input}
                        type="password"
                        value={this.state.password}
                        onChange={this.handleChange}
                        onKeyDown={this.handleKeyDown}
                    />
                </label>
                {this.props.error ? <div className={styles.error}>{this.props.error}</div> : null}
                <button
                    className={`${styles.button} ${styles.primary}`}
                    disabled={this.props.busy || !this.state.password}
                    onClick={this.handleSubmit}
                >
                    Giriş
                </button>
            </div>
        );
    }
}

AuthorLogin.propTypes = {
    busy: PropTypes.bool,
    error: PropTypes.string,
    onLogin: PropTypes.func.isRequired
};

export default AuthorLogin;
