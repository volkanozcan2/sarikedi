/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import styles from './account.css';

const MAX_PROJECTS = 20;
const MB = 1024 * 1024;

const sizeText = bytes => (
    bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
);
const scopeText = scope => (scope === 'site' ? 'tüm site' : 'sınıf');
const dateText = iso => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('tr-TR');
};

class MyProjectsModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleOpen', 'handleRemove', 'handleShareClass', 'handleShareSite', 'handleUnshare']);
    }
    handleOpen (event) {
        const button = event.currentTarget;
        this.props.onOpen(Number(button.getAttribute('data-id')), button.getAttribute('data-title'));
    }
    handleShareClass (event) {
        this.props.onShare(Number(event.currentTarget.getAttribute('data-id')), true, 'class');
    }
    handleShareSite (event) {
        this.props.onShare(Number(event.currentTarget.getAttribute('data-id')), true, 'site');
    }
    handleUnshare (event) {
        this.props.onShare(Number(event.currentTarget.getAttribute('data-id')), false, 'class');
    }
    handleRemove (event) {
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu proje silinecek. Emin misin?')) {
            this.props.onRemove(Number(event.currentTarget.getAttribute('data-id')));
        }
    }
    renderShare (project) {
        if (project.shared) {
            return (
                <button
                    className={styles.small}
                    data-action="unshare"
                    data-id={project.id}
                    disabled={this.props.busy}
                    onClick={this.handleUnshare}
                >
                    Paylaşımı kaldır
                </button>
            );
        }
        return (
            <React.Fragment>
                <button
                    className={styles.small}
                    data-action="share-class"
                    data-id={project.id}
                    disabled={this.props.busy}
                    onClick={this.handleShareClass}
                >
                    Sınıfla paylaş
                </button>
                {this.props.userRole === 'teacher' ? (
                    <button
                        className={styles.small}
                        data-action="share-site"
                        data-id={project.id}
                        disabled={this.props.busy}
                        onClick={this.handleShareSite}
                    >
                        Tüm siteyle paylaş
                    </button>
                ) : null}
            </React.Fragment>
        );
    }
    render () {
        return (
            <Modal
                className={styles.wideModal}
                contentLabel="Projelerim"
                headerClassName={styles.header}
                id="myProjectsModal"
                onRequestClose={this.props.onClose}
            >
                <div className={styles.body}>
                    <p className={styles.hint}>{`${this.props.projects.length} / ${MAX_PROJECTS} proje`}</p>
                    {this.props.error ? <div className={styles.error}>{this.props.error}</div> : null}
                    {this.props.projects.length === 0 ? (
                        <p className={styles.hint}>
                            {'Henüz kaydedilmiş projen yok. Dosya menüsünden "Hesabıma kaydet"i kullan.'}
                        </p>
                    ) : (
                        <ul className={styles.classes}>
                            {this.props.projects.map(project => (
                                <li
                                    className={styles.klass}
                                    key={project.id}
                                >
                                    <div className={styles.klassHead}>
                                        <span>
                                            <strong>{project.title}</strong>
                                            <span className={styles.realName}>
                                                {`${sizeText(project.size)} · ${dateText(project.updatedAt)}`}
                                                {project.shared ? ` · paylaşıldı (${scopeText(project.scope)})` : ''}
                                            </span>
                                        </span>
                                        <span className={styles.inline}>
                                            {this.props.onShare ? this.renderShare(project) : null}
                                            <button
                                                className={styles.small}
                                                data-action="open"
                                                data-id={project.id}
                                                data-title={project.title}
                                                disabled={this.props.busy}
                                                onClick={this.handleOpen}
                                            >
                                                Aç
                                            </button>
                                            <button
                                                className={styles.smallDanger}
                                                data-action="remove"
                                                data-id={project.id}
                                                disabled={this.props.busy}
                                                onClick={this.handleRemove}
                                            >
                                                Sil
                                            </button>
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Modal>
        );
    }
}

MyProjectsModal.propTypes = {
    busy: PropTypes.bool,
    error: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onOpen: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onShare: PropTypes.func,
    projects: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        title: PropTypes.string,
        size: PropTypes.number,
        shared: PropTypes.bool,
        scope: PropTypes.string
    })).isRequired,
    userRole: PropTypes.string
};

export default MyProjectsModal;
