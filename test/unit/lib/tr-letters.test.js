import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sprites from '../../../src/lib/libraries/sprites.json';
import assetIds from '../../../src/lib/libraries/tr-letter-assets.json';
import storage from '../../../src/lib/storage';

const STYLES = ['Block', 'Glow', 'Story'];
const LETTERS = ['Ç', 'Ğ', 'İ', 'Ö', 'Ş', 'Ü'];
const dir = path.join(__dirname, '../../../static/tr-letters');

describe('Türkçe harf kuklaları', () => {
    test('her stil için 6 Türkçe harf kuklası kütüphanede var', () => {
        STYLES.forEach(style => LETTERS.forEach(letter => {
            const sprite = sprites.find(s => s.name === `${style}-${letter}`);
            expect(sprite).toBeTruthy();
            expect(sprite.tags).toEqual(['alphabet', 'letters']);
            expect(sprite.costumes).toHaveLength(1);
            expect(sprite.costumes[0].dataFormat).toBe('svg');
        }));
    });

    test('her kuklanın SVG dosyası static/tr-letters içinde, adı içeriğinin md5\'i ve geçerli SVG', () => {
        STYLES.forEach(style => LETTERS.forEach(letter => {
            const costume = sprites.find(s => s.name === `${style}-${letter}`).costumes[0];
            const file = path.join(dir, costume.md5ext);
            expect(fs.existsSync(file)).toBe(true);
            const data = fs.readFileSync(file);
            expect(crypto.createHash('md5').update(data).digest('hex')).toBe(costume.assetId);
            expect(data.toString('utf8')).toContain('<svg');
            expect(sprites.find(s => s.name === `${style}-${letter}`).rawURL).toBe(`static/tr-letters/${costume.md5ext}`);
        }));
    });

    test('her stilin Z harfinden hemen sonra gelirler ve harf listesi tutarlı', () => {
        STYLES.forEach(style => {
            const index = sprites.findIndex(s => s.name === `${style}-Z`);
            expect(sprites.slice(index + 1, index + 7).map(s => s.name))
                .toEqual(LETTERS.map(l => `${style}-${l}`));
        });
        expect(assetIds).toHaveLength(18);
    });

    test('depolama yalnızca bu varlıkları yerel yoldan yükler, diğerlerini CDN\'e bırakır', () => {
        const id = assetIds[0];
        expect(storage.getTurkishLetterConfig({assetId: id, dataFormat: 'svg'}).endsWith(`static/tr-letters/${id}.svg`))
            .toBe(true);
        expect(storage.getTurkishLetterConfig({assetId: 'f'.repeat(32), dataFormat: 'svg'})).toBe(false);
    });
});
