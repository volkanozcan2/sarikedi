/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

class AuthorLessonForm extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleTitle', 'handleId', 'handleDescription', 'handleLevel', 'handleOrder', 'handlePublished',
            'handleCover', 'handleClearCover', 'handleSelectStep', 'handleRemoveStep', 'handleMoveUp',
            'handleMoveDown'
        ]);
    }
    handleTitle (event) {
        this.props.onChange({title: event.target.value});
    }
    handleId (event) {
        this.props.onChangeId(event.target.value);
    }
    handleDescription (event) {
        this.props.onChange({description: event.target.value});
    }
    handleLevel (event) {
        this.props.onChange({level: event.target.value});
    }
    handleOrder (event) {
        this.props.onChange({order: Math.max(0, Math.round(Number(event.target.value) || 0))});
    }
    handlePublished (event) {
        this.props.onChange({published: event.target.checked});
    }
    handleCover (event) {
        const file = event.target.files && event.target.files[0];
        if (file) this.props.onUploadCover(file);
    }
    handleClearCover () {
        this.props.onChange({cover: null});
    }
    handleSelectStep (event) {
        this.props.onSelectStep(Number(event.currentTarget.getAttribute('data-step')));
    }
    handleRemoveStep () {
        this.props.onRemoveStep(this.props.stepIndex);
    }
    handleMoveUp () {
        this.props.onMoveStep(this.props.stepIndex, -1);
    }
    handleMoveDown () {
        this.props.onMoveStep(this.props.stepIndex, 1);
    }
    render () {
        const {draft, isNew, dirty, busy, errors, message, stepIndex} = this.props;
        return (
            <div>
                <div className={styles.row}>
                    <button
                        className={styles.button}
                        disabled={busy}
                        onClick={this.props.onBack}
                    >
                        Geri
                    </button>
                    <button
                        className={`${styles.button} ${styles.primary}`}
                        disabled={busy}
                        onClick={this.props.onSave}
                    >
                        Kaydet
                    </button>
                    {dirty ? <span className={styles.muted}>Kaydedilmemiş değişiklik</span> : null}
                </div>
                {errors.length > 0 ? (
                    <div className={styles.error}>
                        {errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                ) : null}
                {message ? <div className={styles.message}>{message}</div> : null}

                <div className={styles.section}>
                    <label className={styles.field}>
                        <span>Başlık</span>
                        <input
                            className={styles.input}
                            data-field="title"
                            type="text"
                            value={draft.title}
                            onChange={this.handleTitle}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Kimlik (adres)</span>
                        <input
                            className={styles.input}
                            data-field="id"
                            readOnly={!isNew}
                            type="text"
                            value={draft.id}
                            onChange={this.handleId}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Açıklama</span>
                        <textarea
                            className={styles.textarea}
                            data-field="description"
                            value={draft.description}
                            onChange={this.handleDescription}
                        />
                    </label>
                    <div className={styles.row}>
                        <label>
                            {'Seviye: '}
                            <select
                                className={styles.select}
                                data-field="level"
                                value={draft.level}
                                onChange={this.handleLevel}
                            >
                                <option value="baslangic">Başlangıç</option>
                                <option value="orta">Orta</option>
                                <option value="ileri">İleri</option>
                            </select>
                        </label>
                        <label>
                            {'Sıra: '}
                            <input
                                className={styles.input}
                                data-field="order"
                                min="0"
                                type="number"
                                value={draft.order}
                                onChange={this.handleOrder}
                            />
                        </label>
                        <label>
                            <input
                                checked={draft.published}
                                data-field="published"
                                type="checkbox"
                                onChange={this.handlePublished}
                            />
                            {' Yayında'}
                        </label>
                    </div>
                    <div className={styles.field}>
                        <span>Kapak görseli</span>
                        {draft.cover ? (
                            <div className={styles.row}>
                                <code>{draft.cover}</code>
                                <button
                                    className={styles.button}
                                    onClick={this.handleClearCover}
                                >
                                    Kapağı kaldır
                                </button>
                            </div>
                        ) : null}
                        <input
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            disabled={busy}
                            type="file"
                            onChange={this.handleCover}
                        />
                    </div>
                    <div className={styles.field}>
                        <span>Başlangıç projesi</span>
                        {draft.startProject ?
                            <code>{draft.startProject}</code> : <span className={styles.muted}>Yok</span>}
                        <div className={styles.row}>
                            <button
                                className={styles.button}
                                disabled={busy}
                                onClick={this.props.onUseCurrentProject}
                            >
                                Şu anki projeyi başlangıç projesi yap
                            </button>
                            {draft.startProject ? (
                                <button
                                    className={styles.button}
                                    onClick={this.props.onClearStartProject}
                                >
                                    Başlangıç projesini kaldır
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <h3 className={styles.sectionTitle}>Adımlar</h3>
                <div className={styles.stepTabs}>
                    {draft.steps.map((step, index) => (
                        <button
                            className={`${styles.button} ${styles.stepTab} ${index === stepIndex ? styles.active : ''}`}
                            data-step={index}
                            key={index}
                            onClick={this.handleSelectStep}
                        >
                            {index + 1}
                        </button>
                    ))}
                    <button
                        className={styles.button}
                        onClick={this.props.onAddStep}
                    >
                        Adım ekle
                    </button>
                </div>
                <div className={styles.row}>
                    <button
                        className={styles.button}
                        onClick={this.handleMoveUp}
                    >
                        Yukarı
                    </button>
                    <button
                        className={styles.button}
                        onClick={this.handleMoveDown}
                    >
                        Aşağı
                    </button>
                    <button
                        className={`${styles.button} ${styles.danger}`}
                        onClick={this.handleRemoveStep}
                    >
                        Adımı sil
                    </button>
                </div>
                {this.props.children}
            </div>
        );
    }
}

AuthorLessonForm.propTypes = {
    busy: PropTypes.bool,
    children: PropTypes.node,
    dirty: PropTypes.bool,
    draft: PropTypes.shape({
        title: PropTypes.string,
        id: PropTypes.string,
        description: PropTypes.string,
        level: PropTypes.string,
        order: PropTypes.number,
        published: PropTypes.bool,
        cover: PropTypes.string,
        startProject: PropTypes.string,
        steps: PropTypes.array
    }).isRequired,
    errors: PropTypes.arrayOf(PropTypes.string).isRequired,
    isNew: PropTypes.bool,
    message: PropTypes.string,
    onAddStep: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onChangeId: PropTypes.func.isRequired,
    onClearStartProject: PropTypes.func.isRequired,
    onMoveStep: PropTypes.func.isRequired,
    onRemoveStep: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onSelectStep: PropTypes.func.isRequired,
    onUploadCover: PropTypes.func.isRequired,
    onUseCurrentProject: PropTypes.func.isRequired,
    stepIndex: PropTypes.number.isRequired
};

export default AuthorLessonForm;
