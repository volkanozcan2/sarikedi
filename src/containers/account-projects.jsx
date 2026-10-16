/* eslint-disable react/jsx-handler-names, react/no-did-update-set-state */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import MyProjectsModal from '../components/account/my-projects-modal.jsx';
import QuickShareModal from '../components/account/quick-share-modal.jsx';
import SaveProjectModal from '../components/account/save-project-modal.jsx';
import {createAccountApi} from '../lib/accounts/account-api';
import {captureThumbnail} from '../lib/accounts/thumbnail';
import {setCloudProject} from '../reducers/account';
import {
    closeLoadingProject, closeMyProjects, closeQuickShare, closeSaveProject, openLoadingProject, openSharedGallery
} from '../reducers/modals';
import {setProjectTitle} from '../reducers/project-title';

const REPLACE_QUESTION =
    'Açık projen yerine seçtiğin proje açılacak. Kaydetmediysen açık projen kaybolur. Devam edilsin mi?';

/** "Hesabıma kaydet" ve "Projelerim" pencereleri: projeyi sunucuya yazar, listeler, açar, siler. */
class AccountProjects extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'save', 'openProject', 'removeProject', 'closeSave', 'shareProject', 'goShared', 'closeShare',
            'shareAnyway', 'renameShared', 'deleteShared'
        ]);
        this.api = props.api || createAccountApi({fetchFn: (...args) => window.fetch(...args)});
        this.state = {
            busy: false,
            error: null,
            message: null,
            projects: [],
            unchanged: false,
            shareWorking: false,
            shareError: null,
            shareMessage: null
        };
    }
    componentDidMount () {
        if (this.props.listOpen) this.loadProjects();
        if (this.props.quickShareOpen) this.quickShare();
    }
    componentDidUpdate (prevProps) {
        if (this.props.saveOpen && !prevProps.saveOpen) this.setState({error: null, message: null});
        if (this.props.listOpen && !prevProps.listOpen) this.loadProjects();
        if (this.props.quickShareOpen && !prevProps.quickShareOpen) this.quickShare();
    }
    // son kaydedilen/açılan halin parmak izi; "değişiklik yapmadan paylaş" uyarısı için
    markClean (id) {
        let json = null;
        try {
            json = this.props.vm.toJSON();
        } catch (e) {
            json = null;
        }
        this.clean = json ? {id: id, json: json} : null;
    }
    // hiçbir kuklada blok yoksa proje boştur
    isEmptyProject () {
        try {
            const project = JSON.parse(this.props.vm.toJSON());
            return project.targets.every(target => Object.keys(target.blocks || {}).length === 0);
        } catch (e) {
            return false;
        }
    }
    isUnchanged (cloud) {
        if (!cloud || !this.clean || this.clean.id !== cloud.id) return false;
        try {
            return this.props.vm.toJSON() === this.clean.json;
        } catch (e) {
            return false;
        }
    }
    loadProjects () {
        this.setState({error: null});
        return this.api.projects().then(
            projects => this.setState({projects: projects}),
            error => this.setState({error: error.message})
        );
    }
    save (title, overwrite) {
        const cloud = this.props.cloudProject;
        this.setState({busy: true, error: null});
        return this.props.vm.saveProjectSb3()
            .then(blob => {
                if (overwrite && cloud) {
                    return this.api.updateProject(cloud.id, blob).then(meta => (
                        title.trim() === cloud.title ? meta : this.api.renameProject(cloud.id, title)
                    ));
                }
                return this.api.saveProject(title, blob);
            })
            .then(meta => {
                this.uploadThumbnail(meta.id);
                this.markClean(meta.id);
                this.props.onCloudProject({id: meta.id, title: meta.title || title.trim()});
                this.props.onSetTitle(meta.title || title.trim());
                this.setState({busy: false, message: `"${meta.title || title.trim()}" hesabına kaydedildi`});
            }, error => this.setState({busy: false, error: error.message}));
    }
    // Tek tıkla: projeyi hesaba kaydet (açık hesap projesi varsa üstüne yaz) ve sınıfla paylaş
    quickShare (force) {
        const cloud = this.props.cloudProject;
        if (this.isEmptyProject()) {
            this.setState({
                unchanged: false,
                shareWorking: false,
                shareMessage: null,
                shareError: 'Boş proje paylaşılamaz. Önce birkaç blok ekle.'
            });
            return Promise.resolve();
        }
        if (force !== true && this.isUnchanged(cloud)) {
            this.setState({unchanged: true, shareWorking: false, shareError: null, shareMessage: null});
            return Promise.resolve();
        }
        const title = (this.props.projectTitle || '').trim() || 'Projem';
        this.setState({unchanged: false, shareWorking: true, shareError: null, shareMessage: null});
        return this.props.vm.saveProjectSb3()
            .then(blob => (cloud ? this.api.updateProject(cloud.id, blob) : this.api.saveProject(title, blob)))
            .then(meta => this.api.shareProject(meta.id, true, 'class').then(() => meta))
            .then(meta => {
                const name = meta.title || (cloud ? cloud.title : title);
                this.uploadThumbnail(meta.id);
                this.markClean(meta.id);
                this.props.onCloudProject({id: meta.id, title: name});
                const group = this.props.userRole === 'teacher' ? 'sınıflarınla' : 'sınıfınla';
                this.setState({shareWorking: false, shareMessage: `"${name}" kaydedildi ve ${group} paylaşıldı.`});
            }, error => this.setState({shareWorking: false, shareError: error.message}));
    }
    shareAnyway () {
        return this.quickShare(true);
    }
    renameShared (title) {
        const cloud = this.props.cloudProject;
        this.setState({shareWorking: true, shareError: null});
        return this.api.renameProject(cloud.id, title).then(meta => {
            const name = meta.title || title.trim();
            this.props.onCloudProject({id: cloud.id, title: name});
            this.props.onSetTitle(name);
            this.setState({shareWorking: false});
        }, error => this.setState({shareWorking: false, shareError: error.message}));
    }
    deleteShared () {
        const cloud = this.props.cloudProject;
        this.setState({shareWorking: true, shareError: null});
        return this.api.removeProject(cloud.id).then(() => {
            this.clean = null;
            this.props.onCloudProject(null);
            this.closeShare();
        }, error => this.setState({shareWorking: false, shareError: error.message}));
    }
    closeShare () {
        this.setState({unchanged: false, shareWorking: false, shareError: null, shareMessage: null});
        this.props.onCloseQuickShare();
    }
    goShared () {
        this.closeShare();
        this.props.onOpenSharedGallery();
    }
    // proje kartında görünecek küçük resim; başarısız olursa sessizce atlanır
    uploadThumbnail (id) {
        return captureThumbnail(this.props.vm)
            .then(blob => (blob ? this.api.saveThumbnail(id, blob) : null))
            .catch(() => null);
    }
    shareProject (id, shared, scope) {
        this.setState({busy: true, error: null});
        return this.api.shareProject(id, shared, scope)
            .then(() => this.loadProjects(), error => this.setState({error: error.message}))
            .then(() => this.setState({busy: false}));
    }
    closeSave () {
        this.setState({error: null, message: null});
        this.props.onCloseSave();
    }
    openProject (id, title) {
        // eslint-disable-next-line no-alert
        if (!window.confirm(REPLACE_QUESTION)) return Promise.resolve();
        this.setState({busy: true, error: null});
        this.props.onLoadingStarted();
        return this.api.downloadProject(id)
            .then(buffer => this.props.vm.loadProject(buffer))
            .then(() => {
                this.markClean(id);
                this.props.onCloudProject({id: id, title: title});
                this.props.onSetTitle(title);
                this.props.onLoadingFinished();
                this.setState({busy: false});
                this.props.onCloseList();
            }, error => {
                this.props.onLoadingFinished();
                this.setState({busy: false, error: error.message});
            });
    }
    removeProject (id) {
        this.setState({busy: true, error: null});
        return this.api.removeProject(id)
            .then(() => {
                const cloud = this.props.cloudProject;
                if (cloud && cloud.id === id) this.props.onCloudProject(null);
                return this.loadProjects();
            }, error => this.setState({error: error.message}))
            .then(() => this.setState({busy: false}));
    }
    render () {
        const s = this.state;
        return (
            <React.Fragment>
                {this.props.saveOpen ? (
                    <SaveProjectModal
                        busy={s.busy}
                        cloudProject={this.props.cloudProject}
                        error={s.error}
                        initialTitle={this.props.projectTitle}
                        message={s.message}
                        onClose={this.closeSave}
                        onSave={this.save}
                    />
                ) : null}
                {this.props.quickShareOpen ? (
                    <QuickShareModal
                        error={s.shareError}
                        message={s.shareMessage}
                        projectName={this.props.cloudProject ? this.props.cloudProject.title : ''}
                        unchanged={s.unchanged}
                        working={s.shareWorking}
                        onClose={this.closeShare}
                        onDelete={this.deleteShared}
                        onGoShared={this.goShared}
                        onRename={this.renameShared}
                        onShareAnyway={this.shareAnyway}
                    />
                ) : null}
                {this.props.listOpen ? (
                    <MyProjectsModal
                        busy={s.busy}
                        error={s.error}
                        projects={s.projects}
                        userRole={this.props.userRole}
                        onClose={this.props.onCloseList}
                        onOpen={this.openProject}
                        onRemove={this.removeProject}
                        onShare={this.shareProject}
                    />
                ) : null}
            </React.Fragment>
        );
    }
}

