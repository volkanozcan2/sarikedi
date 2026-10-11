import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import AboutModalComponent from '../components/about-modal/about-modal.jsx';
import {closeAboutModal} from '../reducers/modals';

const AboutModal = props => (props.visible ? (
    <AboutModalComponent
        onRequestClose={props.onRequestClose}
    />
) : null);

AboutModal.propTypes = {
    onRequestClose: PropTypes.func.isRequired,
    visible: PropTypes.bool
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.aboutModal
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeAboutModal())
});

export {AboutModal as AboutModalContainer};

export default connect(mapStateToProps, mapDispatchToProps)(AboutModal);
