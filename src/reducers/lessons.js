const START_LOADING = 'scratch-gui/lessons/START_LOADING';
const LESSON_LOADED = 'scratch-gui/lessons/LESSON_LOADED';
const LOAD_FAILED = 'scratch-gui/lessons/LOAD_FAILED';
const STEP_PASSED = 'scratch-gui/lessons/STEP_PASSED';
const NEXT_STEP = 'scratch-gui/lessons/NEXT_STEP';
const PREV_STEP = 'scratch-gui/lessons/PREV_STEP';
const TOGGLE_EXPANDED = 'scratch-gui/lessons/TOGGLE_EXPANDED';
const EXIT_LESSON = 'scratch-gui/lessons/EXIT_LESSON';

const initialState = {
    status: 'idle',
    lesson: null,
    stepIndex: 0,
    passed: false,
    expanded: true,
    error: null
};

const clamp = (value, max) => Math.max(0, Math.min(value, max));

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case START_LOADING:
        return Object.assign({}, initialState, {status: 'loading'});
    case LESSON_LOADED:
        return Object.assign({}, initialState, {
            status: 'active',
            lesson: action.lesson,
            stepIndex: clamp(action.stepIndex, action.lesson.steps.length - 1)
        });
    case LOAD_FAILED:
        // yükleme başlamadan (ders indirilemedi) gelen hata açık dersi bozmaz
        if (state.status === 'loading') return Object.assign({}, initialState, {error: action.message});
        return Object.assign({}, state, {error: action.message});
    case STEP_PASSED:
        return state.status === 'active' ? Object.assign({}, state, {passed: true}) : state;
    case NEXT_STEP:
        if (state.status !== 'active') return state;
        if (state.stepIndex + 1 >= state.lesson.steps.length) {
            return Object.assign({}, state, {status: 'completed', passed: false});
        }
        return Object.assign({}, state, {stepIndex: state.stepIndex + 1, passed: false});
    case PREV_STEP:
        if (state.status !== 'active' || state.stepIndex === 0) return state;
        return Object.assign({}, state, {stepIndex: state.stepIndex - 1, passed: false});
    case TOGGLE_EXPANDED:
        return Object.assign({}, state, {expanded: !state.expanded});
    case EXIT_LESSON:
        return initialState;
    default:
        return state;
    }
};

const startLoading = lessonId => ({type: START_LOADING, lessonId: lessonId});
const lessonLoaded = (lesson, stepIndex) => ({type: LESSON_LOADED, lesson: lesson, stepIndex: stepIndex});
const loadFailed = message => ({type: LOAD_FAILED, message: message});
const stepPassed = () => ({type: STEP_PASSED});
const nextStep = () => ({type: NEXT_STEP});
const prevStep = () => ({type: PREV_STEP});
const toggleExpanded = () => ({type: TOGGLE_EXPANDED});
const exitLesson = () => ({type: EXIT_LESSON});

const getCurrentStep = state => (
    state.status === 'active' && state.lesson ? state.lesson.steps[state.stepIndex] : null
);

export {
    reducer as default,
    initialState as lessonsInitialState,
    startLoading,
    lessonLoaded,
    loadFailed,
    stepPassed,
    nextStep,
    prevStep,
    toggleExpanded,
    exitLesson,
    getCurrentStep
};
