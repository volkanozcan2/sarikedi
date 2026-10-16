/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import {describeStep} from '../../lib/lessons/describe';
import styles from './lessons.css';

// Değeri olan adımlarda "serbest değer" seçilebilir: öğrenci farklı bir değer yazsa da adım geçilir
const hasValue = step => (step.type === 'addBlock' && (step.changed || []).length > 0) || step.type === 'setValue';

/** Kayıttan sonra (ya da var olan dersi düzenlerken) ders bilgileri ve adım listesi. */
class LessonEditorModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleTitle', 'handleDescription', 'handleClass', 'handleStepText', 'handleFree', 'handleRemove',
            'handleUp', 'handleDown'
        ]);
    }
    indexOf (event) {
        return Number(event.currentTarget.getAttribute('data-index'));
    }
    handleTitle (event) {
        this.props.onChange({title: event.target.value});
    }
    handleDescription (event) {
        this.props.onChange({description: event.target.value});
    }
    handleClass (event) {
        this.props.onChange({classId: event.target.value ? Number(event.target.value) : null});
    }
    handleStepText (event) {
        this.props.onStepChange(this.indexOf(event), {text: event.target.value});
    }
    handleFree (event) {
        this.props.onStepChange(this.indexOf(event), {free: event.target.checked});
    }
    handleRemove (event) {
        this.props.onStepRemove(this.indexOf(event));
    }
    handleUp (event) {
        this.props.onStepMove(this.indexOf(event), -1);
    }
    handleDown (event) {
        this.props.onStepMove(this.indexOf(event), 1);
    }
    renderStep (step, index, count) {
        const text = step.type === 'note' ? step.text : (step.text || describeStep(step));
        return (
            <li
                className={classNames(styles.step, {[styles.stepNote]: step.type === 'note'})}
                key={index}
            >
                <span className={styles.stepNumber}>{index + 1}</span>
                <div className={styles.stepMain}>
                    <textarea
                        className={styles.textarea}
                        data-index={index}
                        rows={2}
                        value={text}
                        onChange={this.handleStepText}
                    />
                    {hasValue(step) ? (
                        <label className={styles.stepFree}>
                            <input
                                checked={Boolean(step.free)}
                                data-index={index}
                                type="checkbox"
                                onChange={this.handleFree}
                            />
                            Serbest değer (öğrenci başka bir değer yazsa da kabul et)
                        </label>
                    ) : null}
                </div>
                <div className={styles.stepTools}>
                    <button
                        className={styles.iconButton}
                        data-index={index}
                        disabled={index === 0}
                        title="Yukarı taşı"
                        onClick={this.handleUp}
                    >
                        ↑
                    </button>
                    <button
                        className={styles.iconButton}
                        data-index={index}
                        disabled={index === count - 1}
                        title="Aşağı taşı"
                        onClick={this.handleDown}
                    >
                        ↓
                    </button>
                    <button
                        className={styles.iconButton}
                        data-index={index}
                        title="Adımı sil"
                        onClick={this.handleRemove}
                    >
                        ✕
                    </button>
                </div>
            </li>
        );
    }
    render () {
        const {draft, classes, busy, error, notice, isNew} = this.props;
        return (
            <Modal
                className={styles.editorModal}
                contentLabel={isNew ? 'Yeni ders' : 'Dersi düzenle'}
                id="lessonEditorModal"
                onRequestClose={this.props.onClose}
            >
                <div className={styles.editorBody}>
                    {error ? <div className={styles.error}>{error}</div> : null}
                    {notice ? <div className={styles.notice}>{notice}</div> : null}
                    <div className={styles.row}>
                        <label className={styles.field}>
                            Ders adı
                            <input
                                className={styles.input}
                                maxLength={80}
                                value={draft.title}
                                onChange={this.handleTitle}
                            />
                        </label>
                        <label className={styles.field}>
                            Kimler görsün?
                            <select
                                className={styles.select}
                                value={draft.classId || ''}
                                onChange={this.handleClass}
                            >
                                <option value="">Herkes</option>
                                {classes.map(klass => (
                                    <option
                                        key={klass.id}
                                        value={klass.id}
                                    >
                                        {`Yalnızca ${klass.name} sınıfım`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className={styles.field}>
                        Açıklama
                        <textarea
                            className={styles.textarea}
                            maxLength={500}
                            rows={2}
                            value={draft.description}
                            onChange={this.handleDescription}
                        />
                    </label>
                    <p className={styles.hint}>
                        {`${draft.steps.length} adım. Metinleri değiştirebilir, sırayı düzenleyebilir ya da ` +
                            'gereksiz adımları silebilirsin.'}
                    </p>
                    <ol className={styles.steps}>
                        {draft.steps.map((step, index) => this.renderStep(step, index, draft.steps.length))}
                    </ol>
                    <div className={styles.actions}>
                        {isNew ? (
                            <button
                                className={styles.button}
                                disabled={busy}
                                onClick={this.props.onResume}
                            >
                                Kayda devam et
                            </button>
                        ) : null}
                        <button
                            className={classNames(styles.button, styles.buttonDanger)}
                            disabled={busy}
                            onClick={this.props.onDiscard}
                        >
                            Vazgeç
                        </button>
                        <button
                            className={classNames(styles.button, styles.buttonPrimary)}
                            disabled={busy || !draft.title.trim() || draft.steps.length === 0}
                            onClick={this.props.onSave}
                        >
                            {busy ? 'Kaydediliyor…' : 'Dersi kaydet'}
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }
}

LessonEditorModal.propTypes = {
    busy: PropTypes.bool,
    classes: PropTypes.arrayOf(PropTypes.shape({id: PropTypes.number, name: PropTypes.string})).isRequired,
    draft: PropTypes.shape({
        title: PropTypes.string,
        description: PropTypes.string,
        classId: PropTypes.number,
        steps: PropTypes.arrayOf(PropTypes.object)
    }).isRequired,
    error: PropTypes.string,
    isNew: PropTypes.bool,
    notice: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onDiscard: PropTypes.func.isRequired,
    onResume: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onStepChange: PropTypes.func.isRequired,
    onStepMove: PropTypes.func.isRequired,
    onStepRemove: PropTypes.func.isRequired
};

export default LessonEditorModal;
