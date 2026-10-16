import back from './ui-sounds/back.wav';
// Scratch ses kütüphanesindeki "Cheer" (170e05c2…); tarayıcı ADPCM çözemediği için PCM WAV'a çevrildi
import celebrate from './ui-sounds/celebrate.wav';
import click from './ui-sounds/click.wav';
import del from './ui-sounds/delete.wav';
import error from './ui-sounds/error.wav';
import open from './ui-sounds/open.wav';
import pop from './ui-sounds/pop.wav';
import snap from './ui-sounds/snap.wav';
import stone from './ui-sounds/stone.wav';
import start from './ui-sounds/start.wav';
import stop from './ui-sounds/stop.wav';
import success from './ui-sounds/success.wav';
import thud from './ui-sounds/thud.wav';
import toggle from './ui-sounds/toggle.wav';
import warn from './ui-sounds/warn.wav';

const FILES = {
    back, celebrate, click, delete: del, error, open, pop, snap, start, stone, stop, success, thud, toggle, warn
};

const KEY = 'sarikedi.uisounds';
const MIN_GAP_MS = 45;
const VOLUME = 0.45;

// Bunların içinde pointer tıklaması ses çıkarmaz. Blok bırakma sesi Blockly END_DRAG olayından gelir.
// Ses düzenleyici de sessizdir: efektleri ve oynatma düğmesi asıl sesle karışmasın.
const SILENT = ['.blocklyWorkspace', '.blocklyFlyout', 'canvas', '[class*="sound-editor_editor-container"]'];
// Sessiz alanların içindeki, ama arayüz sayılan öğeler
const ALWAYS_CLICK = ['.blocklyFlyoutButton', '.goog-menuitem', '.blocklyContextMenu'];

// Silme sesi tıklama anında değil, kart fırlatılırken (sprite-selector-item) çalınır; böylece efektle birlikte gelir
// ve çift çalmaz. Bu öğelerin basış sesi susturulur. Kostüm/dekor/ses kartındaki çarpı da onay istemediği için susar.
const DELETE_PRESS = [
    '[class*="delete-confirmation-prompt_ok-button"]',
    '[class*="context-menu_menu-item-danger"]',
    '[class*="selector_list-item"] [class*="delete-button_delete-button"]'
];

// Eyleme özel sesler; ilk eşleşen kazanır (sıra önemli: özelden genele).
const RULES = [
    ['back', ['[class*="delete-confirmation-prompt_cancel-button"]', '[class*="close-button_close-button"]']],
    ['warn', ['[class*="delete-button_delete-button"]']],
    ['start', ['[class*="green-flag_green-flag"]']],
    ['stop', ['[class*="stop-all_stop-all"]']],
    ['pop', ['[class*="action-menu_more-button"]', '[class*="library-item_library-item"]']],
    ['toggle', [
        'input[type="checkbox"]',
        'input[type="radio"]',
        '[role="switch"]',
        '[class*="toggle-buttons_button"]'
    ]],
    ['snap', [
        '.scratchCategoryMenuItem',
        '[class*="gui_tab_"]',
        '[class*="sprite-selector-item_sprite-selector-item"]',
        '[class*="stage-selector_stage-selector"]'
    ]]
];
const CLICK = [
    'button',
    '[role="button"]',
    '[class*="menu-bar_menu-bar-item"]',
    '[class*="menu_menu-item"]',
    '[class*="context-menu_menu-item"]',
    '[class*="stage-header_stage-button"]',
    '[class*="account_pill"]',
    'a[href]'
];

const closest = (element, selector) => {
    if (element.closest) return element.closest(selector);
    for (let node = element; node && node.nodeType === 1; node = node.parentNode) {
        const test = node.matches || node.msMatchesSelector;
        if (test && test.call(node, selector)) return node;
    }
    return null;
};

const matches = (target, selectors) => selectors.some(selector => closest(target, selector));

/**
 * Tıklanan öğeye göre çalınacak sesin adı (click, snap, pop, delete, warn...) ya da çalınmayacaksa null.
 * @param {Element} target - tıklanan öğe
 * @returns {?string} ses adı
 */
const soundFor = target => {
    if (!target || target.nodeType !== 1) return null;
    if (matches(target, ALWAYS_CLICK)) return 'click';
    if (matches(target, DELETE_PRESS)) return null;
    for (let i = 0; i < RULES.length; i++) {
        if (matches(target, RULES[i][1])) return RULES[i][0];
    }
    if (matches(target, SILENT)) return null;
    if (matches(target, CLICK)) return 'click';
    return null;
};

// Ekrana yeni eklenen öğeye göre ses: pencere açılışı, hata ve başarı mesajları.
const LOADING = '[class*="loader_"], [class*="loading-state"]';
const SUCCESS_TEXT = /kaydedildi|paylaşıldı|oluşturuldu|gönderildi|onaylandı/i;
const soundForAdded = node => {
    if (!node || node.nodeType !== 1) return null;
    const test = node.matches || node.msMatchesSelector;
    if (!test) return null;
    if (test.call(node, '.ReactModal__Overlay')) {
        return node.querySelector && node.querySelector(LOADING) ? null : 'open';
    }
    if (test.call(node, '[class*="account_error"]')) return 'error';
    if (test.call(node, '[class*="account_notice"]') && SUCCESS_TEXT.test(node.textContent || '')) return 'success';
    return null;
};

