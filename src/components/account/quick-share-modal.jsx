/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import styles from './account.css';

class QuickShareModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleStartRename', 'handleStartDelete', 'handleBack', 'handleNameChange', 'handleSubmit']);
        this.state = {mode: null, name: props.projectName || ''};
    }
    handleStartRename () {
        this.setState({mode: 'rename', name: this.props.projectName || ''});
    }
    handleStartDelete () {
        this.setState({mode: 'delete'});
    }
    handleBack () {
        this.setState({mode: null});
    }
    handleNameChange (event) {
        this.setState({name: event.target.value});
    }
    handleSubmit (event) {
        event.preventDefault();
        if (!this.state.name.trim()) return;
        this.props.onRename(this.state.name.trim());
        this.setState({mode: null});
    }
    renderUnchanged () {
        const {mode, name} = this.state;
        if (mode === 'rename') {
            return (
                <form onSubmit={this.handleSubmit}>
                    <label className={styles.hint}>
                        Projenin yeni adı
                        <input
                            autoFocus
                            className={styles.input}
                            maxLength={80}
                            value={name}
                            onChange={this.handleNameChange}
                        />
                    </label>
                    <div className={styles.roles}>
                        <button
                            className={styles.role}
                            type="submit"
                        >
                            Adı kaydet
                        </button>
                        <button
                            className={styles.role}
                            data-action="back"
                            type="button"
                            onClick={this.handleBack}
                        >
                            Vazgeç
                        </button>
                    </div>
                </form>
            );
        }
        if (mode === 'delete') {
            return (
                <div>
                    <p className={styles.hint}>
                        {`"${this.props.projectName}" hesabından kalıcı olarak silinsin mi?`}
                    </p>
                    <div className={styles.roles}>
                        <button
                            className={styles.role}
                            data-action="delete-confirm"
                            onClick={this.props.onDelete}
                        >
                            Evet, sil
                        </button>
                        <button
                            className={styles.role}
                            data-action="back"
                            onClick={this.handleBack}
                        >
                            Vazgeç
                        </button>
                    </div>
                </div>
            );
        }
        return (
            <div>
                <div className={styles.notice}>
                    {`"${this.props.projectName}" projesinde hiçbir değişiklik yapmadın.`}
                </div>
                <div className={styles.roles}>
                    <button
                        className={styles.role}
                        data-action="share-anyway"
                        onClick={this.props.onShareAnyway}
                    >
                        Yine de paylaş
                    </button>
                    <button
                        className={styles.role}
                        data-action="rename"
                        onClick={this.handleStartRename}
                    >
                        Adını değiştir
                    </button>
                    <button
                        className={styles.role}
                        data-action="delete"
                        onClick={this.handleStartDelete}
                    >
                        Sil
                    </button>
                    <button
                        className={styles.role}
                        data-action="done"
                        onClick={this.props.onClose}
                    >
                        Vazgeç
                    </button>
                </div>
            </div>
        );
    }
    render () {
        const props = this.props;
        return (
            <Modal
                className={styles.modalContent}
                contentLabel="Paylaş"
                headerClassName={styles.header}
                id="quickShareModal"
                onRequestClose={props.onClose}
            >
                <div className={styles.body}>
                    {props.working ? <p className={styles.hint}>
                        {props.unchanged ? 'Bekle...' : 'Projen kaydediliyor ve paylaşılıyor...'}
                    </p> : null}
                    {props.error ? <div className={styles.error}>{props.error}</div> : null}
                    {props.message ? <div className={styles.notice}>{props.message}</div> : null}
                    {props.unchanged && !props.working ? this.renderUnchanged() : null}
                    {props.working || props.unchanged ? null : (
                        <div className={styles.roles}>
                            {props.message ? (
                                <button
                                    className={styles.role}
                                    data-action="go-shared"
                                    onClick={props.onGoShared}
                                >
                                    Paylaşılanlara git
                                </button>
                            ) : null}
                            <button
                                className={styles.role}
                                data-action="done"
                                onClick={props.onClose}
                            >
                                Tamam
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        );
    }
}

QuickShareModal.propTypes = {
    error: PropTypes.string,
    message: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    onGoShared: PropTypes.func.isRequired,
    onRename: PropTypes.func,
    onShareAnyway: PropTypes.func,
    projectName: PropTypes.string,
    unchanged: PropTypes.bool,
    working: PropTypes.bool
};

export default QuickShareModal;
