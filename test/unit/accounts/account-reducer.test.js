import accountReducer, {accountInitialState, setAccount, clearAccount, setCloudProject} from '../../../src/reducers/account';
import modalReducer, {
    modalsInitialState, openLoginModal, closeLoginModal, openRegisterModal, closeRegisterModal,
    openTeacherPanel, closeTeacherPanel, openSaveProject, closeSaveProject, openMyProjects, closeMyProjects,
    openSharedGallery, closeSharedGallery, openQuickShare, closeQuickShare
} from '../../../src/reducers/modals';

describe('account reducer', () => {
    test('başlangıçta kullanıcı yok ve henüz yüklenmedi', () => {
        expect(accountInitialState).toEqual({user: null, loaded: false, cloudProject: null});
        expect(accountReducer(undefined, {type: 'x'})).toEqual(accountInitialState);
    });

    test('setAccount kullanıcıyı koyar ve yüklendi sayar; null verilirse çıkış', () => {
        const user = {id: 1, role: 'student', username: 'Pamuk'};
        const state = accountReducer(accountInitialState, setAccount(user));
        expect(state).toEqual({user: user, loaded: true, cloudProject: null});
        expect(accountReducer(state, setAccount(null))).toEqual({user: null, loaded: true, cloudProject: null});
    });

    test('açık hesap projesi kaydedilir; çıkış ya da yeni giriş onu temizler', () => {
        const project = {id: 4, title: 'Yıldız oyunum'};
        let state = accountReducer(accountInitialState, setCloudProject(project));
        expect(state.cloudProject).toEqual(project);
        expect(accountReducer(state, clearAccount()).cloudProject).toBeNull();
        expect(accountReducer(state, setAccount({id: 2})).cloudProject).toBeNull();
        state = accountReducer(state, setCloudProject(null));
        expect(state.cloudProject).toBeNull();
    });

    test('clearAccount çıkış yapar', () => {
        const state = accountReducer({user: {id: 1}, loaded: true}, clearAccount());
        expect(state.user).toBeNull();
    });
});

describe('hesap pencereleri', () => {
    test('giriş, kayıt ve öğretmen paneli açılır/kapanır; başlangıçta kapalı', () => {
        expect(modalsInitialState.accountLogin).toBe(false);
        expect(modalsInitialState.accountRegister).toBe(false);
        expect(modalsInitialState.teacherPanel).toBe(false);
        let state = modalReducer(modalsInitialState, openLoginModal());
        expect(state.accountLogin).toBe(true);
        state = modalReducer(state, closeLoginModal());
        expect(state.accountLogin).toBe(false);
        state = modalReducer(state, openRegisterModal());
        expect(state.accountRegister).toBe(true);
        state = modalReducer(state, closeRegisterModal());
        state = modalReducer(state, openTeacherPanel());
        expect(state.teacherPanel).toBe(true);
        expect(modalReducer(state, closeTeacherPanel()).teacherPanel).toBe(false);
        state = modalReducer(modalsInitialState, openSaveProject());
        expect(state.saveProject).toBe(true);
        expect(modalReducer(state, closeSaveProject()).saveProject).toBe(false);
        state = modalReducer(modalsInitialState, openMyProjects());
        expect(state.myProjects).toBe(true);
        expect(modalReducer(state, closeMyProjects()).myProjects).toBe(false);
        state = modalReducer(modalsInitialState, openSharedGallery());
        expect(state.sharedGallery).toBe(true);
        expect(modalReducer(state, closeSharedGallery()).sharedGallery).toBe(false);
        state = modalReducer(modalsInitialState, openQuickShare());
        expect(state.quickShare).toBe(true);
        expect(modalReducer(state, closeQuickShare()).quickShare).toBe(false);
    });
});
