import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import LibraryComponent from '../components/library/library.jsx';
import Modal from '../components/modal/modal.jsx';
import {createLessonApi, isSampleMode} from '../lib/lessons/lesson-api';
import {getLessonIdFromSearch} from '../lib/lessons/lesson-url';
import {progress} from '../lib/lessons/progress';
import {startLesson} from '../lib/lessons/start-lesson';
import {
    closeLessonsLibrary, closeLoadingProject, openLoadingProject
} from '../reducers/modals';
import {lessonLoaded, loadFailed, startLoading} from '../reducers/lessons';
import {getIsShowingProject} from '../reducers/project-state';

const messages = defineMessages({
    title: {
        defaultMessage: 'Bir ders seç',
        description: 'Title of the lessons library',
        id: 'gui.lessons.libraryTitle'
    },
    error: {
        defaultMessage: 'Dersler yüklenemedi',
        description: 'Title of the lessons load error dialog',
        id: 'gui.lessons.loadError'
    },
    beginner: {defaultMessage: 'Başlangıç', id: 'gui.lessons.levelBeginner'},
    intermediate: {defaultMessage: 'Orta', id: 'gui.lessons.levelIntermediate'},
    advanced: {defaultMessage: 'İleri', id: 'gui.lessons.levelAdvanced'},
    replaceProject: {
        defaultMessage: 'Bu ders yeni bir başlangıç projesi yükleyecek. Mevcut projen silinecek. Devam edelim mi?',
        id: 'gui.lessons.replaceProject'
    }
});

const LEVEL_TAGS = [
    {tag: 'baslangic', intlLabel: messages.beginner},
    {tag: 'orta', intlLabel: messages.intermediate},
    {tag: 'ileri', intlLabel: messages.advanced}
];

class LessonsLibrary extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleSelect', 'loadProject', 'start']);
        this.api = createLessonApi({
            fetchFn: (...args) => window.fetch(...args),
            sample: isSampleMode(window.location.search)
        });
        this.pendingLessonId = getLessonIdFromSearch(window.location.search);
        this.state = {lessons: null, error: null};
        this.listToken = 0;
    }
    componentDidMount () {
        this.maybeLoadList();
        this.maybeStartDeepLink();
    }
    componentDidUpdate (prevProps) {
        if (this.props.visible && !prevProps.visible) this.maybeLoadList();
        this.maybeStartDeepLink();
    }
    componentWillUnmount () {
        this.listToken++;
    }
    maybeLoadList () {
        if (!this.props.visible) return;
        const token = ++this.listToken;
        this.setState({lessons: null, error: null});
        this.api.listLessons().then(
            lessons => {
                if (token === this.listToken) this.setState({lessons: lessons});
            },
            error => {
                if (token === this.listToken) this.setState({error: error.message});
            }
        );
    }
    maybeStartDeepLink () {
        if (this.pendingLessonId && this.props.isProjectShown) {
            const id = this.pendingLessonId;
            this.pendingLessonId = null;
            this.start(id);
        }
    }
    loadProject (url) {
        const {vm} = this.props;
        this.props.onLoadingStarted();
        return window.fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Başlangıç projesi indirilemedi');
                return response.arrayBuffer();
            })
            .then(buffer => vm.loadProject(buffer))
            .then(
                () => this.props.onLoadingFinished(),
                error => {
                    this.props.onLoadingFinished();
                    throw error;
                }
            );
    }
    start (id) {
        return startLesson({
            id: id,
            api: this.api,
            progress: progress,
            loadProject: this.loadProject,
            confirmReplace: () => window.confirm( // eslint-disable-line no-alert
                this.props.intl.formatMessage(messages.replaceProject)
            ),
            actions: {
                loading: lessonId => this.props.onLoading(lessonId),
                loaded: (lesson, stepIndex) => this.props.onLoaded(lesson, stepIndex),
                failed: message => {
                    this.props.onFailed(message);
                    alert(message); // eslint-disable-line no-alert
                },
                cancelled: () => {} // vazgeçildi: açık ders olduğu gibi kalır
            }
        });
    }
    handleSelect (item) {
        this.props.onRequestClose();
        this.start(item.id);
    }
    render () {
        if (!this.props.visible) return null;
        if (this.state.error) {
            return (
                <Modal
                    contentLabel={this.props.intl.formatMessage(messages.error)}
                    onRequestClose={this.props.onRequestClose}
                >
                    <div style={{padding: '1.5rem'}}>{this.state.error}</div>
                </Modal>
            );
        }
        if (!this.state.lessons) return null;
        const data = this.state.lessons.map(lesson => ({
            id: lesson.id,
            name: progress.get(lesson.id).done ? `✓ ${lesson.title}` : lesson.title,
            rawURL: lesson.cover || '',
            featured: true,
            tags: [lesson.level],
            description: `${lesson.stepCount} adım`
        }));
        return (
            <LibraryComponent
                filterable
                data={data}
                id="lessonsLibrary"
                tags={LEVEL_TAGS}
                title={this.props.intl.formatMessage(messages.title)}
                visible={this.props.visible}
                onItemSelected={this.handleSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

LessonsLibrary.propTypes = {
    intl: intlShape.isRequired,
    isProjectShown: PropTypes.bool,
    onFailed: PropTypes.func,
    onLoaded: PropTypes.func,
    onLoading: PropTypes.func,
    onLoadingFinished: PropTypes.func,
    onLoadingStarted: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.shape({loadProject: PropTypes.func})
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.lessonsLibrary,
    isProjectShown: getIsShowingProject(state.scratchGui.projectState.loadingState)
});

const mapDispatchToProps = dispatch => ({
    onFailed: message => dispatch(loadFailed(message)),
    onLoaded: (lesson, stepIndex) => dispatch(lessonLoaded(lesson, stepIndex)),
    onLoading: id => dispatch(startLoading(id)),
    onLoadingFinished: () => dispatch(closeLoadingProject()),
    onLoadingStarted: () => dispatch(openLoadingProject()),
    onRequestClose: () => dispatch(closeLessonsLibrary())
});

export {
    LessonsLibrary as LessonsLibraryComponent
};

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(LessonsLibrary));
