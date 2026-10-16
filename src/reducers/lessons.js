/**
 * Rehberli dersler: öğretmenin kayıt / düzenleme akışı ve öğrencinin oynattığı ders.
 * mode: null | 'recording' (kayıt şeridi açık) | 'editing' (adım düzenleyici açık) | 'playing' (öğrenci dersi)
 */
const START_RECORDING = 'scratch-gui/lessons/START_RECORDING';
const FINISH_RECORDING = 'scratch-gui/lessons/FINISH_RECORDING';
const RESUME_RECORDING = 'scratch-gui/lessons/RESUME_RECORDING';
const EDIT_LESSON = 'scratch-gui/lessons/EDIT_LESSON';
const PLAY_LESSON = 'scratch-gui/lessons/PLAY_LESSON';
const CLOSE_LESSON = 'scratch-gui/lessons/CLOSE_LESSON';

const initialState = {
    mode: null,
    // kaydedilen ya da düzenlenen ders: {id?, title, description, classId, steps}
    draft: null,
    // kaydın başladığı andaki proje (Blob); yeni derste başlangıç projesi olarak yüklenir
    startProject: null,
    // öğrencinin oynattığı ders (adımlarıyla)
    lesson: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case START_RECORDING:
        return Object.assign({}, initialState, {
            mode: 'recording',
            startProject: action.startProject,
            draft: {title: '', description: '', classId: null, steps: []}
        });
    case FINISH_RECORDING:
        return Object.assign({}, state, {
            mode: 'editing', draft: Object.assign({}, state.draft, {steps: action.steps})
        });
    case RESUME_RECORDING:
        return Object.assign({}, state, {mode: 'recording', draft: Object.assign({}, state.draft, action.draft)});
    case EDIT_LESSON:
        return Object.assign({}, initialState, {mode: 'editing', draft: action.lesson});
    case PLAY_LESSON:
        return Object.assign({}, initialState, {mode: 'playing', lesson: action.lesson});
    case CLOSE_LESSON:
        return initialState;
    default:
        return state;
    }
};

const startRecording = startProject => ({type: START_RECORDING, startProject: startProject});
const finishRecording = steps => ({type: FINISH_RECORDING, steps: steps});
// düzenleyicideki başlık/açıklama gibi alanlar korunarak kayda dönülür
const resumeRecording = draft => ({type: RESUME_RECORDING, draft: draft});
const editLesson = lesson => ({type: EDIT_LESSON, lesson: lesson});
const playLesson = lesson => ({type: PLAY_LESSON, lesson: lesson});
const closeLesson = () => ({type: CLOSE_LESSON});

export {
    reducer as default,
    initialState as lessonsInitialState,
    startRecording,
    finishRecording,
    resumeRecording,
    editLesson,
    playLesson,
    closeLesson
};
