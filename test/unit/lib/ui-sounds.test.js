import {soundFor, soundForAdded, createBlockSounds, createUiSounds} from '../../../src/lib/ui-sounds';

const el = (html, selector) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    return root.querySelector(selector);
};

describe('ui-sounds: hangi öğe hangi sesi çalar', () => {
    test('menü çubuğu öğesi ve menü öğesi tık sesi çalar', () => {
        expect(soundFor(el('<div class="menu-bar_menu-bar-item_NKeCD"><span id="a">Dosya</span></div>', '#a'))).toBe('click');
        expect(soundFor(el('<ul class="menu_menu_x"><li class="menu_menu-item_abc12" id="b">Yeni</li></ul>', '#b'))).toBe('click');
    });

    test('düğmeler tık sesi çalar', () => {
        expect(soundFor(el('<button id="c">Tamam</button>', '#c'))).toBe('click');
        expect(soundFor(el('<div role="button" id="d">x</div>', '#d'))).toBe('click');
    });

    test('sekme ve kukla seçimi yerleşme sesi çalar', () => {
        expect(soundFor(el('<li class="gui_tab_Qw12e" id="e">Kod</li>', '#e'))).toBe('snap');
        expect(soundFor(el('<div class="sprite-selector-item_sprite-selector-item_a1b2c"><i id="f"></i></div>', '#f'))).toBe('snap');
    });

    test('kategori sütunu (Hareket, Görünüm...) yerleşme sesi çalar', () => {
        expect(soundFor(el('<div class="blocklyToolboxDiv"><div class="scratchCategoryMenuItem" id="m"><span id="m2">x</span></div></div>', '#m2'))).toBe('snap');
    });

    test('flyout düğmesi (Değişken oluştur) tık sesi çalar', () => {
        expect(soundFor(el('<div class="blocklyFlyout"><g class="blocklyFlyoutButton" id="p"><text id="p2"></text></g></div>', '#p2'))).toBe('click');
    });

    test('blok çalışma alanı ve sahnede ses çalmaz', () => {
        expect(soundFor(el('<div class="blocklyWorkspace"><button id="g">x</button></div>', '#g'))).toBe(null);
        expect(soundFor(el('<canvas id="h"></canvas>', '#h'))).toBe(null);
        expect(soundFor(el('<div class="sound-editor_editor-container_x"><button id="s">x</button></div>', '#s'))).toBe(null);
    });

    test('etkileşimsiz öğede ses çalmaz', () => {
        expect(soundFor(el('<p id="i">metin</p>', '#i'))).toBe(null);
    });
});

describe('ui-sounds: blok bırakma ve birleştirme sesleri', () => {
    const events = {END_DRAG: 'endDrag', BLOCK_MOVE: 'move'};
    const makeTimers = () => {
        const queue = [];
        return {
            set: fn => {
                queue.push(fn);
                return queue.length;
            },
            clear: id => {
                queue[id - 1] = null;
            },
            flush: () => queue.splice(0).forEach(fn => fn && fn())
        };
    };
    const setup = () => {
        const played = [];
        const timers = makeTimers();
        const sounds = createBlockSounds(name => played.push(name), timers.set, timers.clear);
        return {played, timers, sounds};
    };

    test('serbest bırakılan blok taş sesi çalar', () => {
        const {played, timers, sounds} = setup();
        sounds.handle({type: 'endDrag', isOutside: false}, events);
        expect(played).toEqual([]);
        timers.flush();
        expect(played).toEqual(['stone']);
    });

    test('başka bloğa birleşen blok yalnızca daha tok bas "thud" sesi çalar', () => {
        const {played, timers, sounds} = setup();
        sounds.handle({type: 'endDrag', isOutside: false}, events);
        sounds.handle({type: 'move', newParentId: 'ust-blok'}, events);
        timers.flush();
        expect(played).toEqual(['thud']);
    });

    test('çalışma alanı dışına bırakılınca ve bırakmadan gelen taşıma olaylarında ses yok', () => {
        const {played, timers, sounds} = setup();
        sounds.handle({type: 'endDrag', isOutside: true}, events);
        sounds.handle({type: 'move', newParentId: 'ust-blok'}, events); // bırakma yok: örn. geri al
        sounds.handle({type: 'move'}, events);
        timers.flush();
        expect(played).toEqual([]);
    });

    test('birleşmeden sonra gelen ikinci taşıma olayı ikinci ses çalmaz', () => {
        const {played, timers, sounds} = setup();
        sounds.handle({type: 'endDrag', isOutside: false}, events);
        sounds.handle({type: 'move', newParentId: 'a'}, events);
        sounds.handle({type: 'move', newParentId: 'b'}, events);
        timers.flush();
        expect(played).toEqual(['thud']);
    });
});

