/* eslint-disable react/jsx-no-literals, react/jsx-handler-names */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import ScratchBlocks from 'scratch-blocks';

import AuthorLessonForm from '../components/author/author-lesson-form.jsx';
import AuthorLessonList from '../components/author/author-lesson-list.jsx';
import AuthorImporter from '../components/author/author-importer.jsx';
import AuthorRecordBar from '../components/author/author-record-bar.jsx';
import AuthorRecorder from '../components/author/author-recorder.jsx';
import AuthorLogin from '../components/author/author-login.jsx';
import AuthorStepForm from '../components/author/author-step-form.jsx';
import styles from '../components/author/author.css';
import {createAdminApi} from '../lib/lessons/admin-api';
import {isAuthorMode} from '../lib/lessons/author-url';
import {capturePattern, listScripts, listWorkspaceOpcodes, tryStep} from '../lib/lessons/capture';
import {
    addCheck, addStep, appendRecordedStep, emptyLesson, moveStep, newOutcomeCheck, removeCheck, removeStep,
    replaceCheck, slugify, updateLesson, updateStep
} from '../lib/lessons/draft';
import {importProjectFile} from '../lib/lessons/import-project';
import {recordStep, snapshotWorkspace} from '../lib/lessons/recorder';
import {validateLesson} from '../lib/lessons/schema';
import {openLessonsLibrary} from '../reducers/modals';

