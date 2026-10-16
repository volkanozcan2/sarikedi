/* eslint-disable react/jsx-no-literals */
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import loginIcon from './icon--login.svg';
import registerIcon from './icon--register.svg';
import styles from './account.css';

const AccountButtons = props => (
    <div className={classNames(styles.buttons, {[styles.buttonsAuthor]: props.authorMode})}>
        {props.user ? (
            <React.Fragment>
                <span className={styles.who}>
                    {props.user.role === 'teacher' ? `Öğretmen: ${props.user.username}` : props.user.username}
                </span>
                {props.user.role === 'teacher' ? (
                    <button
                        className={styles.pill}
                        data-action="teacher-panel"
                        onClick={props.onTeacherPanel}
                    >
                        Sınıflarım
                    </button>
                ) : null}
                <button
                    className={styles.pill}
                    data-action="logout"
                    onClick={props.onLogout}
                >
                    Çıkış
                </button>
            </React.Fragment>
        ) : (
            <React.Fragment>
                <button
                    className={styles.pill}
                    data-action="login"
                    onClick={props.onLogin}
                >
                    <img
                        alt=""
                        src={loginIcon}
                    />
                    Giriş
                </button>
                <button
                    className={styles.pill}
                    data-action="register"
                    onClick={props.onRegister}
                >
                    <img
                        alt=""
                        src={registerIcon}
                    />
                    Kaydol
                </button>
            </React.Fragment>
        )}
    </div>
);

AccountButtons.propTypes = {
    authorMode: PropTypes.bool,
    onLogin: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired,
    onRegister: PropTypes.func.isRequired,
    onTeacherPanel: PropTypes.func.isRequired,
    user: PropTypes.shape({role: PropTypes.string, username: PropTypes.string})
};

export default AccountButtons;
