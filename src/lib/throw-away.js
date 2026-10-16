/**
 * Silinen kartı (kukla, kostüm, ses) fırlatılmış gibi uçurur: yukarı-yana fırlar, parabol çizip dönerek
 * ekranın altından düşer. Gerçek silme hemen yapılır; uçan şey kartın görsel bir kopyasıdır.
 */

const DEFAULTS = {speedX: 300, speedUp: 620, gravity: 2600, spin: 520, fps: 60};

/**
 * Parabolik hareketin kare kare konumunu hesaplar (CSS pikseli, saniye).
 * @param {object} options - rect, viewport, direction (1 sağ, -1 sol), speedX, speedUp, gravity, spin (derece/sn), fps
 * @returns {{frames: Array, duration: number}} kareler {x, y, rotate, offset} ve toplam süre (sn)
 */
const throwKeyframes = options => {
    const o = Object.assign({}, DEFAULTS, options);
    const {rect, viewport, direction} = o;
    const dt = 1 / o.fps;
    // kart tamamen ekran dışına çıkana kadar (dönen kartın köşegeni kadar pay)
    const exitY = viewport.height + (Math.max(rect.width, rect.height) * 1.5 * (o.scale || 1));
    const at = t => ({
        x: direction * o.speedX * t,
        y: (-o.speedUp * t) + (0.5 * o.gravity * t * t),
        rotate: direction * o.spin * t
    });
    let steps = 0;
    while (steps < 600 && rect.top + at(steps * dt).y <= exitY) steps++;
    steps = Math.max(steps + 1, 2);
    const duration = steps * dt;
    const frames = [];
    for (let i = 0; i <= steps; i++) {
        const p = at(i * dt);
        frames.push({
            x: i === 0 ? 0 : p.x,
            y: i === 0 ? 0 : p.y,
            rotate: i === 0 ? 0 : p.rotate,
            offset: i / steps
        });
    }
    return {frames: frames, duration: duration};
};

// Kopya body'ye eklenince, atalarına bağlı CSS kuralları (ör. kostüm listesindeki resim boyutları) uygulanmaz ve
// kart küçülür. Bu yüzden asıl kartın ekranda görünen (hesaplanmış) stilleri kopyaya satır içi yazılır.
const copyComputedStyles = (source, target) => {
    if (!window.getComputedStyle || source.nodeType !== 1) return;
    const computed = window.getComputedStyle(source);
    for (let i = 0; i < computed.length; i++) {
        const name = computed[i];
        target.style.setProperty(name, computed.getPropertyValue(name), computed.getPropertyPriority(name));
    }
    for (let i = 0; i < source.children.length; i++) {
        if (target.children[i]) copyComputedStyles(source.children[i], target.children[i]);
    }
};

const prefersReducedMotion = () => (
    typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

/**
 * Kartın kopyasını oluşturup fırlatır. Kopya animasyon bitince kendiliğinden kaldırılır.
 * @param {Element} element - uçurulacak kart
 * @param {object} [options] - scale (uçarken büyütme çarpanı, varsayılan 1); test için: animate, reducedMotion,
 *   viewport, random
 * @returns {?Element} uçan kopya (animasyon yapılamıyorsa null)
 */
const throwAway = (element, options = {}) => {
    if (!element || !element.getBoundingClientRect) return null;
    const reduced = 'reducedMotion' in options ? options.reducedMotion : prefersReducedMotion();
    if (reduced) return null;
    const hasAnimate = 'animate' in options ? Boolean(options.animate) : Boolean(element.animate);
    if (!hasAnimate) return null;

    const random = options.random || Math.random;
    const scale = options.scale || 1;
    const viewport = options.viewport || {width: window.innerWidth, height: window.innerHeight};
    const rect = element.getBoundingClientRect();
    // ekranın ortasına doğru fırlat: kart görünür bir yay çizsin
    const center = rect.left + (rect.width / 2);
    const direction = center < viewport.width / 2 ? 1 : -1;
    const {frames, duration} = throwKeyframes({
        rect: rect,
        viewport: viewport,
        direction: direction,
        scale: scale,
        speedX: DEFAULTS.speedX + (random() * 140),
        speedUp: DEFAULTS.speedUp + (random() * 180),
        spin: DEFAULTS.spin + (random() * 260)
    });

    const clone = element.cloneNode(true);
    copyComputedStyles(element, clone);
    clone.removeAttribute('id');
    clone.removeAttribute('data-id');
    Array.prototype.forEach.call(
        clone.querySelectorAll('[id]'), node => node.removeAttribute('id')
    );
    Array.prototype.forEach.call(
        clone.querySelectorAll('[class*="delete-button"]'), node => node.parentNode.removeChild(node)
    );
    Object.assign(clone.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        zIndex: '5000',
        pointerEvents: 'none',
        transformOrigin: '50% 50%',
        transition: 'none'
    });
    document.body.appendChild(clone);

    const keyframes = frames.map(f => ({
        transform: `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) ` +
            `rotate(${f.rotate.toFixed(1)}deg) scale(${scale})`,
        offset: f.offset
    }));
    const animateOptions = {duration: duration * 1000, easing: 'linear', fill: 'forwards'};
    const animation = options.animate ?
        options.animate(keyframes, animateOptions) :
        clone.animate(keyframes, animateOptions);
    const remove = () => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
    };
    if (animation) animation.onfinish = remove;
    setTimeout(remove, (duration * 1000) + 800); // animasyon olayı gelmezse kopya yetim kalmasın
    return clone;
};

export {throwKeyframes, throwAway};
