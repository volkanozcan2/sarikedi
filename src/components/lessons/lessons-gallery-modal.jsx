/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import styles from './lessons.css';

/** "Dersler" penceresi: görülebilen derslerin listesi; öğretmen için ders kaydetme, düzenleme ve silme. */
class LessonsGalleryModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleStart', 'handleEdit', 'handleRemove']);
    }
    idOf (event) {
        return Number(event.currentTarget.getAttribute('data-id'));
    }
    handleStart (event) {
        this.props.onStart(this.idOf(event));
    }
    handleEdit (event) {
        this.props.onEdit(this.idOf(event));
    }
    handleRemove (event) {
        this.props.onRemove(this.idOf(event));
    }
    renderCard (lesson) {
        return (
            <div
                className={styles.lessonCard}
                key={lesson.id}
            >
                {lesson.builtin ? <span className={styles.badge}>{'Hazır ders'}</span> : null}
                {lesson.className ? <span className={styles.badge}>{`${lesson.className} sınıfı`}</span> : null}
                <span className={styles.lessonTitle}>{lesson.title}</span>
                <span className={styles.lessonMeta}>
                    {`${lesson.stepCount} adım · ${lesson.teacherName || 'Öğretmen'}`}
                </span>
                {lesson.description ? <p className={styles.lessonDescription}>{lesson.description}</p> : null}
                <div className={styles.lessonActions}>
                    <button
                        className={classNames(styles.button, styles.buttonPrimary)}
                        data-id={lesson.id}
                        disabled={this.props.busy || !lesson.hasFile}
                        onClick={this.handleStart}
                    >
                        Başla
                    </button>
                    {lesson.mine ? (
                        <button
                            className={styles.button}
                            data-id={lesson.id}
                            disabled={this.props.busy}
                            onClick={this.handleEdit}
                        >
                            Düzenle
                        </button>
                    ) : null}
                    {lesson.mine ? (
                        <button
                            className={classNames(styles.button, styles.buttonDanger)}
                            data-id={lesson.id}
                            disabled={this.props.busy}
                            onClick={this.handleRemove}
                        >
                            Sil
                        </button>
                    ) : null}
                </div>
            </div>
        );
    }
    render () {
        const {lessons, loading, error, isTeacher} = this.props;
        return (
            <Modal
                className={styles.galleryModal}
                contentLabel="Dersler"
                id="lessonsGalleryModal"
                onRequestClose={this.props.onClose}
            >
                <div className={styles.editorBody}>
                    {error ? <div className={styles.error}>{error}</div> : null}
                    {isTeacher ? (
                        <div className={styles.actions}>
                            <p className={styles.hint}>
                                {'Kayıt başladığı andaki proje dersin başlangıcı olur; sonra editörde ne yaparsan ' +
                                    'adım adım kaydedilir.'}
                            </p>
                            <button
                                className={classNames(styles.button, styles.buttonPrimary)}
                                disabled={this.props.busy}
                                onClick={this.props.onRecord}
                            >
                                ● Yeni ders kaydet
                            </button>
                        </div>
                    ) : null}
                    {!loading && lessons.length === 0 ? (
                        <p className={styles.hint}>{'Henüz ders yok.'}</p>
                    ) : null}
                    {loading ? <p className={styles.hint}>{'Dersler yükleniyor…'}</p> : null}
                    <div className={styles.lessonGrid}>
                        {lessons.map(lesson => this.renderCard(lesson))}
                    </div>
                </div>
            </Modal>
        );
    }
}

LessonsGalleryModal.propTypes = {
    busy: PropTypes.bool,
    error: PropTypes.string,
    isTeacher: PropTypes.bool,
    lessons: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        title: PropTypes.string,
        description: PropTypes.string,
        stepCount: PropTypes.number,
        teacherName: PropTypes.string,
        className: PropTypes.string,
        hasFile: PropTypes.bool,
        builtin: PropTypes.bool,
        mine: PropTypes.bool
    })).isRequired,
    loading: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onRecord: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired
};

export default LessonsGalleryModal;
