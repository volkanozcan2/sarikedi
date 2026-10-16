import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import LessonEditorModal from '../components/lessons/lesson-editor-modal.jsx';
import {createAccountApi} from '../lib/accounts/account-api';
import {createLessonApi} from '../lib/lessons/lesson-api';
import {closeLesson, resumeRecording} from '../reducers/lessons';
import {openLessonsGallery} from '../reducers/modals';

const DISCARD_QUESTION = 'Değişiklikler kaydedilmeyecek. Emin misin?';
const fetchFn = (...args) => window.fetch(...args);

/** Kaydı biten (ya da düzenlenmek üzere açılan) dersin bilgilerini ve adımlarını düzenleyip sunucuya kaydeder. */
class LessonEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChange', 'handleStepChange', 'handleStepMove', 'handleStepRemove', 'handleSave', 'handleDiscard',
            'handleResume'
        ]);
        this.api = props.api || createLessonApi({fetchFn});
        this.accountApi = props.accountApi || createAccountApi({fetchFn});
        this.state = {draft: null, classes: [], busy: false, error: null, notice: null};
    }
    componentDidMount () {
        if (this.props.editing) this.open();
    }
    componentDidUpdate (prevProps) {
        if (this.props.editing && !prevProps.editing) this.open();
    }
    open () {
        const draft = this.props.draft;
        this.setState({
            draft: Object.assign({title: '', description: '', classId: null}, draft, {steps: draft.steps.slice()}),
            busy: false,
            error: null,
            notice: null
        });
        this.accountApi.classes().then(
            classes => this.setState({classes: classes}),
            () => this.setState({classes: []})
        );
    }
    update (patch) {
        this.setState(state => ({draft: Object.assign({}, state.draft, patch), notice: null}));
    }
    handleChange (patch) {
        this.update(patch);
    }
    handleStepChange (index, patch) {
        const steps = this.state.draft.steps.slice();
        steps[index] = Object.assign({}, steps[index], patch);
        this.update({steps});
    }
    handleStepMove (index, delta) {
        const steps = this.state.draft.steps.slice();
        const target = index + delta;
        if (target < 0 || target >= steps.length) return;
        const moved = steps.splice(index, 1)[0];
        steps.splice(target, 0, moved);
        this.update({steps});
    }
    handleStepRemove (index) {
        const steps = this.state.draft.steps.slice();
        steps.splice(index, 1);
        this.update({steps});
    }
    handleSave () {
        const draft = this.state.draft;
        this.setState({busy: true, error: null});
        const saved = draft.id ?
            this.api.update(draft.id, draft) :
            this.api.create(draft).then(lesson => this.api.uploadProject(lesson.id, this.props.startProject));
        return saved.then(() => {
            this.setState({busy: false});
            this.props.onSaved();
        }, error => this.setState({busy: false, error: error.message}));
    }
    handleDiscard () {
        // eslint-disable-next-line no-alert
        if (!window.confirm(DISCARD_QUESTION)) return;
        this.props.onClose();
    }
    handleResume () {
        this.props.onResume(this.state.draft);
    }
    render () {
        if (!this.props.editing || !this.state.draft) return null;
        return (
            <LessonEditorModal
                busy={this.state.busy}
                classes={this.state.classes}
                draft={this.state.draft}
                error={this.state.error}
                isNew={!this.state.draft.id}
                notice={this.state.notice}
                onChange={this.handleChange}
                onClose={this.handleDiscard}
                onDiscard={this.handleDiscard}
                onResume={this.handleResume}
                onSave={this.handleSave}
                onStepChange={this.handleStepChange}
                onStepMove={this.handleStepMove}
                onStepRemove={this.handleStepRemove}
            />
        );
    }
}

LessonEditor.propTypes = {
    accountApi: PropTypes.shape({classes: PropTypes.func}),
    api: PropTypes.shape({create: PropTypes.func}),
    draft: PropTypes.shape({steps: PropTypes.array}),
    editing: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onResume: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
    startProject: PropTypes.instanceOf(Blob)
};

const mapStateToProps = state => ({
    draft: state.scratchGui.lessons.draft,
    editing: state.scratchGui.lessons.mode === 'editing',
    startProject: state.scratchGui.lessons.startProject
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeLesson()),
    onResume: draft => dispatch(resumeRecording(draft)),
    onSaved: () => {
        dispatch(closeLesson());
        dispatch(openLessonsGallery());
    }
});

export {LessonEditor as LessonEditorComponent};

export default connect(mapStateToProps, mapDispatchToProps)(LessonEditor);
