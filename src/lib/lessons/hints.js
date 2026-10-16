/**
 * Ders adımları için ekrandaki ipuçları: ilgili düğmeyi/kategoriyi gösteren, hafifçe dokunur gibi hareket eden
 * el ve paletten yerine uçan yarı saydam "hayalet" blok (uçarken el de onu sürükler gibi taşır).
 * Hepsi sayfaya geçici olarak eklenir; clearHints ile kalkar.
 */
import {categoryOf} from './describe';
import handImage from './assets/guide-hand.png';

const HAND_CLASS = 'sk-lesson-hand';
const GHOST_CLASS = 'sk-lesson-ghost';
const FLY_MS = 900;
const TAB_INDEX = {code: 0, costumes: 1, sounds: 2};
// el görselinde işaret parmağının ucu (sol üst; görsel boyutuna oranla)
const HAND_WIDTH = 54;
const HAND_HEIGHT = 54;
const TIP = {x: 0.046, y: 0.028};
// menü çubuğunun (491) üstünde, açılan pencerelerin (510) altında
const Z_INDEX = 505;

let active = [];

const scratchBlocks = () => window.ScratchBlocks || window.Blockly;
const mainWorkspace = () => {
    const blocks = scratchBlocks();
    return blocks && blocks.getMainWorkspace ? blocks.getMainWorkspace() : null;
};

const injectStyles = () => {
    if (document.getElementById('sk-lesson-hint-styles')) return;
    const style = document.createElement('style');
    style.id = 'sk-lesson-hint-styles';
    style.textContent = `
.${HAND_CLASS} { position: fixed; left: 0; top: 0; z-index: ${Z_INDEX}; pointer-events: none;
  width: ${HAND_WIDTH}px; height: ${HAND_HEIGHT}px; --sx: 1; --sy: 1;
  transform-origin: ${TIP.x * 100}% ${TIP.y * 100}%; }
.${HAND_CLASS} > img { display: block; width: 100%; height: 100%;
  animation: sk-lesson-glow 0.9s ease-in-out infinite alternate; }
.${HAND_CLASS} > .sk-lesson-ripple { position: absolute; left: ${TIP.x * 100}%; top: ${TIP.y * 100}%;
  width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; border: 3px solid #FF6B3D;
  opacity: 0; animation: sk-lesson-ripple 1.4s ease-out infinite; }
.${HAND_CLASS}.sk-lesson-tap { animation: sk-lesson-tap 0.7s ease-in-out infinite alternate; }
@keyframes sk-lesson-tap {
  from { transform: scale(var(--sx), var(--sy)) translate(9px, 9px); }
  to { transform: scale(var(--sx), var(--sy)) translate(0, 0); }
}
@keyframes sk-lesson-glow {
  from { filter: drop-shadow(0 0 1px #184D47) drop-shadow(0 0 1px #184D47)
    drop-shadow(0 0 3px rgba(255, 212, 71, 0.6)); }
  to { filter: drop-shadow(0 0 1px #184D47) drop-shadow(0 0 1px #184D47) drop-shadow(0 0 10px #FF6B3D)
    drop-shadow(0 0 4px #FFD447); }
}
@keyframes sk-lesson-ripple {
  0% { transform: scale(0.4); opacity: 1; border-color: #FF6B3D; }
  60% { border-color: #FFD447; }
  100% { transform: scale(3.6); opacity: 0; border-color: #FFD447; }
}
.${GHOST_CLASS} { position: fixed; left: 0; top: 0; z-index: ${Z_INDEX}; pointer-events: none; overflow: visible; }
.${GHOST_CLASS}.sk-lesson-ghost-rest { animation: sk-lesson-ghost 1s ease-in-out infinite alternate; }
@keyframes sk-lesson-ghost { from { opacity: 0.75; } to { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) {
  .${HAND_CLASS}.sk-lesson-tap { animation: none; transform: scale(var(--sx), var(--sy)); }
  .${HAND_CLASS} > img { animation: none; filter: drop-shadow(0 0 1px #184D47) drop-shadow(0 0 6px #FF6B3D); }
  .${HAND_CLASS} > .sk-lesson-ripple { display: none; }
}`;
    document.head.appendChild(style);
};

