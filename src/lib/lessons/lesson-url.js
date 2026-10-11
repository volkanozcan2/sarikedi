import queryString from 'query-string';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * @param {?string} search location.search
 * @return {?string} ?lesson=<id> geçerli bir ders kimliğiyse onu, değilse null
 */
const getLessonIdFromSearch = search => {
    const value = queryString.parse(search || '').lesson;
    return typeof value === 'string' && value.length <= 64 && SLUG.test(value) ? value : null;
};

export {
    getLessonIdFromSearch
};
