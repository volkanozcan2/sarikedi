/**
 * @fileoverview
 * Utility function to detect locale from the browser setting or paramenter on the URL.
 */

import queryString from 'query-string';

/**
 * look for language setting in the browser. Check against supported locales.
 * If there's a parameter in the URL, override the browser setting
 * @param {Array.string} supportedLocales An array of supported locale codes.
 * @return {string} the preferred locale
 */
const detectLocale = supportedLocales => {
    const locale = 'tr'; // default
    // the browser language is ignored on purpose: the default is always Turkish

    const queryParams = queryString.parse(location.search);
    // Flatten potential arrays and remove falsy values
    const potentialLocales = [].concat(queryParams.locale, queryParams.lang).filter(l => l);
    if (!potentialLocales.length) {
        return locale;
    }

    const urlLocale = potentialLocales[0].toLowerCase();
    if (supportedLocales.includes(urlLocale)) {
        return urlLocale;
    }

    return locale;
};

export {
    detectLocale
};
