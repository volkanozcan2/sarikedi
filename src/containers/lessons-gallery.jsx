import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import LessonsGalleryModal from '../components/lessons/lessons-gallery-modal.jsx';
import {createLessonApi} from '../lib/lessons/lesson-api';
import {setCloudProject} from '../reducers/account';
import {editLesson, playLesson, startRecording} from '../reducers/lessons';
import {closeLessonsGallery, closeLoadingProject, openLoadingProject} from '../reducers/modals';
import {setProjectTitle} from '../reducers/project-title';

const RECORD_QUESTION = 'Şu an açık olan proje dersin başlangıç projesi olacak. Boş bir dersle başlamak ' +
    'istiyorsan önce Dosya > Yeni ile yeni proje aç. Kayıt başlasın mı?';
const START_QUESTION = 'Ders açılınca şu anki projenin yerini alır. Kaydetmediysen açık projen kaybolur. Devam?';
const REMOVE_QUESTION = 'Bu ders silinecek. Emin misin?';

/** Dersler penceresi: listeyi yükler; kayıt başlatma, dersi düzenleme/silme ve dersi başlatma. */
class LessonsGallery extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleRecord', 'handleStart', 'handleEdit', 'handleRemove']);
        this.api = props.api || createLessonApi({fetchFn: (...args) => window.fetch(...args)});
        this.state = {lessons: [], loading: false, busy: false, error: null};
    }
    componentDidMount () {
        if (this.props.open) this.load();
    }
    componentDidUpdate (prevProps) {
        if (this.props.open && (!prevProps.open || this.props.user !== prevProps.user)) this.load();
    }
    load () {
        this.setState({loading: true, error: null});
        return this.api.list().then(
            lessons => this.setState({lessons: lessons, loading: false}),
            error => this.setState({loading: false, error: error.message})
        );
    }
    attempt (task) {
        this.setState({busy: true, error: null});
        return task().then(
            () => this.setState({busy: false}),
            error => this.setState({busy: false, error: error.message})
        );
    }
    handleRecord () {
        // eslint-disable-next-line no-alert
        if (!window.confirm(RECORD_QUESTION)) return Promise.resolve();
        return this.attempt(() => this.props.vm.saveProjectSb3().then(blob => {
            this.props.onClose();
            this.props.onRecord(blob);
        }));
    }
    handleStart (id) {
        // eslint-disable-next-line no-alert
        if (!window.confirm(START_QUESTION)) return Promise.resolve();
        return this.attempt(() => {
            this.props.onLoadingStarted();
            return Promise.all([this.api.get(id), this.api.download(id)])
                .then(([lesson, buffer]) => this.props.vm.loadProject(buffer).then(() => lesson))
                .then(lesson => {
                    this.props.onLoadingFinished();
                    this.props.onClose();
                    this.props.onPlay(lesson);
                }, error => {
                    this.props.onLoadingFinished();
                    throw error;
                });
        });
    }
    handleEdit (id) {
        return this.attempt(() => this.api.get(id).then(lesson => {
            this.props.onClose();
            this.props.onEdit(lesson);
        }));
    }
    handleRemove (id) {
        // eslint-disable-next-line no-alert
        if (!window.confirm(REMOVE_QUESTION)) return Promise.resolve();
        return this.attempt(() => this.api.remove(id).then(() => this.load()));
    }
    render () {
        if (!this.props.open) return null;
        return (
            <LessonsGalleryModal
                busy={this.state.busy}
                error={this.state.error}
                isTeacher={Boolean(this.props.user && this.props.user.role === 'teacher')}
                lessons={this.state.lessons}
                loading={this.state.loading}
                onClose={this.props.onClose}
                onEdit={this.handleEdit}
                onRecord={this.handleRecord}
                onRemove={this.handleRemove}
                onStart={this.handleStart}
            />
        );
    }
}

LessonsGallery.propTypes = {
    api: PropTypes.shape({list: PropTypes.func}),
    onClose: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onLoadingFinished: PropTypes.func.isRequired,
    onLoadingStarted: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onRecord: PropTypes.func.isRequired,
    open: PropTypes.bool,
    user: PropTypes.shape({role: PropTypes.string}),
    vm: PropTypes.shape({loadProject: PropTypes.func, saveProjectSb3: PropTypes.func}).isRequired
};

const mapStateToProps = state => ({
    open: state.scratchGui.modals.lessonsGallery,
    user: state.scratchGui.account.user
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeLessonsGallery()),
    onEdit: lesson => dispatch(editLesson(lesson)),
    onLoadingFinished: () => dispatch(closeLoadingProject()),
    onLoadingStarted: () => dispatch(openLoadingProject()),
    onPlay: lesson => {
        dispatch(setCloudProject(null));
        dispatch(setProjectTitle(lesson.title));
        dispatch(playLesson(lesson));
    },
    onRecord: blob => dispatch(startRecording(blob))
});

export {LessonsGallery as LessonsGalleryComponent};

export default connect(mapStateToProps, mapDispatchToProps)(LessonsGallery);