// El: koyu kontur ve yanıp sönen parıltılı görsel + parmak ucundan yayılan halka ("ben buradayım")
const makeHand = () => {
    injectStyles();
    const hand = document.createElement('div');
    hand.className = HAND_CLASS;
    hand.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = handImage;
    img.alt = '';
    const ripple = document.createElement('span');
    ripple.className = 'sk-lesson-ripple';
    hand.appendChild(img);
    hand.appendChild(ripple);
    document.body.appendChild(hand);
    return hand;
};

// Eli, parmak ucu (x, y) noktasına değecek şekilde yerleştirir; ekran kenarına taşacaksa ters çevirir.
const placeHand = (img, x, y) => {
    const flipX = x + (HAND_WIDTH * (1 - TIP.x)) > window.innerWidth - 4;
    const flipY = y + (HAND_HEIGHT * (1 - TIP.y)) > window.innerHeight - 4;
    img.style.setProperty('--sx', flipX ? -1 : 1);
    img.style.setProperty('--sy', flipY ? -1 : 1);
    img.style.left = `${x - (HAND_WIDTH * TIP.x)}px`;
    img.style.top = `${y - (HAND_HEIGHT * TIP.y)}px`;
};

/**
 * Bir öğeyi gösteren el; öğe yer değiştirirse (kaydırma, açılan menü) el onu izler.
 * @param {function} getElement - her çizimde öğeyi yeniden bulan işlev (öğe yeniden oluşturulabilir)
 * @returns {object} remove() ile kaldırılan ipucu
 */
const pointAt = getElement => {
    const img = makeHand();
    img.classList.add('sk-lesson-tap');
    let frame = null;
    const place = () => {
        const element = getElement();
        const rect = element && element.getBoundingClientRect();
        if (rect && rect.width > 0) {
            img.style.display = 'block';
            // parmak ucu öğenin ortasının biraz altına değer
            placeHand(img, rect.left + (rect.width * 0.55), rect.top + (rect.height * 0.6));
        } else {
            img.style.display = 'none';
        }
        frame = window.requestAnimationFrame(place);
    };
    place();
    return {
        remove: () => {
            window.cancelAnimationFrame(frame);
            if (img.parentNode) img.parentNode.removeChild(img);
        }
    };
};

// Çalışma alanı koordinatındaki bir noktanın ekrandaki yeri
const toScreen = (workspace, x, y) => {
    const matrix = workspace.getCanvas().getScreenCTM();
    return {x: (matrix.a * x) + matrix.e, y: (matrix.d * y) + matrix.f};
};

// Yeni bloğun bırakılacağı yer: ebeveynin bağlantı noktası ya da kod alanında bloklarin altındaki boşluk
const dropPoint = (workspace, step, parentId) => {
    const parent = parentId && workspace.getBlockById(parentId);
    if (parent && step.attach.how !== 'top') {
        const connection = step.attach.how === 'next' ?
            parent.nextConnection :
            parent.getInput(step.attach.input) && parent.getInput(step.attach.input).connection;
        if (connection) return toScreen(workspace, connection.x_, connection.y_);
    }
    const box = workspace.getBlocksBoundingBox();
    const hasBlocks = workspace.getTopBlocks(false).length > 0;
    const metrics = workspace.getMetrics();
    const x = hasBlocks ? box.x : (metrics.viewLeft / workspace.scale) + 40;
    const y = hasBlocks ? box.y + box.height + 40 : (metrics.viewTop / workspace.scale) + 40;
    return toScreen(workspace, x, y);
};

/**
 * Paletteki bloğun kopyasını kategorisinden bırakılacağı yere uçurur ve orada yarı saydam bırakır.
 * @param {object} step - addBlock adımı
 * @param {string} parentId - öğrencinin projesindeki ebeveyn blok kimliği (yoksa null)
 * @returns {object} remove() ile kaldırılan ipucu
 */
