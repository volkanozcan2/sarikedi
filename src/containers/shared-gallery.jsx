/* eslint-disable react/jsx-handler-names, react/no-did-update-set-state */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import SharedGalleryModal from '../components/account/shared-gallery-modal.jsx';
import SharedProjectModal from '../components/account/shared-project-modal.jsx';
import {createAccountApi} from '../lib/accounts/account-api';
import {setCloudProject} from '../reducers/account';
import {
    closeLoadingProject, closeSharedGallery, openLoadingProject, openLoginModal, openRegisterModal
} from '../reducers/modals';
import {setProjectTitle} from '../reducers/project-title';

const REPLACE_QUESTION =
    'Açık projen yerine bu projenin kopyası açılacak. Kaydetmediysen açık projen kaybolur. Devam edilsin mi?';
const REPORTED = 'Bildirildi. Öğretmenin bakacak, teşekkürler.';

/** "Paylaşılanlar": arkadaşların paylaştığı projeleri listeler; beğeni, yorum, bildirme ve kopyasını açma. */
class SharedGallery extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'select', 'back', 'like', 'comment', 'deleteComment', 'report', 'openCopy', 'setScope', 'unshare',
            'removeProject', 'handleLogin', 'handleRegister'
        ]);
        this.api = props.api || createAccountApi({fetchFn: (...args) => window.fetch(...args)});
        this.state = {projects: [], loading: false, error: null, message: null, selected: null, busy: false};
    }
    componentDidMount () {
        if (this.props.open) this.loadList();
    }
    componentDidUpdate (prevProps) {
        if (this.props.open && (!prevProps.open || (this.props.user && !prevProps.user))) {
            this.setState({selected: null, message: null});
            this.loadList();
        }
    }
    loadList () {
        if (!this.props.user) return Promise.resolve();
        this.setState({loading: true, error: null});
        return this.api.shared().then(
            projects => this.setState({projects: projects, loading: false}),
            error => this.setState({loading: false, error: error.message})
        );
    }
    loadDetail (id) {
        return this.api.sharedProject(id).then(
            project => this.setState({selected: project, error: null}),
            error => this.setState({error: error.message})
        );
    }
    attempt (task, success) {
        this.setState({busy: true, error: null, message: null});
        return task().then(success, error => this.setState({error: error.message}))
            .then(() => this.setState({busy: false}));
    }
    select (id) {
        this.setState({error: null, message: null});
        return this.loadDetail(id);
    }
    back () {
        this.setState({selected: null, error: null, message: null});
        return this.loadList();
    }
    like () {
        const id = this.state.selected.id;
        return this.attempt(() => this.api.like(id), result => this.setState(state => ({
            selected: Object.assign({}, state.selected, {liked: result.liked, likes: result.likes})
        })));
    }
    comment (body) {
        const id = this.state.selected.id;
        return this.attempt(() => this.api.addComment(id, body), () => this.loadDetail(id));
    }
    deleteComment (commentId) {
        const id = this.state.selected.id;
        return this.attempt(() => this.api.deleteComment(id, commentId), () => this.loadDetail(id));
    }
    report (commentId) {
        const id = this.state.selected.id;
        return this.attempt(() => this.api.report(id, commentId), () => this.setState({message: REPORTED}));
    }
    setScope (scope) {
        const id = this.state.selected.id;
        return this.attempt(() => this.api.setProjectScope(id, scope), () => this.loadDetail(id));
    }
    unshare () {
        const id = this.state.selected.id;
        return this.attempt(() => this.api.unshareProject(id), () => this.back());
    }
    removeProject () {
        const project = this.state.selected;
        return this.attempt(
            () => (project.mine ? this.api.removeProject(project.id) : this.api.removeStudentProject(project.id)),
            () => this.back()
        );
    }
    openCopy () {
        // eslint-disable-next-line no-alert
        if (!window.confirm(REPLACE_QUESTION)) return Promise.resolve();
        const project = this.state.selected;
        this.setState({busy: true, error: null});
        this.props.onLoadingStarted();
        return this.api.downloadShared(project.id)
            .then(buffer => this.props.vm.loadProject(buffer))
            .then(() => {
                this.props.onCloudProject(null);
                this.props.onSetTitle(project.title);
                this.props.onLoadingFinished();
                this.setState({busy: false});
                this.props.onClose();
            }, error => {
                this.props.onLoadingFinished();
                this.setState({busy: false, error: error.message});
            });
    }
    handleLogin () {
        this.props.onClose();
        this.props.onLogin();
    }
    handleRegister () {
        this.props.onClose();
        this.props.onRegister();
    }
    render () {
        if (!this.props.open) return null;
        const s = this.state;
        if (s.selected) {
            return (
                <SharedProjectModal
                    busy={s.busy}
                    error={s.error}
                    message={s.message}
                    project={s.selected}
                    onBack={this.back}
                    onClose={this.props.onClose}
                    onComment={this.comment}
                    onDeleteComment={this.deleteComment}
                    onLike={this.like}
                    onOpenCopy={this.openCopy}
                    onReport={this.report}
                    onSetScope={this.setScope}
                    onRemove={this.removeProject}
                    onUnshare={this.unshare}
                />
            );
        }
        return (
            <SharedGalleryModal
                error={s.error}
                loading={s.loading}
                projects={s.projects}
                user={this.props.user}
                onClose={this.props.onClose}
                onLogin={this.handleLogin}
                onRegister={this.handleRegister}
                onSelect={this.select}
            />
        );
    }
}

SharedGallery.propTypes = {
    api: PropTypes.shape({shared: PropTypes.func}),
    onClose: PropTypes.func.isRequired,
    onCloudProject: PropTypes.func.isRequired,
    onLoadingFinished: PropTypes.func.isRequired,
    onLoadingStarted: PropTypes.func.isRequired,
    onLogin: PropTypes.func.isRequired,
    onRegister: PropTypes.func.isRequired,
    onSetTitle: PropTypes.func.isRequired,
    open: PropTypes.bool,
    user: PropTypes.shape({role: PropTypes.string}),
    vm: PropTypes.shape({loadProject: PropTypes.func}).isRequired
};

const mapStateToProps = state => ({
    open: state.scratchGui.modals.sharedGallery,
    user: state.scratchGui.account.user
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeSharedGallery()),
    onCloudProject: project => dispatch(setCloudProject(project)),
    onLoadingFinished: () => dispatch(closeLoadingProject()),
    onLoadingStarted: () => dispatch(openLoadingProject()),
    onLogin: () => dispatch(openLoginModal()),
    onRegister: () => dispatch(openRegisterModal()),
    onSetTitle: title => dispatch(setProjectTitle(title))
});

export {
    SharedGallery as SharedGalleryComponent
};

export default connect(mapStateToProps, mapDispatchToProps)(SharedGallery);
