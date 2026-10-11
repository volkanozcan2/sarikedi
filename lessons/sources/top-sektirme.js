const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const paddle = [B.flag(), B.go(0, -150), B.forever([B.setX(B.mouseX())])];
const bounceOff = body => B.if_(B.touching('Paddle'), body);
const missed = () => B.if_(B.lt(B.ypos(), -150), [B.say('Kaçırdın!', 2), B.stopAll()]);
const hit = [B.point(B.sub(180, B.direction())), B.move(10)];

const ball = body => [B.flag(), B.go(0, 0), B.point(45), B.forever(body)];
const ballScoring = body => [B.flag(), B.setVar('skor', 0), B.go(0, 0), B.point(45), B.forever(body)];

module.exports = lesson({
    id: 'top-sektirme',
    title: 'Top sektirme (Pong)',
    description: 'Fareyle raketi yönet, topu düşürmeden sektir ve puan topla.',
    level: 'orta',
    order: 22,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['skor'],
    steps: [
        step({
            text: 'Klasik Pong oyunu yapacağız! "Kukla Seç" ile önce "Ball" (top), sonra "Paddle" (raket) ' +
                'kuklalarını ekle. Cool Cat bu oyunda gerekmiyor: istersen çöp kutusuyla silebilirsin. ' +
                'Kuklaların adını değiştirme!',
            hint: 'İki kukla da kukla kütüphanesinde var.',
            guide: [G.ui('addSprite', 'Kukla ekle')]
        }),
        step({
            text: 'Raketi seç. "Yeşil bayrağa tıklandığında" altına "x: 0 y: -150 konumuna git"; sonra sürekli tekrarla: ' +
                '"x konumunu (farenin x i) yap" ki raket fareyle birlikte hareket etsin.',
            hint: 'Farenin x i Algılama kategorisindeki yuvarlak bir bloktur; "x konumunu … yap" bloğunun kutusuna bırak.',
            guide: [G.category('sensing', 'Algılama'), G.drag('motion_setx', 'Sürükle')],
            scripts: {Paddle: [paddle]},
            focus: {sprite: 'Paddle', script: 0}
        }),
        step({
            text: 'Şimdi topu seç. Yeşil bayrakta "x: 0 y: 0 konumuna git", "45 yönüne dön", sonra sürekli tekrarla: ' +
                '"6 adım git" ve "kenara geldiyse sek".',
            hint: '"Kenara geldiyse sek" bloğu Hareket kategorisinin altlarında; top duvarlardan sekecek.',
            guide: [G.category('motion', 'Hareket'), G.drag('motion_ifonedgebounce', 'Sürükle')],
            scripts: {Paddle: [paddle], Ball: [ball([B.move(6), B.bounce()])]},
            focus: {sprite: 'Ball', script: 0}
        }),
        step({
            text: 'Top rakete çarpınca yukarı sekmeli. Döngüye "eğer … ise" ekle: koşul "Paddle e değiyor mu?", içine ' +
                '"(180 - yön) yönüne dön" ve "10 adım git".',
            hint: 'Çıkarma bloğu Operatörler\'de, "yön" Hareket kategorisinde. Soldaki kutuya 180 yaz.',
            guide: [G.category('operators', 'Operatörler'), G.drag('control_if', 'Sürükle')],
            scripts: {Paddle: [paddle], Ball: [ball([B.move(6), B.bounce(), bounceOff(hit)])]},
            focus: {sprite: 'Ball', script: 0, exactOnly: ['NUM1']},
            wrong: [{scripts: {Paddle: [paddle], Ball: [ball([B.move(6), B.bounce(),
                bounceOff([B.point(B.sub(0, B.direction())), B.move(10)])])]}}]
        }),
        step({
            text: 'Topu kaçırırsan oyun bitsin! Döngüye bir "eğer … ise" daha ekle: koşul "y konumu < -150", içine ' +
                '"2 saniye boyunca Kaçırdın! de" ve "durdur (tümü)".',
            hint: 'Raket y = -150\'de duruyor; top ondan daha aşağı inerse kaçırmışsındır.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_if', 'Sürükle')],
            scripts: {Paddle: [paddle], Ball: [ball([B.move(6), B.bounce(), bounceOff(hit), missed()])]},
            focus: {sprite: 'Ball', script: 0, exactOnly: ['NUM1', 'OPERAND2']}
        }),
        step({
            text: 'Puan tutmak için "skor" adında bir değişken oluştur: Değişkenler kategorisinde "Değişken oluştur", ' +
                'adı skor.',
            hint: 'Adı küçük harflerle ve tam olarak "skor" yaz.',
            guide: [G.category('variables', 'Değişkenler')]
        }),
        step({
            text: 'Her başarılı vuruşta 1 puan! Topun yeşil bayrak betiğinde "x: 0 y: 0" öncesine "skor değişkenini 0 yap" ' +
                'koy; raketle çarpışma bloğunun sonuna da "skor i 1 kadar değiştir" ekle.',
            hint: 'Skoru başta sıfırla, sonra her çarpışmada 1 artır.',
            guide: [G.category('variables', 'Değişkenler'), G.drag('data_changevariableby', 'Sürükle')],
            scripts: {
                Paddle: [paddle],
                Ball: [ballScoring([B.move(6), B.bounce(), bounceOff(hit.concat([B.changeVar('skor', 1)])), missed()])]
            },
            focus: {sprite: 'Ball', script: 0, exactOnly: ['NUM1', 'OPERAND2']}
        }),
        step({
            text: 'Oyun hazır! Yeşil bayrağa tıkla, raketi fareyle yönet ve en yüksek skoru yapmaya çalış. Zorlaştırmak ' +
                'için topun "6 adım git" bloğundaki sayıyı büyüt!',
            hint: 'Top ne kadar hızlıysa o kadar zor olur; 8 ya da 10 dene.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
