/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

/**
 * Kayıt modunda editörün üstünde, altta ortada duran küçük taşınabilir çubuk:
 * panel kapalıyken bile "Adımı kaydet" ve "Kaydı bitir" erişilebilir kalır.
 */
class AuthorRecordBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleDown', 'handleMove', 'handleUp', 'setElement']);
        this.state = {pos: null};
        this.element = null;
        this.drag = null;
    }
    componentWillUnmount () {
        this.stopListening();
    }
    setElement (element) {
        this.element = element;
    }
    stopListening () {
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('mouseup', this.handleUp);
    }
    handleDown (event) {
        if (event.button !== 0 || !this.element) return;
        const rect = this.element.getBoundingClientRect();
        this.drag = {
            dx: event.clientX - rect.left,
            dy: event.clientY - rect.top,
            width: rect.width,
            height: rect.height
        };
        document.addEventListener('mousemove', this.handleMove);
        document.addEventListener('mouseup', this.handleUp);
        if (event.preventDefault) event.preventDefault();
    }
    handleMove (event) {
        if (!this.drag) return;
        const left = event.clientX - this.drag.dx;
        const top = event.clientY - this.drag.dy;
        this.setState({pos: {
            left: Math.max(0, Math.min(left, window.innerWidth - this.drag.width)),
            top: Math.max(0, Math.min(top, window.innerHeight - this.drag.height))
        }});
    }
    handleUp () {
        this.drag = null;
        this.stopListening();
    }
    render () {
        const style = this.state.pos ?
            {left: this.state.pos.left, top: this.state.pos.top, bottom: 'auto', transform: 'none'} :
            null;
        return (
            <div
                className={styles.recordBar}
                ref={this.setElement}
                style={style}
            >
                <div
                    className={styles.recordHandle}
                    data-handle
                    title="Sürükleyerek taşı"
                    onMouseDown={this.handleDown}
                >
                    <span className={styles.recordDot} />
                    {` Kayıt · ${this.props.stepCount} adım`}
                </div>
                <button
                    className={`${styles.button} ${styles.primary}`}
                    data-action="record-step"
                    disabled={this.props.busy}
                    onClick={this.props.onSaveStep}
                >
                    Adımı kaydet
                </button>
                <button
                    className={styles.button}
                    data-action="record-stop"
                    disabled={this.props.busy}
                    onClick={this.props.onStop}
                >
                    Kaydı bitir
                </button>
                <button
                    className={styles.button}
                    onClick={this.props.onOpenPanel}
                >
                    Paneli aç
                </button>
                {this.props.status ? <span className={styles.recordStatus}>{this.props.status}</span> : null}
            </div>
        );
    }
}

AuthorRecordBar.propTypes = {
    busy: PropTypes.bool,
    onOpenPanel: PropTypes.func.isRequired,
    onSaveStep: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    status: PropTypes.string,
    stepCount: PropTypes.number.isRequired
};

export default AuthorRecordBar;
