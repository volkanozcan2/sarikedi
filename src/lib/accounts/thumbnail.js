/**
 * @fileoverview
 * Sahnenin küçük bir PNG görüntüsünü alır (proje kartlarında kapak olarak gösterilir). Hiçbir koşulda reddetmez:
 * görüntü alınamazsa null döner ve kaydetme işlemi etkilenmez.
 */

const WIDTH = 240;
const HEIGHT = 180;
const TIMEOUT_MS = 2000;

const defaultCreateCanvas = () => document.createElement('canvas');
const defaultLoadImage = uri => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Görüntü yüklenemedi'));
    image.src = uri;
});

/**
 * @param {object} vm scratch-vm (vm.runtime.renderer kullanılır)
 * @param {object} [env] createCanvas, loadImage, timeoutMs (testler için)
 * @return {Promise<?Blob>} PNG blob ya da null
 */
const captureThumbnail = (vm, env) => {
    const options = env || {};
    const createCanvas = options.createCanvas || defaultCreateCanvas;
    const loadImage = options.loadImage || defaultLoadImage;
    const renderer = vm && vm.runtime && vm.runtime.renderer;
    if (!renderer || typeof renderer.requestSnapshot !== 'function') return Promise.resolve(null);

    const snapshot = new Promise((resolve, reject) => {
        try {
            renderer.requestSnapshot(resolve);
            // görüntü bir sonraki çizimde alınır
            renderer.draw();
        } catch (error) {
            reject(error);
        }
    });
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), options.timeoutMs || TIMEOUT_MS));

    return Promise.race([snapshot, timeout])
        .then(uri => (uri ? loadImage(uri) : null))
        .then(image => {
            if (!image) return null;
            const canvas = createCanvas();
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            canvas.getContext('2d').drawImage(image, 0, 0, WIDTH, HEIGHT);
            return new Promise(resolve => canvas.toBlob(blob => resolve(blob || null), 'image/png'));
        })
        .catch(() => null);
};

export {
    captureThumbnail
};