const ghostBlock = (step, parentId) => {
    injectStyles();
    const workspace = mainWorkspace();
    if (!workspace || !workspace.getFlyout()) return {remove: () => {}};
    let svg = null;
    let carrier = null;
    let timer = null;
    let removed = false;
    const fly = () => {
        if (removed) return;
        const flyoutWorkspace = workspace.getFlyout().getWorkspace();
        const source = flyoutWorkspace.getTopBlocks(false).find(block => block.type === step.opcode);
        if (!source) return;
        const from = source.getSvgRoot().getBoundingClientRect();
        const to = dropPoint(workspace, step, parentId);
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `${GHOST_CLASS} blocklySvg`);
        svg.setAttribute('width', '1');
        svg.setAttribute('height', '1');
        const copy = source.getSvgRoot().cloneNode(true);
        copy.removeAttribute('transform');
        svg.appendChild(copy);
        document.body.appendChild(svg);
        const fromScale = flyoutWorkspace.scale;
        const toScale = workspace.scale;
        // kopyanın sol üst köşesi bloğun kendi koordinatında (0,0); sınır kutusu ile farkı düzeltilir
        const origin = copy.getBBox ? copy.getBBox() : {x: 0, y: 0};
        const start = {x: from.left - (origin.x * fromScale), y: from.top - (origin.y * fromScale)};
        const frames = [
            {transform: `translate(${start.x}px, ${start.y}px) scale(${fromScale})`, opacity: 0.95},
            {transform: `translate(${to.x}px, ${to.y}px) scale(${toScale})`, opacity: 0.75}
        ];
        const timing = {duration: FLY_MS, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards'};
        const animation = svg.animate ? svg.animate(frames, timing) : null;
        // el, bloğu sol üst köşesinden tutmuş gibi onunla birlikte uçar; blok yerine konunca kaybolur
        carrier = makeHand();
        placeHand(carrier, 0, 0);
        const grip = {x: 14, y: 10};
        if (carrier.animate) {
            carrier.animate([
                {transform: `translate(${start.x + grip.x}px, ${start.y + grip.y}px)`},
                {transform: `translate(${to.x + grip.x}px, ${to.y + grip.y}px)`}
            ], timing);
        }
        const rest = () => {
            if (carrier && carrier.parentNode) carrier.parentNode.removeChild(carrier);
            carrier = null;
            if (!svg) return;
            svg.style.transform = frames[1].transform;
            svg.classList.add('sk-lesson-ghost-rest');
        };
        if (animation) animation.onfinish = rest;
        else rest();
    };
    // önce kategori seçilip palet o bölüme kaydırılır, sonra blok uçar
    const toolbox = workspace.getToolbox && workspace.getToolbox();
    const categoryId = categoryOf(step.opcode).id;
    if (toolbox && toolbox.setSelectedCategoryById) toolbox.setSelectedCategoryById(categoryId);
    if (toolbox && toolbox.scrollToCategoryById) toolbox.scrollToCategoryById(categoryId);
    timer = setTimeout(fly, 450);
    return {
        remove: () => {
            removed = true;
            clearTimeout(timer);
            if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
            if (carrier && carrier.parentNode) carrier.parentNode.removeChild(carrier);
        }
    };
};

const categoryElement = opcode => () => document.querySelector(
    `.scratchCategoryMenuItem.scratchCategoryId-${categoryOf(opcode).id}`
);
const blockElement = blockId => () => {
    const workspace = mainWorkspace();
    const block = workspace && workspace.getBlockById(blockId);
    return block ? block.getSvgRoot() : null;
};
const tabElement = tab => () => document.querySelectorAll('[class*="gui_tab_"]')[TAB_INDEX[tab] || 0];
const spriteElement = name => () => Array.prototype.find.call(
    document.querySelectorAll('[class*="sprite-selector_sprite-wrapper"]'),
    wrapper => (wrapper.textContent || '').indexOf(name) !== -1
);
// Kostümler/Sesler sekmesindeki ekleme düğmesi: kukla ve dekor düğmesi dışındaki tek "action-menu"
const assetAddButton = () => Array.prototype.find.call(
    document.querySelectorAll('[class*="action-menu_menu-container"]'),
    menu => !/sprite-selector_|stage-selector_/.test(menu.className) && menu.getBoundingClientRect().width > 0
);
const menuItem = text => () => Array.prototype.find.call(
    document.querySelectorAll('[class*="menu-bar_menu-bar-item"]'),
    item => (item.textContent || '').trim() === text
);
const query = selector => () => document.querySelector(selector);

