/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

const DEFAULT_CHUNK = 3;

class AuthorImporter extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleChunk', 'handleAutoCheck', 'handleFile']);
        this.state = {chunkSize: DEFAULT_CHUNK, autoCheck: false};
    }
    handleChunk (event) {
        this.setState({chunkSize: Math.min(10, Math.max(1, Math.round(Number(event.target.value) || DEFAULT_CHUNK)))});
    }
    handleAutoCheck (event) {
        this.setState({autoCheck: event.target.checked});
    }
    handleFile (event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (file) this.props.onImport(file, this.state.chunkSize, this.state.autoCheck);
    }
    render () {
        return (
            <div className={styles.checkBox}>
                <strong>Hazır projeyi derse çevir</strong>
                <p className={styles.muted}>
                    {'Bir .sb3 dosyası seç: kuklalar ve sesler başlangıç projesi olur, bloklar adım adım ders ' +
                    'adımlarına bölünür (metin, el rehberi ve blok kontrolü otomatik). Sonra düzenleyebilirsin.'}
                </p>
                <label className={styles.row}>
                    <span>Adım başına blok:</span>
                    <input
                        className={styles.input}
                        data-field="chunk"
                        max="10"
                        min="1"
                        type="number"
                        value={this.state.chunkSize}
                        onChange={this.handleChunk}
                    />
                </label>
                <label className={styles.row}>
                    <input
                        checked={this.state.autoCheck}
                        data-field="auto-check"
                        type="checkbox"
                        onChange={this.handleAutoCheck}
                    />
                    <span>{' Adımları otomatik kontrol et (kapalıysa öğrenci "İleri"ye basar)'}</span>
                </label>
                <input
                    accept=".sb3"
                    data-field="import-file"
                    disabled={this.props.busy}
                    type="file"
                    onChange={this.handleFile}
                />
            </div>
        );
    }
}

AuthorImporter.propTypes = {
    busy: PropTypes.bool,
    onImport: PropTypes.func.isRequired
};

export default AuthorImporter;
