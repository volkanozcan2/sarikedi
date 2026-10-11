import projectData from '../../../src/lib/default-project/project-data';
import coolCat from '../../../src/lib/libraries/cool-cat';

describe('Cool Cat kuklası', () => {
    const sprite = projectData().targets.filter(target => !target.isStage)[0];

    test('varsayılan projedeki tek kukla Cool Cat', () => {
        expect(projectData().targets.filter(target => !target.isStage)).toHaveLength(1);
        expect(sprite.name).toBe('Cool Cat');
        expect(sprite.costumes).toHaveLength(1);
        expect(sprite.costumes[0].name).toBe('cool cat');
    });

    test('kostüm bitmap ve md5ext/assetId tutarlı', () => {
        const costume = sprite.costumes[0];
        expect(costume.dataFormat).toBe('png');
        expect(costume.bitmapResolution).toBe(2);
        expect(costume.md5ext).toBe(`${costume.assetId}.png`);
    });

    test('kukla kütüphanesindeki Cool Cat aynı görseli kullanır ve yerel küçük resmi var', () => {
        expect(coolCat.name).toBe('Cool Cat');
        expect(coolCat.costumes[0].assetId).toBe(sprite.costumes[0].assetId);
        expect(typeof coolCat.rawURL).toBe('string');
        expect(coolCat.rawURL.length).toBeGreaterThan(0);
    });
});
