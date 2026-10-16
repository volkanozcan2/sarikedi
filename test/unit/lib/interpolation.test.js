import {Interpolator} from '../../../src/lib/interpolation';

const makeDrawable = (x, y, d, s) => ({
    _position: [x, y],
    _direction: d,
    _scale: [s, s],
    setTransformDirty: jest.fn()
});

const setup = () => {
    const drawable = makeDrawable(0, 0, 90, 100);
    const seen = [];
    const renderer = {
        _allDrawables: [undefined, drawable],
        draw: jest.fn(() => seen.push({x: drawable._position[0], d: drawable._direction, s: drawable._scale[0]}))
    };
    const runtime = {
        compatibilityMode: true,
        renderer: renderer,
        _step: jest.fn(() => renderer.draw())
    };
    const clock = {t: 0, frame: null};
    const env = {
        now: () => clock.t,
        raf: cb => {
            clock.frame = cb;
            return 1;
        },
        caf: jest.fn(() => {
            clock.frame = null;
        })
    };
    const interpolator = new Interpolator({runtime: runtime}, env);
    const tick = (time, x, d, s) => {
        clock.t = time;
        drawable._position[0] = x;
        if (d !== undefined) drawable._direction = d;
        if (s !== undefined) drawable._scale = [s, s];
        runtime._step();
    };
    const frame = time => {
        clock.t = time;
        const cb = clock.frame;
        clock.frame = null;
        cb(time);
    };
    return {drawable, renderer, runtime, interpolator, seen, tick, frame, clock, env};
};

describe('Interpolator', () => {
    test('kapalıyken hiçbir şeye dokunmaz', () => {
        const {runtime, renderer} = setup();
        const originalStep = runtime._step;
        const originalDraw = renderer.draw;
        expect(runtime._step).toBe(originalStep);
        expect(renderer.draw).toBe(originalDraw);
    });

    test('iki adım arasında konumu doğrusal ara değerle çizer', () => {
        const s = setup();
        s.interpolator.enable();
        s.tick(100, 0);
        s.tick(133, 100);
        // adım anında bir önceki adım (t=0) çizilir
        expect(s.seen[s.seen.length - 1].x).toBe(0);
        s.frame(149.5); // (149.5 - 133) / 33 = 0.5
        expect(s.seen[s.seen.length - 1].x).toBeCloseTo(50, 5);
        s.frame(166);
        expect(s.seen[s.seen.length - 1].x).toBeCloseTo(100, 5);
    });

    test('çizimden sonra gerçek değerler geri konur', () => {
        const s = setup();
        s.interpolator.enable();
        s.tick(100, 0);
        s.tick(133, 100);
        s.frame(149.5);
        expect(s.drawable._position[0]).toBe(100);
        expect(s.drawable.setTransformDirty).toHaveBeenCalled();
    });

    test('yön en kısa yoldan ara değer alır (350° → 10°)', () => {
        const s = setup();
        s.interpolator.enable();
        s.tick(100, 0, 350);
        s.tick(133, 0, 10);
        s.frame(149.5);
        const direction = s.seen[s.seen.length - 1].d;
        expect(((direction % 360) + 360) % 360).toBeCloseTo(0, 5);
    });

    test('boyut ara değer alır', () => {
        const s = setup();
        s.interpolator.enable();
        s.tick(100, 0, 90, 100);
        s.tick(133, 0, 90, 200);
        s.frame(149.5);
        expect(s.seen[s.seen.length - 1].s).toBeCloseTo(150, 5);
    });

    test('adım dışında (ör. sürükleyerek) değişen kukla ara değerlenmez', () => {
        const s = setup();
        s.interpolator.enable();
        s.tick(100, 0);
        s.tick(133, 100);
        s.drawable._position[0] = 500; // editörde sürüklendi
        s.frame(149.5);
        expect(s.seen[s.seen.length - 1].x).toBe(500);
    });

    test('60 FPS (uyumluluk modu kapalı) iken ara değer yapılmaz', () => {
        const s = setup();
        s.runtime.compatibilityMode = false;
        s.interpolator.enable();
        s.tick(100, 0);
        s.tick(116, 100);
        expect(s.seen[s.seen.length - 1].x).toBe(100);
    });

    test('kapatınca orijinal fonksiyonlar geri gelir ve çerçeve döngüsü durur', () => {
        const s = setup();
        const originalStep = s.runtime._step;
        const originalDraw = s.renderer.draw;
        s.interpolator.enable();
        expect(s.runtime._step).not.toBe(originalStep);
        s.interpolator.disable();
        expect(s.runtime._step).toBe(originalStep);
        expect(s.renderer.draw).toBe(originalDraw);
        expect(s.env.caf).toHaveBeenCalled();
    });

    test('yeni oluşan kukla (önceki durumu yok) olduğu gibi çizilir', () => {
        const s = setup();
        s.interpolator.enable();
        s.tick(100, 0);
        s.renderer._allDrawables[2] = makeDrawable(40, 0, 90, 100);
        s.tick(133, 100);
        s.frame(149.5);
        expect(s.renderer._allDrawables[2]._position[0]).toBe(40);
    });
});
