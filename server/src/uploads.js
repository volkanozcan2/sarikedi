/**
 * Yüklenen dosyanın türünü İÇERİĞİNDEN (sihirli baytlar) belirler. Dosya adına
 * ve istemcinin bildirdiği türe güvenilmez. SVG/HTML gibi betik taşıyabilen
 * türler bilerek desteklenmez.
 */

const MB = 1024 * 1024;
const IMAGE_MAX = 5 * MB;
const PROJECT_MAX = 20 * MB;
const MIN_LENGTH = 12;

const startsWith = (buffer, bytes, offset = 0) => bytes.every((byte, i) => buffer[offset + i] === byte);

const ascii = text => Array.from(text).map(char => char.charCodeAt(0));

const detectUpload = buffer => {
    if (!Buffer.isBuffer(buffer) || buffer.length < MIN_LENGTH) return null;
    if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return {ext: 'png', maxBytes: IMAGE_MAX};
    if (startsWith(buffer, [0xff, 0xd8, 0xff])) return {ext: 'jpg', maxBytes: IMAGE_MAX};
    if (startsWith(buffer, ascii('GIF87a')) || startsWith(buffer, ascii('GIF89a'))) {
        return {ext: 'gif', maxBytes: IMAGE_MAX};
    }
    if (startsWith(buffer, ascii('RIFF')) && startsWith(buffer, ascii('WEBP'), 8)) {
        return {ext: 'webp', maxBytes: IMAGE_MAX};
    }
    if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return {ext: 'sb3', maxBytes: PROJECT_MAX};
    return null;
};

module.exports = {
    detectUpload
};
