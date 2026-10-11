/**
 * @fileoverview
 * Bir dersi başlatma akışı: dersi indir, gerekirse onay al ve başlangıç
 * projesini yükle, kayıtlı ilerlemeden devam et. Bağımlılıklar enjekte edilir,
 * böylece redux ve VM olmadan test edilebilir. Hiçbir koşulda reddetmez.
 *
 * `actions.loading` yalnızca ders indirildikten ve (varsa) proje değişimi
 * onaylandıktan sonra çağrılır: indirme hatası ya da onayın reddedilmesi o an
 * açık olan dersi bozmaz.
 */

const DEFAULT_ERROR = 'Ders başlatılamadı';

const startLesson = ({id, api, progress, loadProject, confirmReplace, actions}) => api.getLesson(id)
    .then(lesson => {
        const saved = progress.get(id);
        const stepIndex = saved.done ? 0 : saved.step;
        if (!lesson.startProject) {
            actions.loading(id);
            return {lesson: lesson, stepIndex: stepIndex};
        }
        if (!confirmReplace()) return null;
        actions.loading(id);
        return loadProject(lesson.startProject).then(() => ({lesson: lesson, stepIndex: stepIndex}));
    })
    .then(result => {
        if (result) {
            actions.loaded(result.lesson, result.stepIndex);
        } else {
            actions.cancelled();
        }
    })
    .catch(error => {
        actions.failed(error && error.message ? error.message : DEFAULT_ERROR);
    });

export {
    startLesson
};
