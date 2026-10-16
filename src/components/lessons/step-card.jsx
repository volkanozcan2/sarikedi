/* eslint-disable react/jsx-no-literals */
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './lessons.css';

// Öğrencinin gördüğü adım kartı: ders adı, ilerleme, adım yönergesi ve düğmeler.
const StepCard = props => {
    const {title, index, count, text, isNote, manual, finished} = props;
    const percent = count ? Math.round((Math.min(index, count) / count) * 100) : 0;
    return (
        <div
            className={styles.stepCard}
            role="dialog"
        >
            <div className={styles.stepCardHead}>
                <span className={styles.stepCardTitle}>{title}</span>
                <span className={styles.stepCardCount}>
                    {finished ? `${count} / ${count}` : `${index + 1} / ${count}`}
                </span>
            </div>
            <div className={styles.progress}>
                <div
                    className={styles.progressFill}
                    style={{width: `${percent}%`}}
                />
            </div>
            {finished ? (
                <p className={styles.stepCardDone}>{'🎉 Tebrikler, dersi bitirdin!'}</p>
            ) : (
                <p className={classNames(styles.stepCardText, {[styles.isNote]: isNote})}>{text}</p>
            )}
            <div className={styles.actions}>
                {finished ? null : (
                    <button
                        className={styles.button}
                        onClick={props.onShow}
                    >
                        Tekrar göster
                    </button>
                )}
                {finished ? null : (
                    <button
                        className={classNames(styles.button, {[styles.buttonPrimary]: manual})}
                        onClick={props.onSkip}
                    >
                        {manual ? 'Devam' : 'Atla'}
                    </button>
                )}
                <button
                    className={classNames(styles.button, {[styles.buttonPrimary]: finished})}
                    onClick={props.onClose}
                >
                    {finished ? 'Kapat' : 'Dersten çık'}
                </button>
            </div>
        </div>
    );
};

StepCard.propTypes = {
    count: PropTypes.number.isRequired,
    finished: PropTypes.bool,
    index: PropTypes.number.isRequired,
    isNote: PropTypes.bool,
    manual: PropTypes.bool, // adım "Devam" ile geçilir (not, tıklama beklemeyen gösterme)
    onClose: PropTypes.func.isRequired,
    onShow: PropTypes.func.isRequired,
    onSkip: PropTypes.func.isRequired,
    text: PropTypes.string,
    title: PropTypes.string
};

export default StepCard;
