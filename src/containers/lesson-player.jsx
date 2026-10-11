import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import ScratchBlocks from 'scratch-blocks';

import GuideOverlay from '../components/guide-overlay/guide-overlay.jsx';
import LessonPanel from '../components/lesson-panel/lesson-panel.jsx';
import {buildGuideFrames} from '../lib/lessons/guide-frames';
import {resolveTargetRect} from '../lib/lessons/guide-targets';
import {progress} from '../lib/lessons/progress';
import {createStepWatcher} from '../lib/lessons/step-watcher';
import {
    exitLesson, getCurrentStep, nextStep, prevStep, stepPassed, toggleExpanded
} from '../reducers/lessons';

const AUTO_ADVANCE_MS = 900;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class LessonPlayer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'advance', 'getStep', 'handleResult', 'handlePointerDown', 'handleGuideDone',
            'handleShowHint', 'replayGuide', 'handlePrev', 'handleNext', 'handleReplayGuide'
        ]);
        this.state = {hintVisible: false, frames: [], playKey: 0};
        this.token = 0;
        this.advanceTimer = null;
        // Geri ile dönülen adım hâlâ doğru olabilir; öğrenci İleri'ye basana kadar otomatik ilerleme kapalı
        this.noAutoAdvance = false;
        this.watcher = createStepWatcher({
            vm: props.vm,
            getStep: this.getStep,
            onResult: this.handleResult
        });
        this.watching = false;
    }
    componentDidMount () {
        this.sync(null);
    }
    componentDidUpdate (prevProps) {
        this.sync(prevProps);
    }
    componentWillUnmount () {
        this.stopWatching();
        clearTimeout(this.advanceTimer);
        this.token++;
    }
    getStep () {
        return getCurrentStep(this.props);
    }
    isActive () {
        return this.props.status === 'active';
    }
    sync (prevProps) {
        if (this.isActive()) {
            this.startWatching();
            if (prevProps && prevProps.lesson !== this.props.lesson) this.noAutoAdvance = false;
            const changed = !prevProps || prevProps.lesson !== this.props.lesson ||
                prevProps.stepIndex !== this.props.stepIndex || prevProps.status !== this.props.status;
            if (changed) this.onStepChanged();
        } else {
            this.stopWatching();
            clearTimeout(this.advanceTimer);
            if (this.state.frames.length > 0 || this.state.hintVisible) {
                this.token++;
                this.setState({frames: [], hintVisible: false});
            }
        }
    }
    onStepChanged () {
        clearTimeout(this.advanceTimer);
        this.setState({hintVisible: false});
        this.replayGuide();
        this.watcher.check();
    }
    startWatching () {
        if (this.watching) return;
        this.watching = true;
        this.watcher.start();
        document.addEventListener('pointerdown', this.handlePointerDown, true);
    }
    stopWatching () {
        if (!this.watching) return;
        this.watching = false;
        this.watcher.stop();
        document.removeEventListener('pointerdown', this.handlePointerDown, true);
    }
    handlePointerDown () {
        if (this.state.frames.length > 0) {
            this.token++;
            this.setState({frames: []});
        }
    }
    handleGuideDone () {
        // animasyon doğal olarak bitti; çerçeveler tekrar oynatma için saklanır
    }
    handleResult (result) {
        if (!result.passed || this.props.passed) return;
        this.props.onStepPassed();
        if (this.noAutoAdvance) return;
        const stepIndex = this.props.stepIndex;
        clearTimeout(this.advanceTimer);
        this.advanceTimer = setTimeout(() => {
            if (this.isActive() && this.props.stepIndex === stepIndex) this.advance();
        }, AUTO_ADVANCE_MS);
    }
    handleShowHint () {
        this.setState({hintVisible: true});
    }
    handleNext () {
        this.advance();
    }
    handleReplayGuide () {
        this.replayGuide();
    }
    handlePrev () {
        clearTimeout(this.advanceTimer);
        this.noAutoAdvance = true;
        this.props.onPrevStep();
    }
    advance () {
        clearTimeout(this.advanceTimer);
        this.noAutoAdvance = false;
        const {lesson, stepIndex} = this.props;
        const next = stepIndex + 1;
        progress.save(lesson.id, {step: next, done: next >= lesson.steps.length});
        this.props.onNextStep();
    }
    replayGuide () {
        const step = this.getStep();
        const token = ++this.token;
        const actions = step && step.guide ? step.guide : [];
        const env = {
            document: document,
            getWorkspace: () => ScratchBlocks.getMainWorkspace(),
            sleep: sleep
        };
        Promise.all(actions.map(action => {
            if (action.type === 'drag') {
                return Promise.all([resolveTargetRect(action.from, env), resolveTargetRect(action.to, env)])
                    .then(rects => ({type: 'drag', label: action.label, fromRect: rects[0], toRect: rects[1]}));
            }
            return resolveTargetRect(action.target, env)
                .then(rect => ({type: 'click', label: action.label, rect: rect}));
        })).then(items => {
            if (token !== this.token) return;
            this.setState(state => ({frames: buildGuideFrames(items), playKey: state.playKey + 1}));
        });
    }
    render () {
        const {status, lesson, stepIndex, passed, expanded} = this.props;
        if (status !== 'active' && status !== 'completed') return null;
        const step = this.getStep();
        const manual = !step || !step.checks || step.checks.length === 0;
        return (
            <React.Fragment>
                <LessonPanel
                    completed={status === 'completed'}
                    expanded={expanded}
                    hintVisible={this.state.hintVisible}
                    manual={manual}
                    passed={passed}
                    step={step}
                    stepIndex={stepIndex}
                    title={lesson ? lesson.title : ''}
                    totalSteps={lesson ? lesson.steps.length : 0}
                    onExit={this.props.onExit}
                    onNext={this.handleNext}
                    onPrev={this.handlePrev}
                    onReplayGuide={this.handleReplayGuide}
                    onShowHint={this.handleShowHint}
                    onToggleExpanded={this.props.onToggleExpanded}
                />
                <GuideOverlay
                    frames={this.state.frames}
                    playKey={this.state.playKey}
                    onDone={this.handleGuideDone}
                />
            </React.Fragment>
        );
    }
}

LessonPlayer.propTypes = {
    expanded: PropTypes.bool,
    lesson: PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        steps: PropTypes.array
    }),
    onExit: PropTypes.func,
    onNextStep: PropTypes.func,
    onPrevStep: PropTypes.func,
    onStepPassed: PropTypes.func,
    onToggleExpanded: PropTypes.func,
    passed: PropTypes.bool,
    status: PropTypes.string,
    stepIndex: PropTypes.number,
    vm: PropTypes.shape({runtime: PropTypes.object})
};

const mapStateToProps = state => ({
    status: state.scratchGui.lessons.status,
    lesson: state.scratchGui.lessons.lesson,
    stepIndex: state.scratchGui.lessons.stepIndex,
    passed: state.scratchGui.lessons.passed,
    expanded: state.scratchGui.lessons.expanded
});

const mapDispatchToProps = dispatch => ({
    onExit: () => dispatch(exitLesson()),
    onNextStep: () => dispatch(nextStep()),
    onPrevStep: () => dispatch(prevStep()),
    onStepPassed: () => dispatch(stepPassed()),
    onToggleExpanded: () => dispatch(toggleExpanded())
});

export {
    LessonPlayer as LessonPlayerComponent
};

export default connect(mapStateToProps, mapDispatchToProps)(LessonPlayer);
