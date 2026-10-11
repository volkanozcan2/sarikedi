/**
 * @fileoverview
 * Backend hazır olmadan oynatıcıyı denemek için örnek dersler
 * (`?lessons=sample` ile kullanılır). Şemaya uygundur; testle doğrulanır.
 */

const ANY = {any: true};

const flagThenMove = {
    opcode: 'event_whenflagclicked',
    fields: {},
    inputs: {},
    next: {
        opcode: 'motion_movesteps',
        fields: {},
        inputs: {STEPS: {literal: ANY}},
        next: null
    }
};

const moveOnly = {
    opcode: 'motion_movesteps',
    fields: {},
    inputs: {STEPS: {literal: ANY}},
    next: null
};

const repeatMove = {
    opcode: 'control_repeat',
    fields: {},
    inputs: {
        TIMES: {literal: ANY},
        SUBSTACK: {
            opcode: 'motion_movesteps',
            fields: {},
            inputs: {STEPS: {literal: ANY}},
            next: null
        }
    },
    next: null
};

const SAMPLE_LESSONS = [
    {
        id: 'ilk-ders',
        title: 'Kediyi yürüt',
        description: 'İlk bloklarını sürükle ve kediyi hareket ettir.',
        level: 'baslangic',
        cover: null,
        order: 0,
        published: true,
        startProject: null,
        steps: [
            {
                text: 'Merhaba! Önce Hareket kategorisini bulalım. Soldaki mavi "Hareket" düğmesine tıkla.',
                media: null,
                hint: 'Soldaki listede en üstteki mavi daire.',
                checks: [],
                guide: [{type: 'click', target: {kind: 'category', id: 'motion'}, label: 'Buraya tıkla'}]
            },
            {
                text: '"10 adım git" bloğunu çalışma alanına sürükle.',
                media: null,
                hint: 'Mavi bloğu fareyle tutup ortadaki boş alana bırak.',
                checks: [{type: 'blocks', pattern: moveOnly}],
                guide: [{
                    type: 'drag',
                    from: {kind: 'block', opcode: 'motion_movesteps'},
                    to: {kind: 'workspace'},
                    label: 'Sürükle'
                }]
            },
            {
                text: '"Yeşil bayrak tıklanınca" bloğunu bul ve "10 adım git" bloğunun üstüne tak. ' +
                    'Sonra yeşil bayrağa tıkla!',
                media: null,
                hint: 'Sarı Olaylar kategorisindeki ilk blok.',
                checks: [
                    {type: 'blocks', pattern: flagThenMove},
                    {
                        type: 'outcome',
                        trigger: 'flag',
                        waitMs: 600,
                        expect: [{target: '', prop: 'x', op: 'gt', value: 5}]
                    }
                ],
                guide: [
                    {type: 'click', target: {kind: 'category', id: 'events'}, label: 'Olaylar'},
                    {type: 'click', target: {kind: 'ui', id: 'greenFlag'}, label: 'Sonra buraya'}
                ]
            }
        ]
    },
    {
        id: 'tekrar-et',
        title: 'Tekrarla',
        description: 'Aynı işi tekrar tekrar yaptır.',
        level: 'orta',
        cover: null,
        order: 1,
        published: true,
        startProject: null,
        steps: [
            {
                text: 'Bir komutu tekrarlamak için "tekrarla" bloğunu kullanırız. Hazır mısın?',
                media: null,
                hint: null,
                checks: [],
                guide: []
            },
            {
                text: '"10 kez tekrarla" bloğunun içine bir "10 adım git" bloğu koy.',
                media: null,
                hint: 'Turuncu Kontrol kategorisinde.',
                checks: [{type: 'blocks', pattern: repeatMove}],
                guide: [{type: 'click', target: {kind: 'category', id: 'control'}, label: 'Kontrol'}]
            }
        ]
    }
];

export {
    SAMPLE_LESSONS
};
