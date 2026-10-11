const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const catStart = [B.flag(), B.go(0, -130), B.setVar('can', 3)];
const catKeys = [
    [B.key('right arrow'), B.dx(10)],
    [B.key('left arrow'), B.dx(-10)]
];
const catOver = [
    B.flag(), B.wait(0.5), B.waitUntil(B.lt(B.variable('can'), 1)), B.say('Oyun bitti!', 2), B.stopAll()
];

const spawner = [B.flag(), B.hide(), B.forever([B.cloneOf('_myself_'), B.wait(1)])];
const fallingClone = body => [
    B.asClone(), B.go(B.random(-200, 200), 170), B.show(),
    B.repeatUntil(B.lt(B.ypos(), -170), body), B.deleteClone()
];
const hurt = () => B.if_(B.touching('Cool Cat'), [B.changeVar('can', -1), B.deleteClone()]);
const cat = list => ({'Cool Cat': list});

module.exports = lesson({
    id: 'gok-tasi-yagmuru',
    title: 'Gök taşı yağmuru',
    description: 'Üstüne yağan gök taşlarından kaç, canını koru ve ne kadar dayanabileceğini gör.',
    level: 'orta',
    order: 21,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['can'],
    steps: [
        step({
            text: 'Gök taşı yağmuru oyunu! "Kukla Seç" ile "Rocks" (gök taşı) kuklasını ekle. İstersen dekor olarak ' +
                '"Stars"ı seç. Kuklaların adını değiştirme!',
            hint: 'Kukla Seç düğmesi kukla listesinin yanındaki mavi dairedir.',
            guide: [G.ui('addSprite', 'Kukla ekle')]
        }),
        step({
            text: 'Canlarımızı tutacak bir değişken yapalım: Değişkenler kategorisinde "Değişken oluştur" de ve adına ' +
                'can yaz.',
            hint: 'Adı tam olarak "can" (küçük harflerle) yaz.',
            guide: [G.category('variables', 'Değişkenler')]
        }),
        step({
            text: 'Kediyi seç. "Yeşil bayrağa tıklandığında" altına "x: 0 y: -130 konumuna git" ve "can değişkenini 3 yap" ' +
                'blokları gelsin.',
            hint: 'Önce Olaylar\'dan yeşil bayrak, sonra Hareket ve Değişkenler kategorilerinden bloklar.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: cat([catStart]),
            focus: {sprite: 'Cool Cat', script: 0},
            outcome: {trigger: 'flag', expect: [{target: 'stage', prop: 'variable:can', op: 'eq', value: 3}]}
        }),
        step({
            text: 'Kediyi sağa sola yürütelim: "sağ ok tuşuna basılınca" → "x konumunu 10 değiştir" ve ' +
                '"sol ok tuşuna basılınca" → "x konumunu -10 değiştir" betikleri.',
            hint: 'Sol ok için değeri -10 yaz. Her betik ayrı bir olay bloğuyla başlar.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenkeypressed', 'Sürükle')],
            scripts: cat([catStart].concat(catKeys)),
            focus: [{sprite: 'Cool Cat', script: 1}, {sprite: 'Cool Cat', script: 2, exactOnly: ['DX']}]
        }),
        step({
            text: 'Gök taşını seç. "Yeşil bayrağa tıklandığında" altına "gizle", sonra "sürekli tekrarla": "kendim in ' +
                'ikizini yarat" ve "1 saniye bekle". Bu orijinal taş görünmeyecek, ikizleri yağacak!',
            hint: 'İkiz bloğu Kontrol kategorisinde; menüdeki "kendim" seçeneği zaten doğru olan.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_create_clone_of', 'Sürükle')],
            scripts: {'Cool Cat': [catStart].concat(catKeys), Rocks: [spawner]},
            focus: {sprite: 'Rocks', script: 0}
        }),
        step({
            text: 'İkizler nasıl düşsün? "ikiz olarak başladığımda" bloğuyla yeni bir betik yap: "x: (rastgele) y: 170 ' +
                'konumuna git", "göster", "y konumu < -170 olana kadar tekrarla: y konumunu -5 değiştir", sonra "bu ikizi sil".',
            hint: '"… olana kadar tekrarla" bloğu Kontrol kategorisinde. Düşen taşlar yere inince silinir.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_start_as_clone', 'Sürükle')],
            scripts: {'Cool Cat': [catStart].concat(catKeys), Rocks: [spawner, fallingClone([B.dy(-5)])]},
            focus: {sprite: 'Rocks', script: 1, exactOnly: ['DY', 'OPERAND2']},
            wrong: [{scripts: {'Cool Cat': [catStart].concat(catKeys), Rocks: [spawner, fallingClone([B.dy(5)])]}}]
        }),
        step({
            text: 'Taş kediye değerse can kaybedelim! Tekrarlama döngüsünün içine, y konumunu değiştir bloğunun altına ' +
                '"eğer … ise" koy: koşul "Cool Cat e değiyor mu?", içine "can i -1 kadar değiştir" ve "bu ikizi sil".',
            hint: 'Can değişkenini -1 değiştirmek, canı bir azaltır. Eksi işaretini unutma.',
            guide: [G.category('sensing', 'Algılama'), G.drag('control_if', 'Sürükle')],
            scripts: {'Cool Cat': [catStart].concat(catKeys), Rocks: [spawner, fallingClone([B.dy(-5), hurt()])]},
            focus: {sprite: 'Rocks', script: 1, exactOnly: ['DY', 'OPERAND2', 'VALUE']}
        }),
        step({
            text: 'Canlar bitince oyun bitsin! Kedide yeni bir betik yap: "Yeşil bayrağa tıklandığında", "0.5 saniye bekle", ' +
                'sonra "can < 1 olana kadar bekle", "2 saniye boyunca Oyun bitti! de" ve "durdur (tümü)".',
            hint: '"… olana kadar bekle" bloğu Kontrol kategorisinde; koşul kutusuna "can < 1" yaz (can Değişkenler\'de).',
            guide: [G.category('control', 'Kontrol'), G.drag('control_wait_until', 'Sürükle')],
            scripts: {'Cool Cat': [catStart].concat(catKeys, [catOver]), Rocks: [spawner, fallingClone([B.dy(-5), hurt()])]},
            focus: {sprite: 'Cool Cat', script: 3}
        }),
        step({
            text: 'Oyun hazır! Yeşil bayrağa tıkla ve taşlardan kaç. Zorlaştırmak için taşların hızını artır: ' +
                '"y konumunu -5 değiştir" yerine -8 yaz, ya da ikiz oluşturma süresini 1 saniyeden 0.5 saniyeye indir.',
            hint: 'Taşlar ne kadar hızlı ve sık düşerse oyun o kadar zorlaşır.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
