/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import styles from './account.css';

class SaveProjectModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleTitle', 'handleMode', 'handleSubmit']);
        this.state = {title: props.initialTitle || '', mode: props.cloudProject ? 'overwrite' : 'new'};
    }
    handleTitle (event) {
        this.setState({title: event.target.value});
    }
    handleMode (event) {
        this.setState({mode: event.target.value});
    }
    handleSubmit (event) {
        event.preventDefault();
        this.props.onSave(this.state.title, this.state.mode === 'overwrite');
    }
    render () {
        const cloud = this.props.cloudProject;
        return (
            <Modal
                className={styles.modalContent}
                contentLabel="Hesabıma kaydet"
                headerClassName={styles.header}
                id="saveProjectModal"
                onRequestClose={this.props.onClose}
            >
                {this.props.message ? (
                    <div className={styles.body}>
                        <div className={styles.notice}>{this.props.message}</div>
                        <p className={styles.switch}>
                            <button
                                className={styles.primary}
                                data-action="done"
                                onClick={this.props.onClose}
                            >
                                Tamam
                            </button>
                        </p>
                    </div>
                ) : (
                    <form
                        className={styles.body}
                        onSubmit={this.handleSubmit}
                    >
                        {this.props.error ? <div className={styles.error}>{this.props.error}</div> : null}
                        <label className={styles.field}>
                            <span>Proje adı</span>
                            <input
                                className={styles.input}
                                data-field="title"
                                maxLength="60"
                                type="text"
                                value={this.state.title}
                                onChange={this.handleTitle}
                            />
                        </label>
                        {cloud ? (
                            <div className={styles.field}>
                                <label>
                                    <input
                                        checked={this.state.mode === 'overwrite'}
                                        data-field="mode"
                                        name="mode"
                                        type="radio"
                                        value="overwrite"
                                        onChange={this.handleMode}
                                    />
                                    {` Açık projenin üzerine yaz: "${cloud.title}"`}
                                </label>
                                <br />
                                <label>
                                    <input
                                        checked={this.state.mode === 'new'}
                                        data-field="mode"
                                        name="mode"
                                        type="radio"
                                        value="new"
                                        onChange={this.handleMode}
                                    />
                                    {' Yeni proje olarak kaydet'}
                                </label>
                            </div>
                        ) : null}
                        <button
                            className={styles.primary}
                            disabled={this.props.busy}
                            type="submit"
                        >
                            Kaydet
                        </button>
                    </form>
                )}
            </Modal>
        );
    }
}

SaveProjectModal.propTypes = {
    busy: PropTypes.bool,
    cloudProject: PropTypes.shape({id: PropTypes.number, title: PropTypes.string}),
    error: PropTypes.string,
    initialTitle: PropTypes.string,
    message: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired
};

export default SaveProjectModal;
