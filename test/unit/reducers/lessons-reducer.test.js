import lessonsReducer, {
    lessonsInitialState,
    startLoading, lessonLoaded, loadFailed, stepPassed, nextStep, prevStep, toggleExpanded, exitLesson,
    getCurrentStep
} from '../../../src/reducers/lessons';
import modalsReducer, {
    modalsInitialState, openLessonsLibrary, closeLessonsLibrary
} from '../../../src/reducers/modals';

const lesson = () => ({id: 'x', steps: [{text: 'bir'}, {text: 'iki'}, {text: 'üç'}]});

describe('lessons reducer', () => {
    test('başlangıç durumu', () => {
        expect(lessonsReducer(undefined, {type: 'bilinmeyen'})).toEqual(lessonsInitialState);
        expect(lessonsInitialState.status).toBe('idle');
    });

    test('yükleme, yüklendi ve hata', () => {
        let state = lessonsReducer(undefined, startLoading('x'));
        expect(state.status).toBe('loading');
        state = lessonsReducer(state, lessonLoaded(lesson(), 1));
        expect(state).toEqual(expect.objectContaining({status: 'active', stepIndex: 1, passed: false, error: null}));
        state = lessonsReducer(lessonsReducer(undefined, startLoading('x')), loadFailed('Ders bulunamadı'));
        expect(state.status).toBe('idle');
        expect(state.error).toBe('Ders bulunamadı');
        expect(state.lesson).toBeNull();
    });

    test('etkin ders varken (yükleme başlamadan) gelen hata dersi bozmaz', () => {
        const active = lessonsReducer(undefined, lessonLoaded(lesson(), 1));
        const state = lessonsReducer(active, loadFailed('Dersler şu an yüklenemedi'));
        expect(state).toEqual(Object.assign({}, active, {error: 'Dersler şu an yüklenemedi'}));
        expect(state.status).toBe('active');
        expect(state.stepIndex).toBe(1);
    });

    test('başlangıç adımı aralığa sıkıştırılır', () => {
        expect(lessonsReducer(undefined, lessonLoaded(lesson(), 99)).stepIndex).toBe(2);
        expect(lessonsReducer(undefined, lessonLoaded(lesson(), -4)).stepIndex).toBe(0);
    });

    test('adım geçişleri ve tamamlanma', () => {
        let state = lessonsReducer(undefined, lessonLoaded(lesson(), 0));
        state = lessonsReducer(state, stepPassed());
        expect(state.passed).toBe(true);
        state = lessonsReducer(state, nextStep());
        expect(state).toEqual(expect.objectContaining({stepIndex: 1, passed: false, status: 'active'}));
        state = lessonsReducer(state, prevStep());
        expect(state.stepIndex).toBe(0);
        state = lessonsReducer(state, prevStep());
        expect(state.stepIndex).toBe(0);
        state = lessonsReducer(lessonsReducer(state, nextStep()), nextStep());
        expect(state.stepIndex).toBe(2);
        state = lessonsReducer(state, nextStep());
        expect(state.status).toBe('completed');
    });

    test('etkin olmayken adım eylemleri etkisizdir', () => {
        [stepPassed(), nextStep(), prevStep()].forEach(action => {
            expect(lessonsReducer(lessonsInitialState, action)).toEqual(lessonsInitialState);
        });
    });

    test('küçült/büyüt ve çıkış', () => {
        let state = lessonsReducer(undefined, lessonLoaded(lesson(), 0));
        state = lessonsReducer(state, toggleExpanded());
        expect(state.expanded).toBe(false);
        state = lessonsReducer(state, exitLesson());
        expect(state).toEqual(lessonsInitialState);
    });

    test('getCurrentStep yalnızca etkinken adım verir', () => {
        const active = lessonsReducer(undefined, lessonLoaded(lesson(), 1));
        expect(getCurrentStep(active)).toEqual({text: 'iki'});
        expect(getCurrentStep(lessonsInitialState)).toBeNull();
        expect(getCurrentStep(lessonsReducer(active, exitLesson()))).toBeNull();
    });
});

describe('modals reducer: ders galerisi', () => {
    test('açılır ve kapanır', () => {
        expect(modalsInitialState.lessonsLibrary).toBe(false);
        const opened = modalsReducer(modalsInitialState, openLessonsLibrary());
        expect(opened.lessonsLibrary).toBe(true);
        expect(modalsReducer(opened, closeLessonsLibrary()).lessonsLibrary).toBe(false);
    });
});
