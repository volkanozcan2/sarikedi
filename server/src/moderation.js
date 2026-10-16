/**
 * Yorumlar için basit uygunsuz içerik denetimi. Kusursuz değildir: yaygın küfürleri yakalar; geri kalanı için
 * "bildir" düğmesi ve öğretmenin silme yetkisi vardır. Karşılaştırma harf biçimlerinden (ı/i, ş/s...), tekrarlanan
 * harflerden (amkkk) ve sayı/simge ile yazılmış hallerden (s1k, @mk) bağımsızdır.
 */

const MAX_REPEAT = 2;

const LEET = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's'};
const TURKISH = {ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u', ş: 's', Ş: 's', ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g'};

// Tam eşleşen kısa sözcükler
const EXACT = ['amk', 'aq', 'sik', 'sikik', 'siktir', 'sikeyim', 'yarak', 'yarrak', 'ibne', 'gotveren', 'amina', 'fuck',
    'shit', 'bitch', 'cunt', 'asshole'];
// Önek olarak eşleşen uzun kökler (orospunun, siktirgit...)
const PREFIXES = ['orospu', 'siktir', 'pezevenk', 'kahpe', 'gotlek', 'amcik', 'fuck', 'motherfucker'];

const normalize = text => String(text).toLowerCase()
    .split('')
    .map(char => TURKISH[char] || LEET[char] || char)
    .join('');

const collapse = token => token.replace(/(.)\1{2,}/g, '$1'.repeat(MAX_REPEAT));

const isInappropriate = text => {
    const tokens = normalize(text).split(/[^a-z]+/)
        .filter(Boolean)
        .map(collapse);
    return tokens.some(token => {
        const single = token.replace(/(.)\1+/g, '$1');
        return EXACT.indexOf(token) !== -1 || EXACT.indexOf(single) !== -1 ||
            PREFIXES.some(prefix => token.indexOf(prefix) === 0 ||
                single.indexOf(prefix.replace(/(.)\1+/g, '$1')) === 0);
    });
};

module.exports = {isInappropriate};