AccountProjects.propTypes = {
    api: PropTypes.shape({projects: PropTypes.func}),
    cloudProject: PropTypes.shape({id: PropTypes.number, title: PropTypes.string}),
    listOpen: PropTypes.bool,
    onCloseList: PropTypes.func.isRequired,
    onCloseQuickShare: PropTypes.func.isRequired,
    onCloseSave: PropTypes.func.isRequired,
    onCloudProject: PropTypes.func.isRequired,
    onLoadingFinished: PropTypes.func.isRequired,
    onLoadingStarted: PropTypes.func.isRequired,
    onOpenSharedGallery: PropTypes.func.isRequired,
    onSetTitle: PropTypes.func.isRequired,
    projectTitle: PropTypes.string,
    quickShareOpen: PropTypes.bool,
    saveOpen: PropTypes.bool,
    userRole: PropTypes.string,
    vm: PropTypes.shape({
        loadProject: PropTypes.func, saveProjectSb3: PropTypes.func, toJSON: PropTypes.func
    }).isRequired
};

const mapStateToProps = state => ({
    cloudProject: state.scratchGui.account.cloudProject,
    listOpen: state.scratchGui.modals.myProjects,
    projectTitle: state.scratchGui.projectTitle,
    quickShareOpen: state.scratchGui.modals.quickShare,
    saveOpen: state.scratchGui.modals.saveProject,
    userRole: state.scratchGui.account.user ? state.scratchGui.account.user.role : null
});

const mapDispatchToProps = dispatch => ({
    onCloseList: () => dispatch(closeMyProjects()),
    onCloseQuickShare: () => dispatch(closeQuickShare()),
    onCloseSave: () => dispatch(closeSaveProject()),
    onCloudProject: project => dispatch(setCloudProject(project)),
    onLoadingFinished: () => dispatch(closeLoadingProject()),
    onLoadingStarted: () => dispatch(openLoadingProject()),
    onOpenSharedGallery: () => dispatch(openSharedGallery()),
    onSetTitle: title => dispatch(setProjectTitle(title))
});

export {
    AccountProjects as AccountProjectsComponent
};

export default connect(mapStateToProps, mapDispatchToProps)(AccountProjects);
