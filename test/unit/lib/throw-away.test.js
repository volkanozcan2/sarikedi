import {throwKeyframes, throwAway} from '../../../src/lib/throw-away';

const rect = {left: 600, top: 300, width: 90, height: 100};
const viewport = {width: 1200, height: 800};

describe('throw-away: parabolik fırlatma', () => {
    const run = (overrides) => throwKeyframes(Object.assign({
        rect: rect, viewport: viewport, direction: 1, speedX: 300, speedUp: 600, gravity: 2400, spin: 500, fps: 60
    }, overrides));

    test('ilk kare başlangıç konumundadır (kayma 0, dönme 0), zaman 0\'dan 1\'e artar', () => {
        const {frames} = run();
        expect(frames[0].x).toBe(0);
        expect(frames[0].y).toBe(0);
        expect(frames[0].rotate).toBe(0);
        expect(frames[0].offset).toBe(0);
        expect(frames[frames.length - 1].offset).toBe(1);
        for (let i = 1; i < frames.length; i++) expect(frames[i].offset).toBeGreaterThan(frames[i - 1].offset);
    });

    test('önce yukarı çıkar (y negatif), sonra ekranın altından tamamen düşer', () => {
        const {frames} = run();
        expect(Math.min(...frames.map(f => f.y))).toBeLessThan(-50);
        const last = frames[frames.length - 1];
        expect(rect.top + last.y).toBeGreaterThan(viewport.height);
    });

    test('yatay hız sabittir: x doğrusal artar, yön eksiyse sola gider', () => {
        const right = run({direction: 1}).frames;
        const left = run({direction: -1}).frames;
        const mid = Math.floor(right.length / 2);
        expect(right[mid].x).toBeGreaterThan(0);
        expect(left[mid].x).toBeLessThan(0);
        const step1 = right[1].x - right[0].x;
        const step2 = right[mid + 1].x - right[mid].x;
        expect(step2).toBeCloseTo(step1, 5);
    });

    test('yerçekimi: dikey hız zamanla artar (düşüş hızlanır)', () => {
        const {frames} = run();
        const n = frames.length;
        const earlyFall = frames[Math.floor(n * 0.6)].y - frames[Math.floor(n * 0.6) - 1].y;
        const lateFall = frames[n - 1].y - frames[n - 2].y;
        expect(lateFall).toBeGreaterThan(earlyFall);
    });

    test('dönme yönüne ve zamana göre artar; süre makul (0.6-2.5 sn)', () => {
        const res = run({direction: -1});
        expect(res.frames[res.frames.length - 1].rotate).toBeLessThan(-100);
        expect(res.duration).toBeGreaterThan(0.6);
        expect(res.duration).toBeLessThan(2.5);
    });
});

describe('throw-away: kartı kopyalayıp uçurma', () => {
    const makeCard = () => {
        const card = document.createElement('div');
        card.id = 'asil-kart';
        card.className = 'sprite-selector-item_a1b2c';
        card.innerHTML = '<span>Cool Cat</span><div class="delete-button_x1y2z"></div>';
        card.getBoundingClientRect = () => ({left: 600, top: 300, width: 90, height: 100, right: 690, bottom: 400});
        document.body.appendChild(card);
        return card;
    };

    test('kopya eklenir, animasyon başlar, bitince kopya kaldırılır; asıl kart ve silme simgesi kopyalanmaz', () => {
        const card = makeCard();
        const finished = [];
        const animate = jest.fn((frames, options) => {
            const animation = {finished: Promise.resolve(), onfinish: null};
            finished.push({frames, options, animation});
            return animation;
        });
        const clone = throwAway(card, {animate: animate, reducedMotion: false, viewport: viewport});
        expect(clone).not.toBe(card);
        expect(document.body.contains(clone)).toBe(true);
        expect(clone.id).toBe('');
        expect(clone.style.position).toBe('fixed');
        expect(clone.querySelector('[class*="delete-button"]')).toBe(null);
        expect(animate).toHaveBeenCalledTimes(1);
        expect(finished[0].options.easing).toBe('linear');
        expect(finished[0].frames.length).toBeGreaterThan(10);
        finished[0].animation.onfinish();
        expect(document.body.contains(clone)).toBe(false);
    });

    test('scale verilirse uçan kopya her karede o kadar büyütülür', () => {
        const card = makeCard();
        const animate = jest.fn(() => ({onfinish: null}));
        throwAway(card, {animate: animate, reducedMotion: false, viewport: viewport, scale: 2});
        const frames = animate.mock.calls[0][0];
        expect(frames.every(f => /scale\(2\)$/.test(f.transform))).toBe(true);
    });

    test('hareket azaltma tercihinde animasyon yok, kopya oluşmaz', () => {
        const card = makeCard();
        const animate = jest.fn();
        expect(throwAway(card, {animate: animate, reducedMotion: true, viewport: viewport})).toBe(null);
        expect(animate).not.toHaveBeenCalled();
    });

    test('animate desteklenmiyorsa sessizce atlar', () => {
        const card = makeCard();
        expect(throwAway(card, {animate: null, reducedMotion: false, viewport: viewport})).toBe(null);
    });
});
