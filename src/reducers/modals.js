const OPEN_MODAL = 'scratch-gui/modals/OPEN_MODAL';
const CLOSE_MODAL = 'scratch-gui/modals/CLOSE_MODAL';

const MODAL_BACKDROP_LIBRARY = 'backdropLibrary';
const MODAL_COSTUME_LIBRARY = 'costumeLibrary';
const MODAL_DEBUG = 'debugModal';
const MODAL_EXTENSION_LIBRARY = 'extensionLibrary';
const MODAL_LOADING_PROJECT = 'loadingProject';
const MODAL_TELEMETRY = 'telemetryModal';
const MODAL_SOUND_LIBRARY = 'soundLibrary';
const MODAL_SPRITE_LIBRARY = 'spriteLibrary';
const MODAL_SOUND_RECORDER = 'soundRecorder';
const MODAL_CONNECTION = 'connectionModal';
const MODAL_TIPS_LIBRARY = 'tipsLibrary';
const MODAL_ABOUT = 'aboutModal';
const MODAL_ACCOUNT_LOGIN = 'accountLogin';
const MODAL_ACCOUNT_REGISTER = 'accountRegister';
const MODAL_TEACHER_PANEL = 'teacherPanel';
const MODAL_SAVE_PROJECT = 'saveProject';
const MODAL_MY_PROJECTS = 'myProjects';
const MODAL_SHARED_GALLERY = 'sharedGallery';
const MODAL_QUICK_SHARE = 'quickShare';
const MODAL_LESSONS = 'lessonsGallery';