// Blok sesleri: bırakılan blok "taş" sesi çalar; başka bloğa birleşirse bunun yerine daha tok "thud" çalar.
// Blockly önce bırakma (END_DRAG), hemen ardından birleştirme (BLOCK_MOVE + newParentId) olayını verir;
// bu yüzden taş sesi çok kısa bekletilir ve birleşme gelirse iptal edilip thud çalınır.
const DROP_DELAY_MS = 35;
const createBlockSounds = (play, setTimer = setTimeout, clearTimer = clearTimeout) => {
    let pending = null;
    const cancel = () => {
        if (pending !== null) clearTimer(pending);
        pending = null;
    };
    return {
        handle: (event, events) => {
            if (!event || !events) return;
            if (event.type === events.END_DRAG) {
                cancel();
                if (event.isOutside) return;
                pending = setTimer(() => {
                    pending = null;
                    play('stone');
                }, DROP_DELAY_MS);
            } else if (pending !== null && event.type === events.BLOCK_MOVE && event.newParentId) {
                cancel();
                play('thud');
            }
        }
    };
};

const safeStorage = () => {
    try {
        return window.localStorage;
    } catch (e) {
        return null;
    }
};

// Sesler sayfa açılırken indirilip çözülür (Web Audio); çalarken ağ ya da çözme gecikmesi olmaz.
// Hazır değilse ya da Web Audio yoksa her seferinde yeni bir Audio öğesiyle çalınır.
let audioContext = null;
const buffers = {};

const preloadSounds = () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (audioContext || !Context || !window.fetch) return;
    try {
        audioContext = new Context();
    } catch (e) {
        audioContext = null;
        return;
    }
    Object.keys(FILES).forEach(name => {
        window.fetch(FILES[name])
            .then(response => response.arrayBuffer())
            .then(data => new Promise((resolve, reject) => audioContext.decodeAudioData(data, resolve, reject)))
            .then(buffer => {
                buffers[name] = buffer;
            })
            .catch(() => {});
    });
};

const playBuffer = name => {
    if (!audioContext || !buffers[name]) return false;
    try {
        // tarayıcılar sesi ilk kullanıcı hareketine kadar askıda tutar
        if (audioContext.state === 'suspended' && audioContext.resume) audioContext.resume();
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        gain.gain.value = VOLUME;
        source.buffer = buffers[name];
        source.connect(gain);
        gain.connect(audioContext.destination);
        source.start(0);
        return true;
    } catch (e) {
        return false;
    }
};

const defaultPlay = name => {
    if (playBuffer(name)) return;
    const audio = new window.Audio(FILES[name] || FILES.click);
    audio.volume = VOLUME;
    const result = audio.play();
    if (result && result.catch) result.catch(() => {});
};

const createUiSounds = (options = {}) => {
    const storage = 'storage' in options ? options.storage : safeStorage();
    const play = options.play || defaultPlay;
    const now = options.now || (() => Date.now());
    const listeners = [];
    let on = true;
    try {
        if (storage && storage.getItem(KEY) === 'off') on = false;
    } catch (e) {
        on = true;
    }
    let last = -Infinity;
    // force: art arda çalma sınırına takılmaz (ör. "Devam" tıklamasının hemen ardından gelen kutlama sesi)
    const playSound = (name, force) => {
        if (!on || !name) return;
        const t = now();
        if (!force && t - last < MIN_GAP_MS) return;
        last = t;
        play(name);
    };
    return {
        isOn: () => on,
        setOn: value => {
            on = Boolean(value);
            try {
                if (storage) storage.setItem(KEY, on ? 'on' : 'off');
            } catch (e) {
                // ayar yalnızca bu oturumda geçerli olur
            }
            listeners.slice().forEach(listener => listener(on));
        },
        subscribe: listener => {
            listeners.push(listener);
            return () => {
                const index = listeners.indexOf(listener);
                if (index >= 0) listeners.splice(index, 1);
            };
        },
        play: playSound,
        handle: target => {
            const name = soundFor(target);
            if (!name) return;
            playSound(name);
        }
    };
};

let shared = null;
const getUiSounds = () => {
    if (!shared) shared = createUiSounds();
    return shared;
};

// Sayfa açılırken bir kez çağrılır: tüm tıklamaları tek yerden dinler.
const initUiSounds = () => {
    const sounds = getUiSounds();
    preloadSounds();
    document.addEventListener('pointerdown', event => sounds.handle(event.target), true);
    if (window.MutationObserver) {
        new window.MutationObserver(mutations => {
            mutations.forEach(mutation => {
                Array.prototype.forEach.call(mutation.addedNodes, node => sounds.play(soundForAdded(node)));
            });
        }).observe(document.body, {childList: true, subtree: true});
    }
    return sounds;
};

export {soundFor, soundForAdded, createBlockSounds, createUiSounds, getUiSounds, initUiSounds};
