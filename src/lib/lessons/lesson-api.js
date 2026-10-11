/**
 * @fileoverview
 * Ders listesi ve derslerin alınması. Sunucudan gelen her şey doğrulanır.
 */

import queryString from 'query-string';
import {LEVELS, isSafeUrl, validateLesson} from './schema';
import {SAMPLE_LESSONS} from './sample-lessons';

const isSampleMode = search => queryString.parse(search || '').lessons === 'sample';

const byOrder = (a, b) => a.order - b.order;

const summarize = lesson => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    level: lesson.level,
    cover: lesson.cover || null,
    order: lesson.order,
    stepCount: lesson.steps.length
});

const isSummary = item => item !== null && typeof item === 'object' &&
    typeof item.id === 'string' && typeof item.title === 'string' &&
    LEVELS.indexOf(item.level) !== -1 && Number.isInteger(item.stepCount) &&
    Number.isInteger(item.order);

const cleanSummary = item => ({
    id: item.id,
    title: item.title,
    description: typeof item.description === 'string' ? item.description : '',
    level: item.level,
    cover: isSafeUrl(item.cover) ? item.cover : null,
    order: item.order,
    stepCount: item.stepCount
});

const createLessonApi = ({fetchFn, baseUrl = '/api', sample = false} = {}) => {
    const getJson = path => fetchFn(`${baseUrl}${path}`)
        .catch(() => {
            throw new Error('Dersler şu an yüklenemedi');
        })
        .then(response => {
            if (!response.ok) throw new Error(`Dersler yüklenemedi (${response.status})`);
            return response.json();
        });

    if (sample) {
        return {
            listLessons: () => Promise.resolve(SAMPLE_LESSONS.map(summarize).sort(byOrder)),
            getLesson: id => {
                const found = SAMPLE_LESSONS.filter(lesson => lesson.id === id)[0];
                return found ? Promise.resolve(found) : Promise.reject(new Error('Ders bulunamadı'));
            }
        };
    }

    return {
        listLessons: () => getJson('/lessons').then(list => {
            if (!Array.isArray(list)) throw new Error('Ders listesi geçersiz');
            return list
                .filter(isSummary)
                .map(cleanSummary)
                .sort(byOrder);
        }),
        getLesson: id => getJson(`/lessons/${encodeURIComponent(id)}`).then(lesson => {
            const result = validateLesson(lesson);
            if (!result.valid) throw new Error(`Ders verisi geçersiz: ${result.errors[0]}`);
            return lesson;
        })
    };
};

export {
    isSampleMode,
    createLessonApi
};
