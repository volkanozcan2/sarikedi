const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const gravity = body => [
    B.flag(), B.go(-150, 0), B.setVar('hiz', 0),
    B.forever([B.changeVar('hiz', -1), B.dy(B.variable('hiz'))].concat(body))
];
const flap = [B.key('space'), B.setVar('hiz', 12)];
const outOfBounds = () => B.if_(B.or(B.lt(B.ypos(), -170), B.gt(B.ypos(), 170)),
    [B.say('Oyun bitti!', 2), B.stopAll()]);

const respawn = () => B.go(240, B.random(-150, 150));
const rock = body => [B.flag(), B.setVar('skor', 0), respawn(), B.forever(body)];
const crash = () => B.if_(B.touching('Cool Cat'), [B.say('Çarptın!', 2), B.stopAll()]);
const leaves = () => B.if_(B.lt(B.xpos(), -240), [respawn(), B.changeVar('skor', 1)]);



module.exports = lesson({
    id: 'ucan-kedi',
    title: 'Uçan kedi',
    description: 'Yer çekimi ve zıplama mantığını öğren, engellerin arasından geçen bir uçan kedi oyunu yap.',
    level: 'ileri',
    order: 30,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['hiz', 'skor'],
    steps: [
        step({
            text: 'Uçan kedi oyunu! "Kukla Seç" ile engel olarak "Rocks" (taş) kuklasını ekle. Dekor olarak ' +
                '"Stars" ya da "Blue Sky" seçebilirsin. Kuklaların adını değiştirme!',
            hint: 'Kukla Seç düğmesi kukla listesinin yanındaki mavi dairedir.',
            guide: [G.ui('addSprite', 'Kukla ekle')]
        }),
        step({
            text: 'İki değişken oluştur: "hiz" (kedinin düşme/yükselme hızı) ve "skor". Değişkenler kategorisinde ' +
                '"Değişken oluştur" ile ikisini de "tüm kuklalar için" yap.',
            hint: 'İsimleri küçük harflerle ve tam olarak "hiz" ve "skor" yaz (hiz\'de Türkçe ı harfi yok).',
            guide: [G.category('variables', 'Değişkenler')]
        }),
        step({
            text: 'Yer çekimi! Kediyi seç. "Yeşil bayrağa tıklandığında" altına "x: -150 y: 0 konumuna git", "hiz ' +
                'değişkenini 0 yap"; sonra "sürekli tekrarla": "hiz i -1 kadar değiştir" ve "y konumunu (hiz) ' +
                'değiştir". Kedi aşağı düşmeye başlamalı!',
            hint: 'hiz her seferinde 1 azalır, kedi her seferinde daha hızlı düşer. "hiz" değişkenini y konumunu ' +
                'değiştir bloğunun kutusuna bırak. Değişken bloklarının menüsünden hiz\'i seç.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_forever', 'Sürükle')],
            scripts: {'Cool Cat': [gravity([])]},
            focus: {sprite: 'Cool Cat', script: 0, exactOnly: ['VALUE']},
            outcome: {trigger: 'flag', waitMs: 500, expect: [{target: 'Cool Cat', prop: 'y', op: 'lt', value: 0}]},
            wrong: [{scripts: {'Cool Cat': [[B.flag(), B.go(-150, 0), B.setVar('hiz', 0),
                B.forever([B.changeVar('hiz', 1), B.dy(B.variable('hiz'))])]]}}]
        }),
        step({
            text: 'Kanat çırpma! Yeni bir betik yap: "boşluk tuşuna basılınca" → "hiz değişkenini 12 yap". Böylece ' +
                'boşluğa her bastığında kedi yukarı fırlar.',
            hint: 'hiz pozitif olunca kedi yukarı çıkar, sonra yer çekimi onu yavaşlatıp tekrar düşürür.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenkeypressed', 'Sürükle')],
            scripts: {'Cool Cat': [gravity([]), flap]},
            focus: {sprite: 'Cool Cat', script: 1}
        }),
        step({
            text: 'Ekranın dışına çıkarsan oyun bitsin! Yer çekimi döngüsüne "eğer … ise" ekle: koşul (bu sırayla) "y konumu < -170 ' +
                'veya y konumu > 170", içine "2 saniye boyunca Oyun bitti! de" ve "durdur (tümü)".',
            hint: '"veya" bloğu Operatörler kategorisinde; iki karşılaştırmayı birleştirir. Böylece kedi hem aşağıda ' +
                'hem yukarıda sınırı geçemez.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_if', 'Sürükle')],
            scripts: {'Cool Cat': [gravity([outOfBounds()]), flap]},
            focus: {sprite: 'Cool Cat', script: 0, exactOnly: ['VALUE', 'OPERAND2']}
        }),
        step({
            text: 'Engel gelsin! Taşı seç. "Yeşil bayrağa tıklandığında" altına "skor değişkenini 0 yap", ' +
                '"x: 240 y: (-150 ile 150 arasında rastgele bir sayı) konumuna git"; sonra "sürekli tekrarla": ' +
                '"x konumunu -5 değiştir".',
            hint: 'Taş sağdan başlayıp sola doğru ilerleyecek. Rastgele sayı bloğu Operatörler kategorisinde.',
            guide: [G.category('motion', 'Hareket'), G.drag('motion_changexby', 'Sürükle')],
            scripts: {'Cool Cat': [gravity([outOfBounds()]), flap], Rocks: [rock([B.dx(-5)])]},
            focus: {sprite: 'Rocks', script: 0, exactOnly: ['DX']},
            wrong: [{scripts: {'Cool Cat': [gravity([outOfBounds()]), flap], Rocks: [rock([B.dx(5)])]}}]
        }),
        step({
            text: 'Taş ekranın solundan çıkınca yeniden sağdan gelsin ve puan kazan! Döngünün içine, "x konumunu ' +
                'değiştir" bloğunun altına "eğer x konumu < -240 ise" koy; içine "x: 240 y: (rastgele) konumuna git" ' +
                've "skor i 1 kadar değiştir".',
            hint: 'x konumu Hareket kategorisinin altında yuvarlak bir bloktur. Her geçişte 1 puan kazanırsın.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_if', 'Sürükle')],
            scripts: {'Cool Cat': [gravity([outOfBounds()]), flap], Rocks: [rock([B.dx(-5), leaves()])]},
            focus: {sprite: 'Rocks', script: 0, exactOnly: ['DX', 'OPERAND2']}
        }),
        step({
            text: 'Taşa çarparsan oyun bitsin! Taşın döngüsüne "eğer … ise" ekle: koşul "Cool Cat e değiyor mu?", içine ' +
                '"2 saniye boyunca Çarptın! de" ve "durdur (tümü)".',
            hint: '"… e değiyor mu?" bloğu Algılama kategorisinde, menüden Cool Cat\'i seç.',
            guide: [G.category('sensing', 'Algılama'), G.drag('control_if', 'Sürükle')],
            scripts: {'Cool Cat': [gravity([outOfBounds()]), flap], Rocks: [rock([B.dx(-5), leaves(), crash()])]},
            focus: {sprite: 'Rocks', script: 0, exactOnly: ['DX', 'OPERAND2']}
        }),
        step({
            text: 'Oyun hazır! Yeşil bayrağa tıkla ve boşluk tuşuyla kediyi taşların arasından geçir. Daha zor olsun ister ' +
                'misin? Taşın "x konumunu -5 değiştir" bloğundaki sayıyı -8 yap ya da zıplama gücünü (12) değiştir.',
            hint: 'Zıplama gücü büyürse kedi daha yükseğe çıkar ama kontrolü zorlaşır.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
