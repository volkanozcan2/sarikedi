import queryString from 'query-string';

/**
 * @param {?string} search location.search
 * @return {boolean} yönetim paneli modu (?author) açık mı
 */
const isAuthorMode = search => Object.prototype.hasOwnProperty.call(queryString.parse(search || ''), 'author');

export {
    isAuthorMode
};
