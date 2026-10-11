import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import handImage from '../../lib/lessons/assets/guide-hand.png';
import styles from './guide-overlay.css';

const HAND_SIZE = 64;
const TIP_X = 0.16;
const TIP_Y = 0.09;
const ENTER_OFFSET = 140;
const START_DELAY_MS = 50;
const RING_SIZE = 48;

const prefersReducedMotion = () => {
    try {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
        return false;
    }
};

class GuideOverlay extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['play', 'advance']);
        this.timer = null;
        this.state = {index: -1, finished: true, staticMode: false};
    }
    componentDidMount () {
        this.play();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.playKey !== this.props.playKey || prevProps.frames !== this.props.frames) this.play();
    }
    componentWillUnmount () {
        clearTimeout(this.timer);
    }
    play () {
        clearTimeout(this.timer);
        if (this.props.frames.length === 0) {
            this.setState({index: -1, finished: true, staticMode: false});
            this.props.onDone();
            return;
        }
        if (prefersReducedMotion()) {
            // hareket yok: hedefler sabit halkalarla vurgulanır
            this.setState({index: -1, finished: false, staticMode: true});
            return;
        }
        this.setState({index: -1, finished: false, staticMode: false});
        this.timer = setTimeout(() => this.advance(0), START_DELAY_MS);
    }
    advance (index) {
        const frames = this.props.frames;
        if (index >= frames.length) {
            this.setState({finished: true});
            this.props.onDone();
            return;
        }
        this.setState({index: index});
        this.timer = setTimeout(() => this.advance(index + 1), frames[index].ms);
    }
    render () {
        const {frames} = this.props;
        if (this.state.finished || frames.length === 0) return null;
        if (this.state.staticMode) {
            return (
                <div
                    className={styles.overlay}
                    style={{pointerEvents: 'none'}}
                >
                    {frames.filter(f => f.kind === 'move').map((f, i) => (
                        <div
                            className={classNames(styles.ring, 'guide-ring')}
                            key={i}
                            style={{left: f.x - (RING_SIZE / 2), top: f.y - (RING_SIZE / 2)}}
                        >
                            {f.label ? <span className={styles.label}>{f.label}</span> : null}
                        </div>
                    ))}
                </div>
            );
        }
        const entering = this.state.index < 0;
        const frame = entering ? frames[0] : frames[this.state.index];
        const x = (entering ? frame.x - ENTER_OFFSET : frame.x) - (HAND_SIZE * TIP_X);
        const y = (entering ? frame.y - ENTER_OFFSET : frame.y) - (HAND_SIZE * TIP_Y);
        const pressed = !entering && (frame.kind === 'press' || frame.holding);
        return (
            <div
                className={styles.overlay}
                style={{pointerEvents: 'none'}}
            >
                <div
                    className={styles.hand}
                    style={{
                        transform: `translate(${x}px, ${y}px)`,
                        transition: entering ? 'none' : `transform ${frame.ms}ms ease-in-out`
                    }}
                >
                    <img
                        className={classNames(styles.image, {[styles.pressed]: pressed})}
                        draggable={false}
                        height={HAND_SIZE}
                        src={handImage}
                        width={HAND_SIZE}
                    />
                    {!entering && frame.label ? (
                        <span className={styles.label}>{frame.label}</span>
                    ) : null}
                </div>
            </div>
        );
    }
}

GuideOverlay.propTypes = {
    frames: PropTypes.arrayOf(PropTypes.shape({
        kind: PropTypes.string,
        x: PropTypes.number,
        y: PropTypes.number,
        ms: PropTypes.number,
        holding: PropTypes.bool,
        label: PropTypes.string
    })).isRequired,
    onDone: PropTypes.func,
    playKey: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

GuideOverlay.defaultProps = {
    onDone: () => {},
    playKey: 0
};

export default GuideOverlay;
