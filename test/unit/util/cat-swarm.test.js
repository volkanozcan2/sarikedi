import {createCats, stepCat} from '../../../src/lib/cat-swarm';

const constantRandom = value => () => value;

describe('createCats', () => {
    test('istenen sayıda kedi, alan ve sınırlar içinde, hızlı ve dönen', () => {
        const cats = createCats(30, 1000, 600, Math.random);
        expect(cats).toHaveLength(30);
        cats.forEach(cat => {
            expect(cat.x).toBeGreaterThanOrEqual(0);
            expect(cat.x).toBeLessThanOrEqual(1000 - cat.size);
            expect(cat.y).toBeGreaterThanOrEqual(0);
            expect(cat.y).toBeLessThanOrEqual(600 - cat.size);
            expect(cat.size).toBeGreaterThanOrEqual(40);
            expect(Math.hypot(cat.vx, cat.vy)).toBeGreaterThan(100);
            expect(cat.spin).not.toBe(0);
        });
    });

    test('rastgele kaynağı kullanır (aynı değer → aynı kedi)', () => {
        const cats = createCats(2, 800, 500, constantRandom(0.5));
        expect(cats[0]).toEqual(cats[1]);
    });
});

describe('stepCat', () => {
    const cat = overrides => Object.assign({x: 100, y: 100, vx: 200, vy: -100, size: 50, angle: 0, spin: 90}, overrides);

    test('hız ve dönüşü süreyle ilerletir', () => {
        const next = stepCat(cat(), 800, 600, 0.5);
        expect(next.x).toBeCloseTo(200);
        expect(next.y).toBeCloseTo(50);
        expect(next.angle).toBeCloseTo(45);
    });

    test('kenarlardan seker (hız yönü döner, içeride kalır)', () => {
        const right = stepCat(cat({x: 740, vx: 400}), 800, 600, 0.5);
        expect(right.x).toBeLessThanOrEqual(750);
        expect(right.vx).toBeLessThan(0);
        const left = stepCat(cat({x: 10, vx: -400}), 800, 600, 0.5);
        expect(left.x).toBeGreaterThanOrEqual(0);
        expect(left.vx).toBeGreaterThan(0);
        const top = stepCat(cat({y: 10, vy: -400}), 800, 600, 0.5);
        expect(top.y).toBeGreaterThanOrEqual(0);
        expect(top.vy).toBeGreaterThan(0);
        const bottom = stepCat(cat({y: 540, vy: 400}), 800, 600, 0.5);
        expect(bottom.y).toBeLessThanOrEqual(550);
        expect(bottom.vy).toBeLessThan(0);
    });

    test('girdiyi değiştirmez', () => {
        const original = cat();
        stepCat(original, 800, 600, 0.5);
        expect(original.x).toBe(100);
    });
});
