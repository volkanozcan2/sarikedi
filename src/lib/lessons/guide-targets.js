/**
 * @fileoverview
 * Rehber hedeflerini (kategori, blok, arayüz öğesi...) ekran konumlarına çevirir.
 * DOM ve scratch-blocks çalışma alanı `env` ile enjekte edilir; test edilebilir.
 * Hiçbir koşulda reddetmez: bulunamayan hedef `null` olur.
 */

const SAFE_ID = /^[A-Za-z0-9_-]{1,50}$/;
const SCROLL_OFFSET = 16;
const SCROLL_WAIT_MS = 350;
const DROP_SIZE = 40;

// [seçici, sıra numarası]; seçiciler CSS modül sınıf adlarının sabit önekine dayanır
const UI_SELECTORS = {
    greenFlag: ['img[class*="green-flag_green-flag_"]', 0],
    stop: ['img[class*="stop-all_stop-all_"]', 0],
    stage: ['[class*="stage_stage_"]', 0],
    spriteList: ['[class*="sprite-selector_sprite-selector_"]', 0],
    addSprite: ['[class*="sprite-selector_add-button_"]', 0],
    addBackdrop: ['[class*="stage-selector_add-button_"]', 0],
    stageSelector: ['[class*="stage-selector_stage-selector_"]', 0],
    codeTab: ['[role="tab"]', 0],
    costumesTab: ['[role="tab"]', 1],
    soundsTab: ['[role="tab"]', 2]
};

const rectOf = element => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    return {left: r.left, top: r.top, width: r.width, height: r.height};
};

const findBlock = (workspace, opcode) => {
    const blocks = workspace.getAllBlocks(false);
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].type === opcode && !blocks[i].isShadow()) return blocks[i];
    }
    return null;
};

const resolvePaletteBlock = (opcode, env) => {
    const flyout = env.getWorkspace().getFlyout();
    const block = findBlock(flyout.getWorkspace(), opcode);
    if (!block) return null;
    flyout.scrollTo(Math.max(0, block.getRelativeToSurfaceXY().y - SCROLL_OFFSET));
    return env.sleep(SCROLL_WAIT_MS).then(() => rectOf(block.getSvgRoot()));
};

const resolve = (target, env) => {
    switch (target && target.kind) {
    case 'category':
        return SAFE_ID.test(target.id) ?
            rectOf(env.document.querySelector(`.scratchCategoryId-${target.id}`)) : null;
    case 'ui': {
        const entry = UI_SELECTORS[target.id];
        return entry ? rectOf(env.document.querySelectorAll(entry[0])[entry[1]]) : null;
    }
    case 'workspace': {
        const area = rectOf(env.document.querySelector('.injectionDiv'));
        return area && {
            left: area.left + (area.width * 0.35),
            top: area.top + (area.height * 0.3),
            width: DROP_SIZE,
            height: DROP_SIZE
        };
    }
    case 'workspaceBlock': {
        const block = findBlock(env.getWorkspace(), target.opcode);
        return block ? rectOf(block.getSvgRoot()) : null;
    }
    case 'block':
        return resolvePaletteBlock(target.opcode, env);
    default:
        return null;
    }
};

/**
 * @param {object} target GuideTarget
 * @param {object} env {document, getWorkspace(), sleep(ms)}
 * @return {Promise<?object>} {left, top, width, height} ya da null
 */
const resolveTargetRect = (target, env) => Promise.resolve()
    .then(() => resolve(target, env))
    .catch(() => null);

export {
    UI_SELECTORS,
    resolveTargetRect
};
