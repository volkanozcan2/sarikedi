import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import RecordBar from '../components/lessons/record-bar.jsx';
import {createRecorder} from '../lib/lessons/recorder';
import {describeStep} from '../lib/lessons/describe';
import {readLessonState, workspaceLabeler} from '../lib/lessons/vm-state';
import {closeLesson, finishRecording} from '../reducers/lessons';

const SETTLE_MS = 150; // sürükleme gibi art arda gelen değişiklikler bitince bir kez okunur
const CANCEL_QUESTION = 'Kayıt silinecek. Emin misin?';

const mainWorkspace = () => {
    const blocks = window.ScratchBlocks || window.Blockly;
    return blocks && blocks.getMainWorkspace ? blocks.getMainWorkspace() : null;
};

/** Öğretmen ders kaydederken editördeki değişiklikleri izleyip adımlara çevirir; kayıt şeridini gösterir. */
class LessonRecorder extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['schedule', 'flush', 'handleAddNote', 'handleTogglePause', 'handleFinish', 'handleCancel']);
        this.timer = null;
        this.state = {paused: false, steps: []};
    }
    componentDidMount () {
        if (this.props.recording) this.begin();
    }
    componentDidUpdate (prevProps) {
        if (this.props.recording && !prevProps.recording) this.begin();
        if (!this.props.recording && prevProps.recording) this.end();
        if (this.props.recording && this.props.activeTabIndex !== prevProps.activeTabIndex) this.schedule();
    }
    componentWillUnmount () {
        this.end();
    }
    readState () {
        return readLessonState(this.props.vm, this.props.activeTabIndex);
    }
    begin () {
        const labeler = (targetId, blockId) => workspaceLabeler(mainWorkspace())(targetId, blockId);
        this.recorder = createRecorder({labelFor: labeler});
        this.recorder.start(this.readState(), this.props.previousSteps);
        this.props.vm.on('PROJECT_CHANGED', this.schedule);
        this.props.vm.on('targetsUpdate', this.schedule);
        this.props.vm.on('EXTENSION_ADDED', this.schedule);
        this.setState({paused: false, steps: this.recorder.getSteps()});
    }
    end () {
        clearTimeout(this.timer);
        this.timer = null;
        this.props.vm.removeListener('PROJECT_CHANGED', this.schedule);
        this.props.vm.removeListener('targetsUpdate', this.schedule);
        this.props.vm.removeListener('EXTENSION_ADDED', this.schedule);
    }
    schedule () {
        if (this.state.paused) return;
        clearTimeout(this.timer);
        this.timer = setTimeout(this.flush, SETTLE_MS);
    }
    flush () {
        clearTimeout(this.timer);
        this.timer = null;
        if (!this.recorder || this.state.paused) return;
        this.recorder.update(this.readState());
        this.setState({steps: this.recorder.getSteps()});
    }
    handleAddNote (text) {
        this.flush();
        this.recorder.addNote(text);
        this.setState({steps: this.recorder.getSteps()});
    }
    handleTogglePause () {
        if (this.state.paused) {
            // duraklatılmışken yapılanlar adım sayılmaz: yeni durumdan devam edilir
            this.recorder.start(this.readState(), this.recorder.getSteps());
            this.setState({paused: false});
        } else {
            this.flush();
            this.setState({paused: true});
        }
    }
    handleFinish () {
        this.flush();
        this.props.onFinish(this.recorder.getSteps());
    }
    handleCancel () {
        // eslint-disable-next-line no-alert
        if (this.state.steps.length && !window.confirm(CANCEL_QUESTION)) return;
        this.props.onCancel();
    }
    render () {
        if (!this.props.recording) return null;
        const steps = this.state.steps;
        const last = steps[steps.length - 1];
        return (
            <RecordBar
                lastStep={last ? describeStep(last) : null}
                paused={this.state.paused}
                stepCount={steps.length}
                onAddNote={this.handleAddNote}
                onCancel={this.handleCancel}
                onFinish={this.handleFinish}
                onTogglePause={this.handleTogglePause}
            />
        );
    }
}

LessonRecorder.propTypes = {
    activeTabIndex: PropTypes.number,
    onCancel: PropTypes.func.isRequired,
    onFinish: PropTypes.func.isRequired,
    previousSteps: PropTypes.arrayOf(PropTypes.object),
    recording: PropTypes.bool,
    vm: PropTypes.shape({on: PropTypes.func, removeListener: PropTypes.func}).isRequired
};

const mapStateToProps = state => ({
    activeTabIndex: state.scratchGui.editorTab.activeTabIndex,
    recording: state.scratchGui.lessons.mode === 'recording',
    previousSteps: state.scratchGui.lessons.draft ? state.scratchGui.lessons.draft.steps : []
});

const mapDispatchToProps = dispatch => ({
    onCancel: () => dispatch(closeLesson()),
    onFinish: steps => dispatch(finishRecording(steps))
});

export default connect(mapStateToProps, mapDispatchToProps)(LessonRecorder);
