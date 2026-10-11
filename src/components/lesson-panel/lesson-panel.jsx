import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import Draggable from 'react-draggable';
import {FormattedMessage} from 'react-intl';

import styles from './lesson-panel.css';

const Body = props => {
    const {step, stepIndex, totalSteps, passed, manual, hintVisible, onPrev, onNext, onShowHint, onReplayGuide} = props;
    const isLast = stepIndex + 1 >= totalSteps;
    const hasGuide = Boolean(step && step.guide && step.guide.length > 0);
    const canShowHint = Boolean(step && step.hint && !hintVisible);
    const percent = Math.round(((stepIndex + (passed ? 1 : 0)) / totalSteps) * 100);
    return (
        <div className={styles.body}>
            <div className={styles.progressLabel}>
                <FormattedMessage
                    defaultMessage="Adım {current} / {total}"
                    id="gui.lessons.stepCounter"
                    values={{current: stepIndex + 1, total: totalSteps}}
                />
            </div>
            <div className={styles.progressTrack}>
                <div
                    className={styles.progressBar}
                    style={{width: `${percent}%`}}
                />
            </div>
            {step && step.media ? (
                <img
                    className={classNames(styles.media, 'lesson-panel-media')}
                    draggable={false}
                    src={step.media}
                />
            ) : null}
            <p className={styles.text}>{step ? step.text : ''}</p>
            {hintVisible && step && step.hint ? (
                <p className={styles.hint}>{step.hint}</p>
            ) : null}
            {passed ? (
                <p className={styles.success}>
                    <FormattedMessage
                        defaultMessage="Harika! Doğru yaptın."
                        id="gui.lessons.success"
                    />
                </p>
            ) : null}
            <div className={styles.actions}>
                <button
                    className={styles.button}
                    disabled={stepIndex === 0}
                    onClick={onPrev}
                >
                    <FormattedMessage
                        defaultMessage="Geri"
                        id="gui.lessons.back"
                    />
                </button>
                {hasGuide ? (
                    <button
                        className={styles.button}
                        onClick={onReplayGuide}
                    >
                        <FormattedMessage
                            defaultMessage="Tekrar göster"
                            id="gui.lessons.replay"
                        />
                    </button>
                ) : null}
                {canShowHint ? (
                    <button
                        className={styles.button}
                        onClick={onShowHint}
                    >
                        <FormattedMessage
                            defaultMessage="İpucu"
                            id="gui.lessons.hint"
                        />
                    </button>
                ) : null}
                <button
                    className={classNames(styles.button, styles.primary)}
                    disabled={!(manual || passed)}
                    onClick={onNext}
                >
                    {isLast ? (
                        <FormattedMessage
                            defaultMessage="Bitir"
                            id="gui.lessons.finish"
                        />
                    ) : (
                        <FormattedMessage
                            defaultMessage="İleri"
                            id="gui.lessons.next"
                        />
                    )}
                </button>
            </div>
        </div>
    );
};

Body.propTypes = {
    hintVisible: PropTypes.bool,
    manual: PropTypes.bool,
    onNext: PropTypes.func,
    onPrev: PropTypes.func,
    onReplayGuide: PropTypes.func,
    onShowHint: PropTypes.func,
    passed: PropTypes.bool,
    step: PropTypes.shape({
        text: PropTypes.string,
        media: PropTypes.string,
        hint: PropTypes.string,
        guide: PropTypes.array
    }),
    stepIndex: PropTypes.number,
    totalSteps: PropTypes.number
};

const Completed = props => (
    <div className={styles.body}>
        <p className={styles.success}>
            <FormattedMessage
                defaultMessage="Tebrikler! Dersi tamamladın."
                id="gui.lessons.completed"
            />
        </p>
        <div className={styles.actions}>
            <button
                className={classNames(styles.button, styles.primary)}
                onClick={props.onExit}
            >
                <FormattedMessage
                    defaultMessage="Derslere dön"
                    id="gui.lessons.backToLessons"
                />
            </button>
        </div>
    </div>
);

Completed.propTypes = {
    onExit: PropTypes.func
};

const LessonPanel = props => (
    <Draggable
        bounds="parent"
        handle=".lesson-panel-header"
    >
        <div className={styles.panel}>
            <div className={classNames(styles.header, 'lesson-panel-header')}>
                <span className={styles.title}>{props.title}</span>
                <button
                    aria-label="Küçült veya büyüt"
                    className={styles.iconButton}
                    onClick={props.onToggleExpanded}
                >
                    {props.expanded ? '−' : '+'}
                </button>
                <button
                    aria-label="Dersi kapat"
                    className={styles.iconButton}
                    onClick={props.onExit}
                >
                    {'✕'}
                </button>
            </div>
            {props.expanded ? (
                props.completed ? (
                    <Completed onExit={props.onExit} />
                ) : (
                    <Body {...props} />
                )
            ) : null}
        </div>
    </Draggable>
);

LessonPanel.propTypes = {
    completed: PropTypes.bool,
    expanded: PropTypes.bool,
    onExit: PropTypes.func,
    onToggleExpanded: PropTypes.func,
    title: PropTypes.string
};

export default LessonPanel;