// boş giriş yer tutucuları (?) ve kapsayıcı işareti (*) metinde anlamsız
const labelOf = block => block.toString().replace(/[?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Blok görünen adı: önce paletteden, yoksa boş bir Blockly çalışma alanında blok üretip okur
const makeLabeler = () => {
    const known = {};
    try {
        ScratchBlocks.getMainWorkspace().getFlyout()
            .getWorkspace()
            .getAllBlocks(false)
            .forEach(block => {
                if (!block.isShadow() && !known[block.type]) known[block.type] = labelOf(block);
            });
    } catch (e) {
        // palet okunamazsa yedek yola düşülür
    }
    let scratch = null;
    return opcode => {
        if (known[opcode]) return known[opcode];
        try {
            scratch = scratch || new ScratchBlocks.Workspace();
            const created = scratch.newBlock(opcode);
            const label = labelOf(created);
            created.dispose();
            return label;
        } catch (e) {
            return null;
        }
    };
};

const PANEL_WIDTH = '30rem';

// Panel açıkken editörü sola daraltır (kontroller panelin altında kalmasın); kapanınca eski haline döner
const shiftEditor = open => {
    const app = document.getElementById('app');
    if (!app) return;
    app.style.width = open ? `calc(100% - ${PANEL_WIDTH})` : '';
    app.style.minWidth = open ? '0' : '';
    window.dispatchEvent(new Event('resize'));
};

const SESSION_ENDED = 'Oturum bitti, tekrar giriş yap';

const readPaletteOpcodes = () => {
    try {
        const blocks = ScratchBlocks.getMainWorkspace().getFlyout()
            .getWorkspace()
            .getAllBlocks(false);
        const found = {};
        blocks.forEach(block => {
            if (!block.isShadow()) found[block.type] = true;
        });
        return Object.keys(found).sort();
    } catch (e) {
        return [];
    }
};

class AuthorPanel extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'toggleOpen', 'login', 'logout', 'newLesson', 'editLesson', 'deleteLesson', 'togglePublished',
            'moveLesson', 'back', 'save', 'changeDraft', 'changeId', 'selectStep', 'addStep', 'removeStep',
            'moveStep', 'changeStep', 'changeCheck', 'removeCheck', 'addOutcome', 'capture', 'tryChecks',
            'refreshWorkspace', 'uploadCover', 'uploadMedia', 'useCurrentProject', 'clearStartProject',
            'startRecording', 'saveRecordedStep', 'stopRecording', 'importProject', 'openPanel', 'openLessons'
        ]);
        this.enabled = typeof props.isAuthorMode === 'boolean' ? props.isAuthorMode :
            isAuthorMode(window.location.search);
        this.api = props.api || createAdminApi({fetchFn: (...args) => window.fetch(...args)});
        this.state = {
            open: false,
            status: 'checking',
            busy: false,
            error: null,
            message: null,
            lessons: [],
            draft: null,
            isNew: false,
            idTouched: false,
            dirty: false,
            stepIndex: 0,
            errors: [],
            testResult: null,
            scripts: [],
            paletteOpcodes: [],
            workspaceOpcodes: [],
            recording: null
        };
        this.checkedSession = false;
    }
    componentWillUnmount () {
        shiftEditor(false);
    }
    // ---- yardımcılar ----
    run (task) {
        this.setState({busy: true, error: null});
        return Promise.resolve().then(task)
            .then(result => {
                this.setState({busy: false});
                return result;
            }, error => {
                if (error && error.status === 401 && this.state.status !== 'login') {
                    this.setState({busy: false, status: 'login', error: SESSION_ENDED});
                } else {
                    this.setState({
                        busy: false,
                        error: error && error.message ? error.message : 'Bir hata oluştu',
                        errors: error && error.errors && error.errors.length > 0 ? error.errors : this.state.errors
                    });
                }
                return null;
            });
    }
    confirmDiscard () {
        if (!this.state.dirty) return true;
        // eslint-disable-next-line no-alert
        return window.confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?');
    }
    reloadList () {
        return this.api.list().then(lessons => this.setState({status: 'list', lessons: lessons}));
    }
    // ---- açma / oturum ----
    toggleOpen () {
        const open = !this.state.open;
        shiftEditor(open);
        this.setState({open: open});
        if (open && !this.checkedSession) {
            this.checkedSession = true;
            this.run(() => this.api.me().then(isAdmin => (
                isAdmin ? this.reloadList() : this.setState({status: 'login'})
            )));
        }
    }
    openPanel () {
        if (!this.state.open) this.toggleOpen();
    }
    openLessons () {
        if (this.props.onOpenLessons) this.props.onOpenLessons();
    }
    login (password) {
        return this.run(() => this.api.login(password).then(() => {
            // oturum düşmüşken yarım kalan bir taslak varsa kaldığı yerden devam edilir
            if (this.state.draft) {
                this.setState({status: 'edit', error: null});
                return null;
            }
            return this.reloadList();
        }));
    }
    logout () {
        if (!this.confirmDiscard()) return null;
        return this.run(() => this.api.logout().then(() => this.setState({
            status: 'login', draft: null, dirty: false, lessons: [], error: null, message: null, recording: null
        })));
    }
    // ---- ders listesi ----
    newLesson () {
        if (!this.confirmDiscard()) return;
        this.setState({
            status: 'edit',
            draft: emptyLesson(),
            isNew: true,
            idTouched: false,
            dirty: false,
            stepIndex: 0,
            errors: [],
            message: null,
            testResult: null,
            recording: null
        });
        this.refreshWorkspace();
    }
    editLesson (id) {
        if (!this.confirmDiscard()) return null;
        return this.run(() => this.api.get(id).then(lesson => {
            this.setState({
                status: 'edit',
                draft: lesson,
                isNew: false,
                idTouched: true,
                dirty: false,
                stepIndex: 0,
                errors: [],
                message: null,
                testResult: null,
                recording: null
            });
            this.refreshWorkspace();
        }));
    }
    deleteLesson (id) {
        if (!window.confirm(`"${id}" dersi silinecek. Emin misin?`)) return null; // eslint-disable-line no-alert
        return this.run(() => this.api.remove(id).then(() => this.reloadList()));
    }
    togglePublished (id) {
        const summary = this.state.lessons.find(lesson => lesson.id === id);
        if (!summary) return null;
        return this.run(() => this.api.get(id)
            .then(lesson => this.api.replace(id, Object.assign({}, lesson, {published: !summary.published})))
            .then(() => this.reloadList()));
    }
    moveLesson (id, delta) {
        const ids = this.state.lessons.map(lesson => lesson.id);
        const from = ids.indexOf(id);
        const to = from + delta;
        if (from === -1 || to < 0 || to >= ids.length) return null;
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        return this.run(() => this.api.reorder(ids).then(() => this.reloadList()));
    }
    back () {
        if (!this.confirmDiscard()) return null;
        this.setState({status: 'list', draft: null, dirty: false, errors: [], message: null, recording: null});
        return this.run(() => this.reloadList());
    }
    // ---- taslak düzenleme ----
    save () {
        const draft = this.state.draft;
        const check = validateLesson(draft);
        if (!check.valid) {
            this.setState({errors: check.errors, message: null});
            return null;
        }
        this.setState({errors: [], message: null});
        return this.run(() => (this.state.isNew ? this.api.create(draft) : this.api.replace(draft.id, draft))
            .then(() => this.setState({
                isNew: false,
                dirty: false,
                message: draft.published ? 'Kaydedildi' :
                    'Kaydedildi. Ders gizli: menüde görünmesi için "Yayında" kutusunu işaretleyip tekrar kaydet.'
            })));
    }
    edit (nextDraft, extra) {
        this.setState(Object.assign({draft: nextDraft, dirty: true, message: null}, extra || {}));
    }
    changeDraft (patch) {
        let next = updateLesson(this.state.draft, patch);
        if (this.state.isNew && !this.state.idTouched && typeof patch.title === 'string') {
            next = updateLesson(next, {id: slugify(patch.title)});
        }
        this.edit(next);
    }
    changeId (id) {
        this.setState({idTouched: true});
        this.edit(updateLesson(this.state.draft, {id: slugify(id)}));
    }
    selectStep (index) {
        this.setState({stepIndex: index, testResult: null});
        this.refreshWorkspace();
    }
    addStep () {
        const next = addStep(this.state.draft);
        this.edit(next, {stepIndex: next.steps.length - 1, testResult: null});
    }
    removeStep (index) {
        if (this.state.draft.steps.length < 2) return;
        if (!window.confirm(`Adım ${index + 1} silinecek. Emin misin?`)) return; // eslint-disable-line no-alert
        const next = removeStep(this.state.draft, index);
        this.edit(next, {stepIndex: Math.min(this.state.stepIndex, next.steps.length - 1), testResult: null});
    }
    moveStep (index, delta) {
        const next = moveStep(this.state.draft, index, delta);
        if (next !== this.state.draft) this.edit(next, {stepIndex: index + delta, testResult: null});
    }
    changeStep (patch) {
        this.edit(updateStep(this.state.draft, this.state.stepIndex, patch));
    }
    changeCheck (checkIndex, check) {
        this.edit(replaceCheck(this.state.draft, this.state.stepIndex, checkIndex, check));
    }
    removeCheck (checkIndex) {
        this.edit(removeCheck(this.state.draft, this.state.stepIndex, checkIndex), {testResult: null});
    }
    addOutcome () {
        this.edit(addCheck(this.state.draft, this.state.stepIndex, newOutcomeCheck()), {testResult: null});
    }
    capture (script, exact) {
        try {
            const pattern = capturePattern(this.props.vm, script, {exact: exact});
            const check = {type: 'blocks', sprite: script.sprite, pattern: pattern};
            this.edit(addCheck(this.state.draft, this.state.stepIndex, check), {testResult: null, error: null});
        } catch (error) {
            this.setState({error: error.message});
        }
    }
    tryChecks () {
        if (this.state.busy) return null;
        const step = this.state.draft.steps[this.state.stepIndex];
        this.setState({busy: true});
        return tryStep(this.props.vm, step).then(result => this.setState({busy: false, testResult: result}));
    }
    refreshWorkspace () {
        this.setState({
            scripts: listScripts(this.props.vm),
            workspaceOpcodes: listWorkspaceOpcodes(this.props.vm),
            paletteOpcodes: readPaletteOpcodes(),
            testResult: null
        });
    }
    // ---- kayıt modu ----
    startRecording () {
        // eslint-disable-next-line no-alert
        if (!window.confirm('Şu anki proje bu dersin başlangıç projesi olacak. Kayıt başlasın mı?')) return null;
        return this.run(() => this.props.vm.saveProjectSb3()
            .then(blob => this.api.upload(blob))
            .then(result => {
                this.edit(updateLesson(this.state.draft, {startProject: result.url}), {
                    recording: {baseline: snapshotWorkspace(this.props.vm)},
                    open: false,
                    message: 'Kayıt başladı. Oyunu yap, her adımda "Adımı kaydet"e bas.'
                });
                shiftEditor(false);
            }));
    }
    saveRecordedStep () {
        const recording = this.state.recording;
        if (!recording) return;
        try {
            const result = recordStep(this.props.vm, recording.baseline, {
                paletteOpcodes: readPaletteOpcodes(),
                labels: makeLabeler()
            });
            if (!result.step) {
                this.setState({message: 'Son kayıttan beri blok değişikliği yok.', error: null});
                return;
            }
            const next = appendRecordedStep(this.state.draft, result.step);
            this.edit(next, {
                stepIndex: next.steps.length - 1,
                testResult: null,
                error: null,
                recording: {baseline: result.snapshot},
                message: `Adım ${next.steps.length} kaydedildi. Metni ve ipuçlarını düzenleyebilirsin.`
            });
            this.refreshWorkspace();
        } catch (error) {
            this.setState({error: error.message});
        }
    }
    stopRecording () {
        this.setState({recording: null, message: 'Kayıt bitti. Adımları gözden geçirip Kaydet\'e bas.'});
    }
    importProject (file, chunkSize, autoCheck) {
        const draft = this.state.draft;
        const hasWork = draft.steps.some(step => step.text || step.checks.length > 0 || step.guide.length > 0);
        const question = 'Dersin mevcut adımları ve başlangıç projesi değiştirilecek. Devam edilsin mi?';
        if (hasWork && !window.confirm(question)) return null; // eslint-disable-line no-alert
        return this.run(() => importProjectFile(this.props.vm, file, {
            chunkSize: chunkSize,
            autoCheck: Boolean(autoCheck),
            labels: makeLabeler()
        })
            .then(result => this.api.upload(result.blob).then(upload => {
                let next = updateLesson(draft, {steps: result.steps, startProject: upload.url});
                if (!draft.title) {
                    next = updateLesson(next, {title: result.title});
                    if (this.state.isNew && !this.state.idTouched) {
                        next = updateLesson(next, {id: slugify(result.title)});
                    }
                }
                this.edit(next, {
                    stepIndex: 0,
                    testResult: null,
                    recording: null,
                    message: `${result.steps.length} adım oluşturuldu. Metinleri ve ipuçlarını gözden geçir.`
                });
                this.refreshWorkspace();
            })));
    }
    // ---- yükleme ----
    uploadCover (file) {
        return this.run(() => this.api.upload(file).then(result => this.edit(
            updateLesson(this.state.draft, {cover: result.url})
        )));
    }
    uploadMedia (file) {
        return this.run(() => this.api.upload(file).then(result => this.edit(
            updateStep(this.state.draft, this.state.stepIndex, {media: result.url})
        )));
    }
    useCurrentProject () {
        return this.run(() => this.props.vm.saveProjectSb3()
            .then(blob => this.api.upload(blob))
            .then(result => this.edit(updateLesson(this.state.draft, {startProject: result.url}))));
    }
    clearStartProject () {
        this.edit(updateLesson(this.state.draft, {startProject: null}));
    }
    // ---- çizim ----
    renderBody () {
        const s = this.state;
        if (s.status === 'checking') return <p className={styles.muted}>Denetleniyor…</p>;
        if (s.status === 'login') {
            return (
                <AuthorLogin
                    busy={s.busy}
                    error={s.error}
                    onLogin={this.login}
                />
            );
        }
        if (s.status === 'list') {
            return (
                <AuthorLessonList
                    busy={s.busy}
                    lessons={s.lessons}
                    onDelete={this.deleteLesson}
                    onEdit={this.editLesson}
                    onLogout={this.logout}
                    onMove={this.moveLesson}
                    onNew={this.newLesson}
                    onTogglePublished={this.togglePublished}
                />
            );
        }
        return (
            <div>
                <AuthorImporter
                    busy={s.busy}
                    onImport={this.importProject}
                />
                <AuthorRecorder
                    busy={s.busy}
                    recording={Boolean(s.recording)}
                    onSaveStep={this.saveRecordedStep}
                    onStart={this.startRecording}
                    onStop={this.stopRecording}
                />
                <AuthorLessonForm
                    busy={s.busy}
                    dirty={s.dirty}
                    draft={s.draft}
                    errors={s.errors}
                    isNew={s.isNew}
                    message={s.message}
                    stepIndex={s.stepIndex}
                    onAddStep={this.addStep}
                    onBack={this.back}
                    onChange={this.changeDraft}
                    onChangeId={this.changeId}
                    onClearStartProject={this.clearStartProject}
                    onMoveStep={this.moveStep}
                    onRemoveStep={this.removeStep}
                    onSave={this.save}
                    onSelectStep={this.selectStep}
                    onUploadCover={this.uploadCover}
                    onUseCurrentProject={this.useCurrentProject}
                >
                    <AuthorStepForm
                        busy={s.busy}
                        index={s.stepIndex}
                        paletteOpcodes={s.paletteOpcodes}
                        scripts={s.scripts}
                        step={s.draft.steps[s.stepIndex]}
                        testResult={s.testResult}
                        workspaceOpcodes={s.workspaceOpcodes}
                        onAddOutcome={this.addOutcome}
                        onCapture={this.capture}
                        onChange={this.changeStep}
                        onChangeCheck={this.changeCheck}
                        onRefresh={this.refreshWorkspace}
                        onRemoveCheck={this.removeCheck}
                        onTry={this.tryChecks}
                        onUploadMedia={this.uploadMedia}
                    />
                </AuthorLessonForm>
            </div>
        );
    }
    renderRecordBar () {
        if (!this.state.recording || !this.state.draft) return null;
        return (
            <AuthorRecordBar
                busy={this.state.busy}
                status={this.state.message}
                stepCount={this.state.draft.steps.length}
                onOpenPanel={this.openPanel}
                onSaveStep={this.saveRecordedStep}
                onStop={this.stopRecording}
            />
        );
    }
    render () {
        if (!this.enabled) return null;
        if (!this.state.open) {
            return (
                <React.Fragment>
                    {this.renderRecordBar()}
                    <button
                        className={styles.authorToggle}
                        onClick={this.toggleOpen}
                    >
                        Yönetici
                    </button>
                </React.Fragment>
            );
        }
        return (
            <React.Fragment>
                {this.renderRecordBar()}
                <div className={styles.authorPanel}>
                    <div className={styles.authorHeader}>
                        {this.state.status === 'edit' ? (
                            <button
                                className={styles.button}
                                data-action="to-list"
                                onClick={this.back}
                            >
                                ← Ders listesi
                            </button>
                        ) : null}
                        <span className={styles.authorHeaderTitle}>Ders yönetimi</span>
                        {this.state.status === 'list' ? (
                            <button
                                className={styles.button}
                                data-action="open-lessons"
                                onClick={this.openLessons}
                            >
                                Dersler menüsü
                            </button>
                        ) : null}
                        <button
                            className={styles.button}
                            onClick={this.toggleOpen}
                        >
                            Küçült
                        </button>
                    </div>
                    <div className={styles.authorBody}>
                        {this.state.error && this.state.status !== 'login' ?
                            <div className={styles.error}>{this.state.error}</div> : null}
                        {this.renderBody()}
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

AuthorPanel.propTypes = {
    api: PropTypes.shape({list: PropTypes.func}),
    isAuthorMode: PropTypes.bool,
    onOpenLessons: PropTypes.func,
    vm: PropTypes.shape({runtime: PropTypes.object, saveProjectSb3: PropTypes.func}).isRequired
};

export {
    AuthorPanel as AuthorPanelComponent
};

const mapDispatchToProps = dispatch => ({
    onOpenLessons: () => dispatch(openLessonsLibrary())
});

export default connect(null, mapDispatchToProps)(AuthorPanel);
