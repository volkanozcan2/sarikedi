import modalReducer, {
    modalsInitialState, openAboutModal, closeAboutModal, openLessonsLibrary
} from '../../../src/reducers/modals';

describe('about modal reducer', () => {
    test('starts closed', () => {
        expect(modalsInitialState.aboutModal).toBe(false);
    });
    test('opens and closes', () => {
        const opened = modalReducer(modalsInitialState, openAboutModal());
        expect(opened.aboutModal).toBe(true);
        expect(modalReducer(opened, closeAboutModal()).aboutModal).toBe(false);
    });
    test('opening the lessons library does not leave about open', () => {
        const opened = modalReducer(modalsInitialState, openAboutModal());
        const next = modalReducer(modalReducer(opened, closeAboutModal()), openLessonsLibrary());
        expect(next.aboutModal).toBe(false);
        expect(next.lessonsLibrary).toBe(true);
    });
});
