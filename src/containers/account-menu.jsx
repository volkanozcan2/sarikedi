import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AccountButtons from '../components/account/account-buttons.jsx';
import {createAccountApi} from '../lib/accounts/account-api';
import {isAuthorMode} from '../lib/admin/admin-mode';
import {clearAccount} from '../reducers/account';
import {openLoginModal, openRegisterModal, openTeacherPanel} from '../reducers/modals';

/** Menü çubuğunun sağındaki Giriş / Kaydol düğmeleri (giriş yapılmışsa kullanıcı adı ve Çıkış). */
class AccountMenu extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleLogout']);
        this.api = props.api || createAccountApi({fetchFn: (...args) => window.fetch(...args)});
    }
    handleLogout () {
        // sunucu çerezi silemese bile ekranda çıkış yapılmış görünür; sayfa yenilenince gerçek durum okunur
        this.api.logout().then(() => this.props.onLoggedOut(), () => this.props.onLoggedOut());
    }
    render () {
        return (
            <AccountButtons
                authorMode={isAuthorMode(window.location.search)}
                user={this.props.user}
                onLogin={this.props.onLogin}
                onLogout={this.handleLogout}
                onRegister={this.props.onRegister}
                onTeacherPanel={this.props.onTeacherPanel}
            />
        );
    }
}

AccountMenu.propTypes = {
    api: PropTypes.shape({logout: PropTypes.func}),
    onLoggedOut: PropTypes.func.isRequired,
    onLogin: PropTypes.func.isRequired,
    onRegister: PropTypes.func.isRequired,
    onTeacherPanel: PropTypes.func.isRequired,
    user: PropTypes.shape({role: PropTypes.string, username: PropTypes.string})
};

const mapStateToProps = state => ({user: state.scratchGui.account.user});

const mapDispatchToProps = dispatch => ({
    onLoggedOut: () => dispatch(clearAccount()),
    onLogin: () => dispatch(openLoginModal()),
    onRegister: () => dispatch(openRegisterModal()),
    onTeacherPanel: () => dispatch(openTeacherPanel())
});

export {
    AccountMenu as AccountMenuComponent
};

export default connect(mapStateToProps, mapDispatchToProps)(AccountMenu);
