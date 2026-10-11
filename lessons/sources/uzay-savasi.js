const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const shipStart = [B.flag(), B.go(0, -140)];
const shipKeys = [
    [B.key('right arrow'), B.dx(10)],
    [B.key('left arrow'), B.dx(-10)]
];
const shipFire = [B.key('space'), B.cloneOf('Ball')];
const bulletHide = [B.flag(), B.hide(), B.size(20)];
const bulletClone = [B.asClone(), B.goTo('Rocketship'), B.show(), B.repeat(30, [B.dy(10)]), B.deleteClone()];

const respawn = () => B.go(B.random(-200, 200), 170);
const reset = () => B.if_(B.lt(B.ypos(), -170), [respawn()]);
const hitByBullet = () => B.if_(B.touching('Ball'), [B.changeVar('skor', 1), respawn()]);
const crash = () => B.if_(B.touching('Rocketship'), [B.say('Oyun bitti!', 2), B.stopAll()]);
const rocks = body => [B.flag(), B.setVar('skor', 0), respawn(), B.forever(body)];

const ship = [shipStart].concat(shipKeys);

module.exports = lesson({
    id: 'uzay-savasi',
    title: 'Uzay savaşı: gök taşı avı',
    description: 'Uzay gemini yönet, boşluk tuşuyla ateş et ve üstüne düşen gök taşlarını vur.',
    level: 'orta',
    order: 23,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['skor'],
    steps: [
        step({
            text: 'Uzay savaşı oyunu! "Kukla Seç" ile üç kukla ekle: "Rocketship" (uzay gemisi), "Ball" (mermi olarak ' +
                'kullanacağız) ve "Rocks" (gök taşı). Dekor olarak da "Stars"ı seçebilirsin. Cool Cat\'i çöp kutusuyla ' +
                'silebilirsin. Kuklaların adını değiştirme!',
            hint: 'Kukla Seç düğmesine üç kez tıklaman gerekecek.',
            guide: [G.ui('addSprite', 'Kukla ekle')]
        }),
        step({
            text: 'Skor için "skor" adında bir değişken oluştur: Değişkenler kategorisinde "Değişken oluştur".',
            hint: 'Adı tam olarak "skor" (küçük harflerle) yaz.',
            guide: [G.category('variables', 'Değişkenler')]
        }),
        step({
            text: 'Gemiyi seç. "Yeşil bayrağa tıklandığında" altına "x: 0 y: -140 konumuna git"; ayrıca ' +
                '"sağ ok tuşuna basılınca" → "x konumunu 10 değiştir" ve "sol ok tuşuna basılınca" → ' +
                '"x konumunu -10 değiştir" betiklerini yap.',
            hint: 'Sol ok için değeri -10 yaz. Her betik ayrı bir şapka bloğuyla başlar.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: {Rocketship: ship},
            focus: [
                {sprite: 'Rocketship', script: 0},
                {sprite: 'Rocketship', script: 1},
                {sprite: 'Rocketship', script: 2, exactOnly: ['DX']}
            ]
        }),
        step({
            text: 'Mermiyi seç (Ball). "Yeşil bayrağa tıklandığında" altına "gizle" ve "boyutu % 20 yap": mermi şablonu ' +
                'görünmesin.',
            hint: 'Gizle bloğu Görünüm kategorisinde.',
            guide: [G.category('looks', 'Görünüm'), G.drag('looks_hide', 'Sürükle')],
            scripts: {Rocketship: ship, Ball: [bulletHide]},
            focus: {sprite: 'Ball', script: 0}
        }),
        step({
            text: 'Gemiyi seç ve ateş ettir: "boşluk tuşuna basılınca" → "Ball un ikizini yarat".',
            hint: 'İkiz bloğu Kontrol kategorisinde; menüden "Ball"u seç (kendim değil!). Tuş menüsünden boşluğu seç.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_create_clone_of', 'Sürükle')],
            scripts: {Rocketship: ship.concat([shipFire]), Ball: [bulletHide]},
            focus: {sprite: 'Rocketship', script: 3},
            wrong: [{scripts: {Rocketship: ship.concat([[B.key('space'), B.cloneOf('_myself_')]]), Ball: [bulletHide]}}]
        }),
        step({
            text: 'Mermiyi seç. İkiz oluşunca: "Rocketship e git", "göster", "30 defa tekrarla: y konumunu 10 değiştir" ve ' +
                'en sonda "bu ikizi sil".',
            hint: '"ikiz olarak başladığımda" şapka bloğu Kontrol kategorisinde. Mermi gemiden yukarı doğru uçar.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_start_as_clone', 'Sürükle')],
            scripts: {Rocketship: ship.concat([shipFire]), Ball: [bulletHide, bulletClone]},
            focus: {sprite: 'Ball', script: 1}
        }),
        step({
            text: 'Gök taşını seç (Rocks). "Yeşil bayrağa tıklandığında" altına "skor değişkenini 0 yap", ' +
                '"x: (-200 ile 200 arasında rastgele bir sayı) y: 170 konumuna git", sonra "sürekli tekrarla": ' +
                '"y konumunu -3 değiştir" ve "eğer y konumu < -170 ise" yeniden tepeye çık (aynı git bloğu).',
            hint: 'Yıldız yakala dersindeki düşen yıldızla aynı mantık. Rastgele sayı Operatörler\'de.',
            guide: [G.category('motion', 'Hareket'), G.drag('motion_changeyby', 'Sürükle')],
            scripts: {Rocketship: ship.concat([shipFire]), Ball: [bulletHide, bulletClone],
                Rocks: [rocks([B.dy(-3), reset()])]},
            focus: {sprite: 'Rocks', script: 0, exactOnly: ['DY', 'OPERAND2']},
            wrong: [{scripts: {Rocketship: ship.concat([shipFire]), Ball: [bulletHide, bulletClone],
                Rocks: [rocks([B.dy(3), reset()])]}}]
        }),
        step({
            text: 'Mermi gök taşına çarpınca puan kazan! Gök taşının döngüsüne "eğer … ise" ekle: koşul "Ball e ' +
                'değiyor mu?", içine "skor i 1 kadar değiştir" ve gök taşını yeniden tepeye gönderen blok.',
            hint: 'İkizler de "Ball" sayılır, o yüzden mermiye değmek yeterli. Menüden Ball\'u seç.',
            guide: [G.category('sensing', 'Algılama'), G.drag('control_if', 'Sürükle')],
            scripts: {Rocketship: ship.concat([shipFire]), Ball: [bulletHide, bulletClone],
                Rocks: [rocks([B.dy(-3), reset(), hitByBullet()])]},
            focus: {sprite: 'Rocks', script: 0, exactOnly: ['DY', 'OPERAND2']}
        }),
        step({
            text: 'Gök taşı gemiye çarparsa oyun bitsin: döngüye bir "eğer … ise" daha ekle. Koşul "Rocketship e değiyor ' +
                'mu?", içine "2 saniye boyunca Oyun bitti! de" ve "durdur (tümü)".',
            hint: 'Kontrol kategorisindeki "durdur" bloğunun menüsünden "tümü"nü seç.',
            guide: [G.category('looks', 'Görünüm'), G.drag('looks_sayforsecs', 'Sürükle')],
            scripts: {Rocketship: ship.concat([shipFire]), Ball: [bulletHide, bulletClone],
                Rocks: [rocks([B.dy(-3), reset(), hitByBullet(), crash()])]},
            focus: {sprite: 'Rocks', script: 0, exactOnly: ['DY', 'OPERAND2']}
        }),
        step({
            text: 'Oyun hazır! Yeşil bayrağa tıkla, ok tuşlarıyla gemiyi yönlendir, boşluk tuşuyla ateş et. Daha ' +
                'zor olsun ister misin? Gök taşının "y konumunu -3 değiştir" bloğundaki sayıyı -5 yap!',
            hint: 'Düşme hızı arttıkça oyun zorlaşır.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
