const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const catKeys = [
    [B.key('right arrow'), B.dx(10)],
    [B.key('left arrow'), B.dx(-10)]
];
const randomTop = () => B.go(B.random(-200, 200), 180);
const reset = () => B.if_(B.lt(B.ypos(), -170), [randomTop()]);
const catching = body => B.if_(B.touching('Cool Cat'), body);

const starStart = [B.flag(), B.setVar('skor', 0), B.go(0, 180)];
const star = body => [B.flag(), B.setVar('skor', 0), B.go(0, 180), B.forever(body)];

const withCat = starScript => ({'Cool Cat': catKeys, Star: [starScript]});

module.exports = lesson({
    id: 'yildiz-yakala',
    title: 'Uzayda yıldız yakala',
    description: 'Kediyi ok tuşlarıyla yönlendir, gökten düşen yıldızları yakala ve skorunu artır.',
    level: 'baslangic',
    order: 10,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['skor'],
    steps: [
        step({
            text: 'Uzayda yıldız toplama oyunu yapacağız! Önce sahneyi uzaya çevirelim: sağ alttaki "Dekor Seç" ' +
                'düğmesine tıkla ve "Stars" (yıldızlar) dekorunu seç.',
            hint: 'Dekor Seç düğmesi sağ altta, sahnenin altındaki dekor bölümündedir.',
            guide: [G.ui('stage', 'Sahne burada')]
        }),
        step({
            text: 'Şimdi toplayacağımız yıldızı ekleyelim. Sol alttaki "Kukla Seç" düğmesine tıkla ve ' +
                '"Star" (yıldız) kuklasını seç. Kuklaların adını değiştirme!',
            hint: 'Mavi daire şeklindeki düğme, kukla listesinin hemen yanındadır.',
            guide: [G.ui('addSprite', 'Kukla ekle')]
        }),
        step({
            text: 'Kediyi sağa yürütelim. Kukla listesinden "Cool Cat"i seç. Olaylar kategorisinden ' +
                '"… tuşuna basılınca" bloğunu çalışma alanına sürükle ve menüden "sağ ok"u seç. ' +
                'Altına Hareket kategorisinden "x konumunu 10 değiştir" bloğunu tak.',
            hint: 'Sarı blok Olaylar, mavi blok Hareket kategorisindedir. Menüyü açmak için bloktaki oka tıkla.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenkeypressed', 'Sürükle')],
            scripts: {'Cool Cat': [catKeys[0]]},
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'Şimdi sola yürüsün: yeni bir "… tuşuna basılınca" bloğu al, menüden "sol ok"u seç ve altına ' +
                '"x konumunu -10 değiştir" bloğunu tak (eksi işaretini unutma!).',
            hint: 'Değer kutusuna -10 yaz. Eksi, kediyi sola götürür.',
            guide: [G.drag('event_whenkeypressed', 'Bir tane daha')],
            scripts: {'Cool Cat': catKeys},
            focus: {sprite: 'Cool Cat', script: 1, exact: true}
        }),
        step({
            text: 'Skoru tutacak bir değişken yapalım. Değişkenler kategorisine gel, "Değişken oluştur" de, ' +
                'adına skor yaz ve Tamam\'a bas.',
            hint: 'Adı tam olarak "skor" yaz (küçük harflerle), çünkü blokları ona göre kontrol edeceğiz.',
            guide: [G.category('variables', 'Değişkenler')]
        }),
        step({
            text: 'Kukla listesinden yıldızı seç. "Yeşil bayrağa tıklandığında" bloğunun altına "skor değişkenini 0 yap" ' +
                've "x: 0 y: 180 konumuna git" bloklarını tak: yıldız ekranın tepesinden başlasın.',
            hint: 'Değişken bloğunun menüsünden skor\'u seç. Önce Olaylar\'dan yeşil bayrak, sonra Değişkenler ve ' +
                'Hareket kategorilerinden bloklar.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: withCat(starStart),
            focus: {sprite: 'Star', script: 0},
            outcome: {trigger: 'flag', expect: [{target: 'stage', prop: 'variable:skor', op: 'eq', value: 0}]},
            wrong: [{scripts: {'Cool Cat': catKeys.concat([starStart])}}]
        }),
        step({
            text: 'Yıldız aşağı düşsün! Betiğinin sonuna Kontrol kategorisinden "sürekli tekrarla" bloğunu ekle ' +
                've içine "y konumunu -5 değiştir" bloğunu koy.',
            hint: 'Eksi değer yıldızı aşağı indirir. Blokların hepsi aynı betiğe bağlı olmalı.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_forever', 'Sürükle')],
            scripts: withCat(star([B.dy(-5)])),
            focus: {sprite: 'Star', script: 0, exactOnly: ['DY']},
            wrong: [{scripts: withCat(star([B.dy(5)]))}]
        }),
        step({
            text: 'Yıldız ekranın altına inince yeniden tepeye çıksın. "sürekli tekrarla"nın içine, y konumunu değiştir ' +
                'bloğunun altına "eğer … ise" bloğu koy. Koşul: "y konumu < -170". İçine: ' +
                '"x: (-200 ile 200 arasında rastgele bir sayı) y: 180 konumuna git".',
            hint: 'y konumu, Hareket kategorisinin en altındaki yuvarlak bloktur. Rastgele sayı bloğu Operatörler\'de.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_if', 'Sürükle')],
            scripts: withCat(star([B.dy(-5), reset()])),
            focus: {sprite: 'Star', script: 0, exactOnly: ['DY', 'OPERAND2']},
            wrong: [{scripts: withCat(star([B.dy(-5), B.if_(B.lt(B.ypos(), 170), [randomTop()])]))}]
        }),
        step({
            text: 'Yıldızı yakalayınca puan kazan! Aynı döngüye bir "eğer … ise" bloğu daha ekle. Koşul: ' +
                '"Cool Cat e değiyor mu?". İçine: "skor i 1 kadar değiştir" ve yıldızı yeniden tepeye gönderen ' +
                '"x: (rastgele) y: 180 konumuna git" bloğu.',
            hint: '"… e değiyor mu?" bloğu Algılama kategorisinde. Menüden Cool Cat\'i seç (fare imleci değil!).',
            guide: [G.category('sensing', 'Algılama'), G.drag('control_if', 'Sürükle')],
            scripts: withCat(star([B.dy(-5), reset(), catching([B.changeVar('skor', 1), randomTop()])])),
            focus: {sprite: 'Star', script: 0, exactOnly: ['DY', 'OPERAND2']},
            wrong: [{scripts: withCat(star([B.dy(-5), reset(), B.if_(B.touching('_mouse_'),
                [B.changeVar('skor', 1), randomTop()])]))}]
        }),
        step({
            text: 'Yakalayınca ses duyalım! Yakalama bloğunun içinin en sonuna Ses kategorisinden ' +
                '"… sesini başlat" bloğunu ekle ve menüden "collect" sesini seç.',
            hint: 'Yıldız kuklasının sesi "collect"; menüde bu adı görürsün.',
            guide: [G.category('sound', 'Ses'), G.drag('sound_play', 'Sürükle')],
            scripts: withCat(star([B.dy(-5), reset(),
                catching([B.changeVar('skor', 1), randomTop(), B.play('collect')])])),
            focus: {sprite: 'Star', script: 0, exactOnly: ['DY', 'OPERAND2'], loosen: ['SOUND_MENU']}
        }),
        step({
            text: 'Oyun hazır! Yeşil bayrağa tıkla, ok tuşlarıyla kediyi yönlendir ve yıldızları yakala. ' +
                'Merak ediyorsan "y konumunu -5 değiştir" yerine -8 yaz ve yıldızı hızlandır!',
            hint: 'Sayıyı büyüttükçe yıldız daha hızlı düşer.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
