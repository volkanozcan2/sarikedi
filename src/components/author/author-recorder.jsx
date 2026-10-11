/* eslint-disable react/jsx-no-literals */
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

const AuthorRecorder = props => (
    <div className={styles.checkBox}>
        <strong>Oyunu yaparak kaydet</strong>
        {props.recording ? (
            <div>
                <p className={styles.muted}>
                    {'Kayıt açık. Oyunu Scratch\'te adım adım yap; bir adımı bitirince "Adımı kaydet"e bas. ' +
                    'Son kayıttan beri eklediğin bloklar yeni bir adım olur.'}
                </p>
                <div className={styles.row}>
                    <button
                        className={`${styles.button} ${styles.primary}`}
                        data-action="record-step"
                        disabled={props.busy}
                        onClick={props.onSaveStep}
                    >
                        Adımı kaydet
                    </button>
                    <button
                        className={styles.button}
                        data-action="record-stop"
                        disabled={props.busy}
                        onClick={props.onStop}
                    >
                        Kaydı bitir
                    </button>
                </div>
            </div>
        ) : (
            <div>
                <p className={styles.muted}>
                    {'Kaydı başlatınca şu anki proje dersin başlangıç projesi olur. Sonra oyunu yap ve her ' +
                    'adımda "Adımı kaydet"e bas; blok kontrolü, el rehberi ve metin taslağı otomatik oluşur.'}
                </p>
                <button
                    className={`${styles.button} ${styles.primary}`}
                    data-action="record-start"
                    disabled={props.busy}
                    onClick={props.onStart}
                >
                    Kaydı başlat
                </button>
            </div>
        )}
    </div>
);

AuthorRecorder.propTypes = {
    busy: PropTypes.bool,
    onSaveStep: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    recording: PropTypes.bool
};

export default AuthorRecorder;
