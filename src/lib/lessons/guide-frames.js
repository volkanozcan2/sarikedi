/**
 * @fileoverview
 * Rehber eylemlerinden (ekran konumları çözülmüş halde) el imlecinin
 * oynatacağı animasyon çerçevelerini üretir. Saf fonksiyon.
 */

const MOVE_MS = 800;
const PRESS_MS = 300;
const PAUSE_MS = 500;
const DRAG_MS = 1100;

const centerOf = rect => ({x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2)});

const frame = (kind, point, ms, holding, label) => ({
    kind: kind,
    x: point.x,
    y: point.y,
    ms: ms,
    holding: holding,
    label: label || ''
});

const clickFrames = item => {
    const point = centerOf(item.rect);
    return [
        frame('move', point, MOVE_MS, false, item.label),
        frame('press', point, PRESS_MS, false),
        frame('pause', point, PAUSE_MS, false)
    ];
};

const dragFrames = item => {
    const from = centerOf(item.fromRect);
    const to = centerOf(item.toRect);
    return [
        frame('move', from, MOVE_MS, false, item.label),
        frame('press', from, PRESS_MS, false),
        frame('move', to, DRAG_MS, true),
        frame('release', to, PRESS_MS, false),
        frame('pause', to, PAUSE_MS, false)
    ];
};

/**
 * @param {Array} items [{type:'click', rect, label?} | {type:'drag', fromRect, toRect, label?}]
 * @return {Array} çerçeve listesi; konumu çözülemeyen eylemler atlanır
 */
const buildGuideFrames = items => {
    const frames = [];
    (items || []).forEach(item => {
        if (item.type === 'click' && item.rect) {
            clickFrames(item).forEach(f => frames.push(f));
        } else if (item.type === 'drag' && item.fromRect && item.toRect) {
            dragFrames(item).forEach(f => frames.push(f));
        }
    });
    return frames;
};

const totalDurationMs = frames => frames.reduce((sum, f) => sum + f.ms, 0);

export {
    buildGuideFrames,
    totalDurationMs
};
