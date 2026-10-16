/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import {DEFAULT_COVER} from '../../lib/default-cover';
import styles from './account.css';

const ownerText = owner => (owner.role === 'teacher' ? `Öğretmen: ${owner.username}` : owner.username);

class SharedGalleryModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleSelect']);
    }
    handleSelect (event) {
        this.props.onSelect(Number(event.currentTarget.getAttribute('data-id')));
    }
    renderBody () {
        if (!this.props.user) {
            return (
                <div className={styles.body}>
                    <p className={styles.hint}>
                        {'Arkadaşlarının paylaştığı projeleri görmek için giriş yap.'}
                    </p>
                    <div className={styles.roles}>
                        <button
                            className={styles.role}
                            data-action="login"
                            onClick={this.props.onLogin}
                        >
                            Giriş yap
                        </button>
                        <button
                            className={styles.role}
                            data-action="register"
                            onClick={this.props.onRegister}
                        >
                            Kaydol
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div className={styles.body}>
                {this.props.error ? <div className={styles.error}>{this.props.error}</div> : null}
                {!this.props.loading && this.props.projects.length === 0 ? (
                    <p className={styles.hint}>
                        {'Henüz paylaşılan proje yok. Projelerim ekranından kendi projeni paylaşabilirsin.'}
                    </p>
                ) : null}
                <div className={styles.grid}>
                    {this.props.projects.map(project => (
                        <button
                            className={styles.card}
                            data-id={project.id}
                            key={project.id}
                            onClick={this.handleSelect}
                        >
                            <img
                                alt=""
                                className={styles.cardImage}
                                src={project.hasThumbnail ? `/api/shared/${project.id}/thumbnail` : DEFAULT_COVER}
                            />
                            <strong className={styles.cardTitle}>{project.title}</strong>
                            <span className={styles.cardOwner}>{ownerText(project.owner)}</span>
                            <span className={styles.cardStats}>
                                <span>{`♥ ${project.likes}`}</span>
                                <span>{`💬 ${project.comments}`}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    render () {
        return (
            <Modal
                className={styles.galleryModal}
                contentLabel="Paylaşılanlar"
                headerClassName={styles.header}
                id="sharedGalleryModal"
                onRequestClose={this.props.onClose}
            >
                {this.renderBody()}
            </Modal>
        );
    }
}

SharedGalleryModal.propTypes = {
    error: PropTypes.string,
    loading: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onLogin: PropTypes.func.isRequired,
    onRegister: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    projects: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        title: PropTypes.string,
        likes: PropTypes.number,
        comments: PropTypes.number,
        hasThumbnail: PropTypes.bool,
        owner: PropTypes.shape({username: PropTypes.string, role: PropTypes.string})
    })).isRequired,
    user: PropTypes.shape({role: PropTypes.string})
};

export default SharedGalleryModal;
