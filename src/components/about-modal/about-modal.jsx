/* eslint-disable react/jsx-no-literals */
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import CatSwarm from './cat-swarm.jsx';
import logo from '../menu-bar/sarikedi-logo.png';
import styles from './about-modal.css';

const AboutModalComponent = props => (
    <Modal
        backdrop={<CatSwarm />}
        className={styles.modalContent}
        contentLabel="SARIKEDİ"
        headerClassName={styles.header}
        id="aboutModal"
        onRequestClose={props.onRequestClose}
    >
        <div className={styles.body}>
            <img
                alt="SARIKEDİ"
                className={styles.logo}
                draggable={false}
                src={logo}
            />
            <p className={styles.codeLine}>
                {'Kodlar burada: '}
                <a
                    href="https://github.com/volkanozcan2/sarikedi"
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    {'github.com/volkanozcan2/sarikedi'}
                </a>
            </p>
        </div>
    </Modal>
);

AboutModalComponent.propTypes = {
    onRequestClose: PropTypes.func.isRequired
};

export default AboutModalComponent;
