/**
 * @fileoverview
 * "Hakkında" penceresinin arkasında zıplayıp dönen Cool Cat sürüsünün saf hareket mantığı.
 * Çizim ve animasyon döngüsü components/about-modal/cat-swarm.jsx içindedir.
 */

const MIN_SIZE = 40;
const SIZE_RANGE = 70;
const MIN_SPEED = 150;
const SPEED_RANGE = 300;
const MIN_SPIN = 120;
const SPIN_RANGE = 360;

/**
 * @param {number} count kedi sayısı
 * @param {number} width alan genişliği (px)
 * @param {number} height alan yüksekliği (px)
 * @param {function(): number} random 0 ile 1 arası rastgele sayı üreten işlev
 * @return {Array} [{x, y, vx, vy, size, angle, spin}] (hızlar px/sn, dönüş derece/sn)
 */
const createCats = (count, width, height, random) => {
    const cats = [];
    for (let i = 0; i < count; i++) {
        const size = MIN_SIZE + (random() * SIZE_RANGE);
        const speed = MIN_SPEED + (random() * SPEED_RANGE);
        const heading = random() * 2 * Math.PI;
        cats.push({
            x: random() * Math.max(0, width - size),
            y: random() * Math.max(0, height - size),
            vx: Math.cos(heading) * speed,
            vy: Math.sin(heading) * speed,
            size: size,
            angle: random() * 360,
            spin: (random() < 0.5 ? -1 : 1) * (MIN_SPIN + (random() * SPIN_RANGE))
        });
    }
    return cats;
};

/**
 * @param {object} cat kedi
 * @param {number} width alan genişliği
 * @param {number} height alan yüksekliği
 * @param {number} dt geçen süre (sn)
 * @return {object} ilerlemiş yeni kedi (girdi değişmez); kenarlardan seker
 */
const stepCat = (cat, width, height, dt) => {
    const next = Object.assign({}, cat);
    next.x += cat.vx * dt;
    next.y += cat.vy * dt;
    next.angle = (cat.angle + (cat.spin * dt)) % 360;
    const maxX = Math.max(0, width - cat.size);
    const maxY = Math.max(0, height - cat.size);
    if (next.x < 0) {
        next.x = 0;
        next.vx = Math.abs(cat.vx);
    } else if (next.x > maxX) {
        next.x = maxX;
        next.vx = -Math.abs(cat.vx);
    }
    if (next.y < 0) {
        next.y = 0;
        next.vy = Math.abs(cat.vy);
    } else if (next.y > maxY) {
        next.y = maxY;
        next.vy = -Math.abs(cat.vy);
    }
    return next;
};

export {
    createCats,
    stepCat
};