// "Göster" (point) adımlarının hedefleri: ad → öğeyi bulan işlev. "category:motion" gibi kategori hedefleri de olur.
const TARGETS = {
    menuFile: menuItem('Dosya'),
    menuEdit: menuItem('Düzenle'),
    menuShared: menuItem('Paylaşılanlar'),
    menuLessons: menuItem('Dersler'),
    menuShare: menuItem('Paylaş'),
    logo: query('[class*="menu-bar_scratch-logo"]'),
    account: query('[class*="menu-bar_account-info-group"], [class*="account_"]'),
    greenFlag: query('[class*="green-flag_green-flag"]'),
    stopAll: query('[class*="stop-all_stop-all"]'),
    stage: query('[class*="stage_stage_"]'),
    stageSize: query('[class*="stage-header_stage-size-toggle-group"]'),
    fullScreen: query('[class*="stage-header_stage-button_"]'),
    spriteInfo: query('[class*="sprite-info_sprite-info"]'),
    spriteList: query('[class*="sprite-selector_items-wrapper"]'),
    spriteAdd: query('[class*="sprite-selector_add-button"]'),
    stageSelector: query('[class*="stage-selector_stage-selector_"]'),
    backdropAdd: query('[class*="stage-selector_add-button"]'),
    tabCode: tabElement('code'),
    tabCostumes: tabElement('costumes'),
    tabSounds: tabElement('sounds'),
    palette: query('.blocklyFlyout'),
    codeArea: query('[class*="gui_blocks-wrapper"]'),
    extensionButton: query('[class*="gui_extension-button_"]'),
    assetAdd: assetAddButton
};

/**
 * "Göster" adımının hedef öğesi.
 * @param {string} name - TARGETS içindeki ad ya da "category:<kategori kimliği>"
 * @returns {?Element} öğe
 */
const targetElement = name => {
    if (/^category:/.test(name || '')) {
        return document.querySelector(`.scratchCategoryMenuItem.scratchCategoryId-${name.slice(9)}`);
    }
    return TARGETS[name] ? TARGETS[name]() : null;
};


// Adımın yapılabildiği sekme (ilgili düğme yalnızca o sekmede görünür); null: her sekmede yapılabilir
const TAB_OF = {
    addBlock: 'code',
    moveBlock: 'code',
    setValue: 'code',
    deleteBlock: 'code',
    addExtension: 'code',
    addCostume: 'costumes',
    addSound: 'sounds'
};
const tabFor = step => {
    if (step.type === 'selectTab') return null;
    return step.tab || TAB_OF[step.type] || null;
};

/**
 * Bir adım için ipuçlarını gösterir; önceki ipuçları kalkar. Öğrenci adımın sekmesinde değilse önce o sekme
 * gösterilir.
 * @param {object} step - ders adımı
 * @param {function} blockFor - kayıttaki blok kimliği → öğrencinin blok kimliği
 * @param {string} [tab] - öğrencinin açık sekmesi ('code' | 'costumes' | 'sounds')
 */
const showHints = (step, blockFor, tab) => {
    // eslint-disable-next-line no-use-before-define
    clearHints();
    if (!step) return;
    const add = hint => active.push(hint);
    const needed = tabFor(step);
    if (needed && tab && tab !== needed) {
        add(pointAt(tabElement(needed)));
        return;
    }
    switch (step.type) {
    case 'addBlock':
        add(pointAt(categoryElement(step.opcode)));
        add(ghostBlock(step, step.attach.to ? blockFor(step.attach.to) : null));
        break;
    case 'moveBlock':
    case 'setValue':
    case 'deleteBlock':
        add(pointAt(blockElement(blockFor(step.block))));
        break;
    case 'selectTab':
        add(pointAt(tabElement(step.tab)));
        break;
    case 'addSprite':
        add(pointAt(() => document.querySelector('[class*="sprite-selector_add-button"]')));
        break;
    case 'addBackdrop':
        add(pointAt(() => document.querySelector('[class*="stage-selector_add-button"]')));
        break;
    case 'addCostume':
    case 'addSound':
        add(pointAt(assetAddButton));
        break;
    case 'point':
        add(pointAt(() => targetElement(step.target)));
        break;
    case 'addExtension':
        add(pointAt(() => document.querySelector('[class*="gui_extension-button_"]')));
        break;
    case 'selectSprite':
        add(pointAt(step.isStage ?
            () => document.querySelector('[class*="stage-selector_stage-selector"]') :
            spriteElement(step.name)));
        break;
    default:
        break;
    }
};

const clearHints = () => {
    active.forEach(hint => hint.remove());
    active = [];
};

export {showHints, clearHints, tabFor, targetElement};
