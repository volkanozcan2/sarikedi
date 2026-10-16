/**
 * Ara değer (interpolasyon): VM 30 adım/sn çalışırken ekran 60 kare/sn çizilir.
 * Her adımda kuklaların konum, yön ve boyutu kaydedilir; adımlar arasındaki karelerde bir önceki
 * adımdan şimdikine doğru ara değer çizilir. Proje mantığı (VM) hiç değişmez; yalnızca çizim sırasında
 * kuklaların değerleri geçici olarak değiştirilip hemen geri konur.
 */

const DEFAULT_INTERVAL = 1000 / 30;
const MIN_INTERVAL = 10;
const MAX_INTERVAL = 100;

const defaultEnv = () => ({
    now: () => window.performance.now(),
    raf: callback => window.requestAnimationFrame(callback),
    caf: id => window.cancelAnimationFrame(id)
});

const read = drawable => ({
    x: drawable._position[0],
    y: drawable._position[1],
    d: drawable._direction,
    sx: drawable._scale[0],
    sy: drawable._scale[1]
});

const same = (a, b) => a.x === b.x && a.y === b.y && a.d === b.d && a.sx === b.sx && a.sy === b.sy;

const write = (drawable, state) => {
    drawable._position[0] = state.x;
    drawable._position[1] = state.y;
    drawable._direction = state.d;
    drawable._scale[0] = state.sx;
    drawable._scale[1] = state.sy;
    drawable.setTransformDirty();
};

const lerp = (a, b, t) => a + ((b - a) * t);

const mix = (from, to, t) => ({
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    // yön: en kısa yoldan (350° → 10° arası 20° döner)
    d: from.d + ((((to.d - from.d + 540) % 360) - 180) * t),
    sx: lerp(from.sx, to.sx, t),
    sy: lerp(from.sy, to.sy, t)
});

class Interpolator {
    constructor (vm, env) {
        this.vm = vm;
        this.env = env || defaultEnv();
        this.active = false;
        this.inStep = false;
        this.prev = new Map();
        this.cur = new Map();
        this.tickTime = 0;
        this.interval = DEFAULT_INTERVAL;
        this.settled = true;
        this.frameId = null;
        this.frame = this.frame.bind(this);
    }
    get runtime () {
        return this.vm.runtime;
    }
    get renderer () {
        return this.vm.runtime.renderer;
    }
    get running () {
        return this.active && this.runtime.compatibilityMode;
    }
    enable () {
        if (this.active || !this.renderer) return;
        this.active = true;
        const runtime = this.runtime;
        const renderer = this.renderer;
        this.originalStep = runtime._step;
        this.originalDraw = renderer.draw;
        this.patchedRenderer = renderer;
        const self = this;
        runtime._step = function (...args) {
            self.inStep = true;
            try {
                return self.originalStep.apply(this, args);
            } finally {
                self.inStep = false;
            }
        };
        renderer.draw = function (...args) {
            if (!self.running) return self.originalDraw.apply(this, args);
            if (self.inStep) self.capture();
            return self.drawAt(self.inStep ? 0 : self.progress());
        };
        this.frameId = this.env.raf(this.frame);
    }
    disable () {
        if (!this.active) return;
        this.active = false;
        this.runtime._step = this.originalStep;
        this.patchedRenderer.draw = this.originalDraw;
        if (this.frameId !== null) this.env.caf(this.frameId);
        this.frameId = null;
        this.prev.clear();
        this.cur.clear();
    }
    // her VM adımında: şimdiki durumu "bir önceki" yapıp yeni durumu kaydeder
    capture () {
        const now = this.env.now();
        if (this.tickTime) {
            this.interval = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, now - this.tickTime));
        }
        this.tickTime = now;
        this.prev = this.cur;
        this.cur = new Map();
        this.renderer._allDrawables.forEach((drawable, id) => {
            if (drawable) this.cur.set(id, read(drawable));
        });
        this.settled = false;
    }
    progress () {
        return Math.min(1, Math.max(0, (this.env.now() - this.tickTime) / this.interval));
    }
    drawAt (t) {
        const drawables = this.renderer._allDrawables;
        const touched = [];
        this.cur.forEach((current, id) => {
            const drawable = drawables[id];
            const before = this.prev.get(id);
            if (!drawable || !before) return;
            const actual = read(drawable);
            if (!same(actual, current)) {
                // adım dışında değişti (sürükleme, editör): ara değer yapma
                this.cur.set(id, actual);
                this.prev.set(id, actual);
                return;
            }
            if (same(before, current)) return;
            write(drawable, mix(before, current, t));
            touched.push([drawable, current]);
        });
        try {
            return this.originalDraw.call(this.renderer);
        } finally {
            touched.forEach(entry => write(entry[0], entry[1]));
        }
    }
    frame () {
        if (!this.active) return;
        this.frameId = this.env.raf(this.frame);
        if (!this.running) return;
        const t = this.progress();
        if (t >= 1 && this.settled) return;
        this.drawAt(t);
        this.settled = t >= 1;
    }
}

export {Interpolator};
export default Interpolator;