describe('ui-sounds: eyleme özel sesler', () => {
    test('silme onayında "evet" silme sesi, "hayır" geri sesi çalar', () => {
        expect(soundFor(el('<button class="delete-confirmation-prompt_ok-button_V6bX5" id="a1">evet</button>', '#a1'))).toBe(null);
        expect(soundFor(el('<button class="delete-confirmation-prompt_cancel-button_x1y2z" id="a2">hayır</button>', '#a2'))).toBe('back');
    });

    test('çöp kutusu simgesi uyarı sesi, sağ tık "sil" silme sesi çalar', () => {
        expect(soundFor(el('<div class="sprite-selector-item_sprite-selector-item_a1b2c"><div class="delete-button_delete-button_q1w2e" id="a3"></div></div>', '#a3'))).toBe('warn');
        expect(soundFor(el('<div class="context-menu_menu-item_a1b2c context-menu_menu-item-danger_z9y8x" id="a4">sil</div>', '#a4'))).toBe(null);
        expect(soundFor(el('<div class="selector_list-item_x"><div class="delete-button_delete-button_q1w2e" id="a5"></div></div>', '#a5'))).toBe(null);
    });

    test('bayrak başlat, durdur durdurma sesi çalar', () => {
        expect(soundFor(el('<img class="green-flag_green-flag_Ab12c" id="a5">', '#a5'))).toBe('start');
        expect(soundFor(el('<img class="stop-all_stop-all_Ab12c" id="a6">', '#a6'))).toBe('stop');
    });

    test('kukla/kostüm ekleme menüsü ve kütüphane seçimi pop sesi çalar', () => {
        expect(soundFor(el('<button class="action-menu_more-button_a1b2c" id="a7"></button>', '#a7'))).toBe('pop');
        expect(soundFor(el('<div class="library-item_library-item_a1b2c" id="a8"></div>', '#a8'))).toBe('pop');
    });

    test('onay kutusu ve anahtar düğmeleri aç/kapa sesi çalar', () => {
        expect(soundFor(el('<input type="checkbox" id="a9">', '#a9'))).toBe('toggle');
        expect(soundFor(el('<button class="toggle-buttons_button_a1b2c" id="b1"></button>', '#b1'))).toBe('toggle');
    });

    test('pencere kapatma düğmesi geri sesi çalar', () => {
        expect(soundFor(el('<div class="close-button_close-button_a1b2c" id="b2"></div>', '#b2'))).toBe('back');
    });
});

describe('ui-sounds: yeni eklenen öğelerden gelen sesler', () => {
    const node = html => {
        const root = document.createElement('div');
        root.innerHTML = html;
        return root.firstChild;
    };

    test('pencere açılınca açılış sesi; yükleniyor penceresinde ses yok', () => {
        expect(soundForAdded(node('<div class="ReactModal__Overlay"><div>içerik</div></div>'))).toBe('open');
        expect(soundForAdded(node('<div class="ReactModal__Overlay"><div class="loader_block-animation_x1"></div></div>'))).toBe(null);
    });

    test('hata mesajı hata sesi, başarı mesajı başarı sesi çalar', () => {
        expect(soundForAdded(node('<div class="account_error_a1b2c">Şifre yanlış</div>'))).toBe('error');
        expect(soundForAdded(node('<div class="account_notice_a1b2c">"Oyunum" kaydedildi ve sınıfınla paylaşıldı.</div>'))).toBe('success');
    });

    test('nötr bilgi mesajında ve alakasız öğede ses yok', () => {
        expect(soundForAdded(node('<div class="account_notice_a1b2c">Projede değişiklik yapmadın.</div>'))).toBe(null);
        expect(soundForAdded(node('<p>metin</p>'))).toBe(null);
        expect(soundForAdded(null)).toBe(null);
    });
});

describe('ui-sounds: açma/kapama ve çalma', () => {
    const makeStorage = initial => {
        const data = Object.assign({}, initial);
        return {getItem: k => (k in data ? data[k] : null), setItem: (k, v) => {
            data[k] = v;
        }};
    };

    test('varsayılan açık; kapatılınca çalmaz ve ayar saklanır', () => {
        const played = [];
        const storage = makeStorage();
        const sounds = createUiSounds({storage: storage, play: name => played.push(name), now: () => 1000});
        expect(sounds.isOn()).toBe(true);
        sounds.handle(el('<button id="j">x</button>', '#j'));
        expect(played).toEqual(['click']);
        sounds.setOn(false);
        sounds.handle(el('<button id="k">x</button>', '#k'));
        expect(played).toEqual(['click']);
        expect(createUiSounds({storage: storage, play: () => {}}).isOn()).toBe(false);
    });

    test('çok kısa aralıkla art arda çalmaz', () => {
        const played = [];
        let t = 1000;
        const sounds = createUiSounds({storage: makeStorage(), play: name => played.push(name), now: () => t});
        const button = el('<button id="l">x</button>', '#l');
        sounds.handle(button);
        t += 10;
        sounds.handle(button);
        t += 100;
        sounds.handle(button);
        expect(played).toEqual(['click', 'click']);
    });

    test('açıkken doğrudan yerleşme sesi çalabilir', () => {
        const played = [];
        const sounds = createUiSounds({storage: makeStorage(), play: name => played.push(name), now: () => 1000});
        sounds.play('snap');
        expect(played).toEqual(['snap']);
        sounds.setOn(false);
        sounds.play('snap');
        expect(played).toEqual(['snap']);
    });
});
