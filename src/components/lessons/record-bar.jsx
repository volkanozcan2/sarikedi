/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './lessons.css';

/** Ders kaydı sırasında editörün üstünde duran şerit: durum, son adım, not ekleme, duraklat, bitir, iptal. */
class RecordBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleNoteChange', 'handleNoteKey', 'handleAddNote']);
        this.state = {note: ''};
    }
    handleNoteChange (event) {
        this.setState({note: event.target.value});
    }
    handleNoteKey (event) {
        if (event.key === 'Enter') this.handleAddNote();
    }
    handleAddNote () {
        if (!this.state.note.trim()) return;
        this.props.onAddNote(this.state.note);
        this.setState({note: ''});
    }
    render () {
        const {paused, stepCount, lastStep} = this.props;
        return (
            <div
                className={styles.recordBar}
                role="toolbar"
            >
                <span className={classNames(styles.recordDot, {[styles.paused]: paused})} />
                <div className={styles.recordStatus}>
                    <span className={styles.recordTitle}>
                        {paused ? 'Kayıt duraklatıldı' : 'Ders kaydediliyor'}{` · ${stepCount} adım`}
                    </span>
                    <span className={styles.recordLast}>
                        {lastStep || 'Editörde yaptıkların adım adım kaydedilir.'}
                    </span>
                </div>
                <input
                    className={styles.noteInput}
                    placeholder="Not yaz, Enter'a bas"
                    value={this.state.note}
                    onChange={this.handleNoteChange}
                    onKeyDown={this.handleNoteKey}
                />
                <button
                    className={styles.button}
                    disabled={!this.state.note.trim()}
                    onClick={this.handleAddNote}
                >
                    Not ekle
                </button>
                <button
                    className={styles.button}
                    onClick={this.props.onTogglePause}
                >
                    {paused ? 'Devam' : 'Duraklat'}
                </button>
                <button
                    className={classNames(styles.button, styles.buttonPrimary)}
                    onClick={this.props.onFinish}
                >
                    Bitir
                </button>
                <button
                    className={classNames(styles.button, styles.buttonDanger)}
                    onClick={this.props.onCancel}
                >
                    İptal
                </button>
            </div>
        );
    }
}

RecordBar.propTypes = {
    lastStep: PropTypes.string,
    onAddNote: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onFinish: PropTypes.func.isRequired,
    onTogglePause: PropTypes.func.isRequired,
    paused: PropTypes.bool,
    stepCount: PropTypes.number.isRequired
};

export default RecordBar;
