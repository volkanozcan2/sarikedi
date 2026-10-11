import {startLesson} from '../../../src/lib/lessons/start-lesson';

const setup = overrides => {
    const calls = [];
    const lesson = {id: 'ilk-ders', steps: [{}, {}, {}], startProject: null};
    const deps = Object.assign({
        id: 'ilk-ders',
        api: {getLesson: () => Promise.resolve(lesson)},
        progress: {get: () => ({step: 0, done: false})},
        loadProject: url => {
            calls.push(['load', url]);
            return Promise.resolve();
        },
        confirmReplace: () => {
            calls.push(['confirm']);
            return true;
        },
        actions: {
            loading: id => calls.push(['loading', id]),
            loaded: (l, i) => calls.push(['loaded', l.id, i]),
            failed: m => calls.push(['failed', m]),
            cancelled: () => calls.push(['cancelled'])
        }
    }, overrides);
    return {deps, calls, lesson};
};

describe('startLesson', () => {
    test('başlangıç projesi olmayan ders kayıtlı adımdan başlar', () => {
        const {deps, calls} = setup({progress: {get: () => ({step: 2, done: false})}});
        return startLesson(deps).then(() => {
            expect(calls).toEqual([['loading', 'ilk-ders'], ['loaded', 'ilk-ders', 2]]);
        });
    });

    test('tamamlanmış ders baştan başlar', () => {
        const {deps, calls} = setup({progress: {get: () => ({step: 3, done: true})}});
        return startLesson(deps).then(() => {
            expect(calls[1]).toEqual(['loaded', 'ilk-ders', 0]);
        });
    });

    test('başlangıç projesi: onaylanırsa yüklenir', () => {
        const lesson = {id: 'ilk-ders', steps: [{}], startProject: '/uploads/a.sb3'};
        const {deps, calls} = setup({api: {getLesson: () => Promise.resolve(lesson)}});
        return startLesson(deps).then(() => {
            expect(calls).toEqual([
                ['confirm'], ['loading', 'ilk-ders'], ['load', '/uploads/a.sb3'], ['loaded', 'ilk-ders', 0]
            ]);
        });
    });

    test('başlangıç projesi: onaylanmazsa iptal edilir, proje yüklenmez', () => {
        const lesson = {id: 'ilk-ders', steps: [{}], startProject: '/uploads/a.sb3'};
        const {deps, calls} = setup({
            api: {getLesson: () => Promise.resolve(lesson)},
            confirmReplace: () => false
        });
        return startLesson(deps).then(() => {
            expect(calls).toEqual([['cancelled']]);
        });
    });

    test('ders alınamazsa failed, reddetmez ve yükleme durumuna hiç geçilmez', () => {
        const {deps, calls} = setup({api: {getLesson: () => Promise.reject(new Error('Ders bulunamadı'))}});
        return startLesson(deps).then(() => {
            expect(calls).toEqual([['failed', 'Ders bulunamadı']]);
        });
    });

    test('proje yüklenemezse failed', () => {
        const lesson = {id: 'ilk-ders', steps: [{}], startProject: '/uploads/a.sb3'};
        const {deps, calls} = setup({
            api: {getLesson: () => Promise.resolve(lesson)},
            loadProject: () => Promise.reject(new Error('Başlangıç projesi indirilemedi'))
        });
        return startLesson(deps).then(() => {
            expect(calls[calls.length - 1]).toEqual(['failed', 'Başlangıç projesi indirilemedi']);
        });
    });

    test('mesajsız hata için varsayılan mesaj', () => {
        const {deps, calls} = setup({api: {getLesson: () => Promise.reject(null)}});
        return startLesson(deps).then(() => {
            expect(calls[0]).toEqual(['failed', 'Ders başlatılamadı']);
        });
    });
});
