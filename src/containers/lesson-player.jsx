import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import StepCard from '../components/lessons/step-card.jsx';
import {createChecker} from '../lib/lessons/checker';
import {celebrate} from '../lib/celebrate';
import {describeStep} from '../lib/lessons/describe';
import {clearHints, showHints, targetElement} from '../lib/lessons/hints';
import {readLessonState} from '../lib/lessons/vm-state';
import {closeLesson} from '../reducers/lessons';

const SETTLE_MS = 150;
const CLOSE_QUESTION = 'Dersten çıkılsın mı? Projen editörde kalır.';

/** Öğrencinin dersi: adımları sırayla gösterir, ipucunu oynatır ve yaptıkça sonraki adıma geçer. */
class LessonPlayer extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['schedule', 'check', 'handleShow', 'handleSkip', 'handleClose', 'handlePointer']);
        this.timer = null;
        this.state = {index: 0};
    }
    componentDidMount () {
        if (this.props.lesson) this.begin();
    }
    componentDidUpdate (prevProps) {
        if (this.props.lesson && this.props.lesson !== prevProps.lesson) this.begin();
        if (!this.props.lesson && prevProps.lesson) this.end();
        // sekme değişince: adım geçilmiş olabilir, değilse ipucu yeni sekmeye göre yeniden gösterilir
        if (this.props.lesson && this.props.activeTabIndex !== prevProps.activeTabIndex) this.check(true);
    }
    componentWillUnmount () {
        this.end();
    }
    readState () {
        return readLessonState(this.props.vm, this.props.activeTabIndex);
    }
    begin () {
        this.end();
        this.checker = createChecker(this.props.lesson.steps, this.readState());
        this.props.vm.on('PROJECT_CHANGED', this.schedule);
        this.props.vm.on('targetsUpdate', this.schedule);
        this.props.vm.on('EXTENSION_ADDED', this.schedule);
        document.addEventListener('pointerdown', this.handlePointer, true);
        this.setState({index: 0}, () => this.check(true));
    }
    end () {
        clearTimeout(this.timer);
        this.timer = null;
        this.props.vm.removeListener('PROJECT_CHANGED', this.schedule);
        this.props.vm.removeListener('targetsUpdate', this.schedule);
        this.props.vm.removeListener('EXTENSION_ADDED', this.schedule);
        document.removeEventListener('pointerdown', this.handlePointer, true);
        clearHints();
    }
    schedule () {
        clearTimeout(this.timer);
        this.timer = setTimeout(this.check, SETTLE_MS);
    }
    check (force) {
        if (!this.checker) return;
        const index = this.checker.check(this.readState());
        if (index !== this.state.index || force === true) {
            const steps = this.props.lesson.steps.length;
            // ders yeni bitti: konfeti
            if (index >= steps && this.state.index < steps) celebrate();
            this.setState({index: index});
            this.showCurrent(index);
        }
    }
    showCurrent (index) {
        const step = this.props.lesson.steps[index];
        if (step) showHints(step, this.checker.blockFor, this.readState().tab);
        else clearHints();
    }
    // "göster" adımında öğrenci gösterilen öğeye tıklarsa adım geçilir (tıklamanın kendi işi de yapılır)
    handlePointer (event) {
        const step = this.props.lesson && this.props.lesson.steps[this.state.index];
        if (!step || step.type !== 'point' || !step.click) return;
        const element = targetElement(step.target);
        if (!element || !element.contains(event.target)) return;
        const index = this.state.index;
        setTimeout(() => {
            if (this.state.index !== index) return;
            this.checker.skip();
            this.check(true);
        }, 250);
    }
    handleShow () {
        this.showCurrent(this.state.index);
    }
    handleSkip () {
        this.checker.skip();
        this.check(true);
    }
    handleClose () {
        const finished = this.state.index >= this.props.lesson.steps.length;
        // eslint-disable-next-line no-alert
        if (!finished && !window.confirm(CLOSE_QUESTION)) return;
        this.end();
        this.props.onClose();
    }
    render () {
        const lesson = this.props.lesson;
        if (!lesson) return null;
        const step = lesson.steps[this.state.index];
        return (
            <StepCard
                count={lesson.steps.length}
                finished={!step}
                index={this.state.index}
                isNote={Boolean(step && step.type === 'note')}
                manual={Boolean(step && (step.type === 'note' || (step.type === 'point' && !step.click)))}
                text={step ? describeStep(step) : ''}
                title={lesson.title}
                onClose={this.handleClose}
                onShow={this.handleShow}
                onSkip={this.handleSkip}
            />
        );
    }
}

LessonPlayer.propTypes = {
    activeTabIndex: PropTypes.number,
    lesson: PropTypes.shape({title: PropTypes.string, steps: PropTypes.arrayOf(PropTypes.object)}),
    onClose: PropTypes.func.isRequired,
    vm: PropTypes.shape({on: PropTypes.func, removeListener: PropTypes.func}).isRequired
};

const mapStateToProps = state => ({
    activeTabIndex: state.scratchGui.editorTab.activeTabIndex,
    lesson: state.scratchGui.lessons.mode === 'playing' ? state.scratchGui.lessons.lesson : null
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeLesson())
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonPlayer);
