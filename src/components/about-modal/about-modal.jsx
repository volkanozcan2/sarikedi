/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import CatSwarm from './cat-swarm.jsx';
import logo from './about-logo.png';
import usage from './usage.png';
import styles from './about-modal.css';

class AboutModalComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleShowUsage', 'handleCloseUsage']);
        this.state = {showUsage: false};
    }
    handleShowUsage () {
        this.setState({showUsage: true});
    }
    handleCloseUsage () {
        this.setState({showUsage: false});
    }
    render () {
        return (
            <Modal
                backdrop={<CatSwarm />}
                className={styles.modalContent}
                contentLabel="SARIKEDİ"
                headerClassName={styles.header}
                id="aboutModal"
                onRequestClose={this.props.onRequestClose}
            >
                <div className={styles.body}>
                    <img
                        alt="SARIKEDİ"
                        className={styles.logo}
                        draggable={false}
                        src={logo}
                    />
                    <p>
                        {'Merhaba. Scratch bildiğin gibi açık kaynaklı bir proje. ' +
                        'Ben de Claude kullanıp sağını solunu değiştirip işe yarar bir hale getirdim. ' +
                        'Umarım senin de işine yarar 😎'}
                    </p>
                    <p className={styles.small}>
                        {'Bu proje için 2 günde yaklaşık '}
                        <button
                            className={styles.linkButton}
                            data-action="show-usage"
                            onClick={this.handleShowUsage}
                        >
                            {'256 milyon token'}
                        </button>
                        {' harcandı.'}
                    </p>
                    <p className={styles.small}>
                        {'Kodlar burada: '}
                        <a
                            href="https://github.com/volkanozcan2"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {'github.com/volkanozcan2'}
                        </a>
                    </p>
                </div>
                {this.state.showUsage ? (
                    <div
                        className={styles.usageOverlay}
                        data-action="close-usage"
                        onClick={this.handleCloseUsage}
                    >
                        <img
                            alt="Kullanım ekran görüntüsü"
                            className={styles.usageImage}
                            data-usage
                            draggable={false}
                            src={usage}
                        />
                    </div>
                ) : null}
            </Modal>
        );
    }
}

AboutModalComponent.propTypes = {
    onRequestClose: PropTypes.func.isRequired
};

export default AboutModalComponent;