const initialState = {
    [MODAL_BACKDROP_LIBRARY]: false,
    [MODAL_COSTUME_LIBRARY]: false,
    [MODAL_DEBUG]: false,
    [MODAL_EXTENSION_LIBRARY]: false,
    [MODAL_LOADING_PROJECT]: false,
    [MODAL_TELEMETRY]: false,
    [MODAL_SOUND_LIBRARY]: false,
    [MODAL_SPRITE_LIBRARY]: false,
    [MODAL_SOUND_RECORDER]: false,
    [MODAL_CONNECTION]: false,
    [MODAL_TIPS_LIBRARY]: false,
    [MODAL_ABOUT]: false,
    [MODAL_ACCOUNT_LOGIN]: false,
    [MODAL_ACCOUNT_REGISTER]: false,
    [MODAL_TEACHER_PANEL]: false,
    [MODAL_SAVE_PROJECT]: false,
    [MODAL_MY_PROJECTS]: false,
    [MODAL_SHARED_GALLERY]: false,
    [MODAL_QUICK_SHARE]: false,
    [MODAL_LESSONS]: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case OPEN_MODAL:
        return Object.assign({}, state, {
            [action.modal]: true
        });
    case CLOSE_MODAL:
        return Object.assign({}, state, {
            [action.modal]: false
        });
    default:
        return state;
    }
};
const openModal = function (modal) {
    return {
        type: OPEN_MODAL,
        modal: modal
    };
};
const closeModal = function (modal) {
    return {
        type: CLOSE_MODAL,
        modal: modal
    };
};
const openBackdropLibrary = function () {
    return openModal(MODAL_BACKDROP_LIBRARY);
};
const openCostumeLibrary = function () {
    return openModal(MODAL_COSTUME_LIBRARY);
};
const openDebugModal = function () {
    return openModal(MODAL_DEBUG);
};
const openExtensionLibrary = function () {
    return openModal(MODAL_EXTENSION_LIBRARY);
};
const openLoadingProject = function () {
    return openModal(MODAL_LOADING_PROJECT);
};
const openTelemetryModal = function () {
    return openModal(MODAL_TELEMETRY);
};
const openSoundLibrary = function () {
    return openModal(MODAL_SOUND_LIBRARY);
};
const openSpriteLibrary = function () {
    return openModal(MODAL_SPRITE_LIBRARY);
};
const openSoundRecorder = function () {
    return openModal(MODAL_SOUND_RECORDER);
};
const openConnectionModal = function () {
    return openModal(MODAL_CONNECTION);
};
const openTipsLibrary = function () {
    return openModal(MODAL_TIPS_LIBRARY);
};
const closeBackdropLibrary = function () {
    return closeModal(MODAL_BACKDROP_LIBRARY);
};
const closeCostumeLibrary = function () {
    return closeModal(MODAL_COSTUME_LIBRARY);
};
const closeDebugModal = function () {
    return closeModal(MODAL_DEBUG);
};
const closeExtensionLibrary = function () {
    return closeModal(MODAL_EXTENSION_LIBRARY);
};
const closeLoadingProject = function () {
    return closeModal(MODAL_LOADING_PROJECT);
};
const closeTelemetryModal = function () {
    return closeModal(MODAL_TELEMETRY);
};
const closeSpriteLibrary = function () {
    return closeModal(MODAL_SPRITE_LIBRARY);
};
const closeSoundLibrary = function () {
    return closeModal(MODAL_SOUND_LIBRARY);
};
const closeSoundRecorder = function () {
    return closeModal(MODAL_SOUND_RECORDER);
};
const closeTipsLibrary = function () {
    return closeModal(MODAL_TIPS_LIBRARY);
};
const openAboutModal = function () {
    return openModal(MODAL_ABOUT);
};
const closeAboutModal = function () {
    return closeModal(MODAL_ABOUT);
};
const openLoginModal = function () {
    return openModal(MODAL_ACCOUNT_LOGIN);
};
const closeLoginModal = function () {
    return closeModal(MODAL_ACCOUNT_LOGIN);
};
const openRegisterModal = function () {
    return openModal(MODAL_ACCOUNT_REGISTER);
};
const closeRegisterModal = function () {
    return closeModal(MODAL_ACCOUNT_REGISTER);
};
const openTeacherPanel = function () {
    return openModal(MODAL_TEACHER_PANEL);
};
const closeTeacherPanel = function () {
    return closeModal(MODAL_TEACHER_PANEL);
};
const openSaveProject = function () {
    return openModal(MODAL_SAVE_PROJECT);
};
const closeSaveProject = function () {
    return closeModal(MODAL_SAVE_PROJECT);
};
const openMyProjects = function () {
    return openModal(MODAL_MY_PROJECTS);
};
const closeMyProjects = function () {
    return closeModal(MODAL_MY_PROJECTS);
};
const openSharedGallery = function () {
    return openModal(MODAL_SHARED_GALLERY);
};
const closeSharedGallery = function () {
    return closeModal(MODAL_SHARED_GALLERY);
};
const openQuickShare = function () {
    return openModal(MODAL_QUICK_SHARE);
};
const closeQuickShare = function () {
    return closeModal(MODAL_QUICK_SHARE);
};
const openLessonsGallery = function () {
    return openModal(MODAL_LESSONS);
};
const closeLessonsGallery = function () {
    return closeModal(MODAL_LESSONS);
};
const closeConnectionModal = function () {
    return closeModal(MODAL_CONNECTION);
};
export {
    reducer as default,
    initialState as modalsInitialState,
    openBackdropLibrary,
    openCostumeLibrary,
    openDebugModal,
    openExtensionLibrary,
    openLoadingProject,
    openSoundLibrary,
    openSpriteLibrary,
    openSoundRecorder,
    openTelemetryModal,
    openTipsLibrary,
    openConnectionModal,
    openAboutModal,
    openLoginModal,
    openRegisterModal,
    openTeacherPanel,
    openSaveProject,
    openMyProjects,
    openSharedGallery,
    openQuickShare,
    openLessonsGallery,
    closeLessonsGallery,
    closeBackdropLibrary,
    closeCostumeLibrary,
    closeDebugModal,
    closeExtensionLibrary,
    closeLoadingProject,
    closeSpriteLibrary,
    closeSoundLibrary,
    closeSoundRecorder,
    closeTelemetryModal,
    closeTipsLibrary,
    closeConnectionModal,
    closeAboutModal,
    closeLoginModal,
    closeRegisterModal,
    closeTeacherPanel,
    closeSaveProject,
    closeMyProjects,
    closeSharedGallery,
    closeQuickShare
};
