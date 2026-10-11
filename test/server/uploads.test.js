/** @jest-environment node */
const {detectUpload} = require('../../server/src/uploads');

const withPrefix = (bytes, size) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(size || 32)]);
const MB = 1024 * 1024;

describe('detectUpload', () => {
    test('görsel türlerini içerikten tanır', () => {
        expect(detectUpload(withPrefix([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({ext: 'png', maxBytes: 5 * MB});
        expect(detectUpload(withPrefix([0xff, 0xd8, 0xff, 0xe0]))).toEqual({ext: 'jpg', maxBytes: 5 * MB});
        expect(detectUpload(Buffer.from('GIF89a' + '\0'.repeat(20)))).toEqual({ext: 'gif', maxBytes: 5 * MB});
        expect(detectUpload(Buffer.from('GIF87a' + '\0'.repeat(20)))).toEqual({ext: 'gif', maxBytes: 5 * MB});
        expect(detectUpload(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)])))
            .toEqual({ext: 'webp', maxBytes: 5 * MB});
    });

    test('sb3 (zip) tanınır ve daha yüksek sınıra sahiptir', () => {
        expect(detectUpload(withPrefix([0x50, 0x4b, 0x03, 0x04]))).toEqual({ext: 'sb3', maxBytes: 20 * MB});
    });

    test('SVG, HTML, metin, çalıştırılabilir içerik reddedilir', () => {
        ['<svg xmlns="http://www.w3.org/2000/svg"></svg>', '<!doctype html><script>alert(1)</script>',
            '<?xml version="1.0"?><svg/>', 'MZ' + '\0'.repeat(40), '#!/bin/sh\necho hi\n' + 'x'.repeat(20)]
            .forEach(text => expect(detectUpload(Buffer.from(text))).toBeNull());
        expect(detectUpload(Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
    });

    test('RIFF ama WEBP olmayan (wav/avi) reddedilir', () => {
        expect(detectUpload(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(8)])))
            .toBeNull();
    });

    test('çok kısa, boş ve Buffer olmayan girişler null döner', () => {
        [Buffer.alloc(0), Buffer.from([0x89, 0x50, 0x4e, 0x47]), null, undefined, 'metin', {}, 5].forEach(bad => {
            expect(detectUpload(bad)).toBeNull();
        });
    });
});
