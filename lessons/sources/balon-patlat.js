const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const randomSpot = () => B.go(B.random(-200, 200), B.random(-150, 150));
const start = [B.flag(), B.setVar('skor', 0), randomSpot()];
const startMoving = [B.flag(), B.setVar('skor', 0), randomSpot(), B.forever([B.wait(1), randomSpot()])];
const pop = [B.clicked(), B.changeVar('skor', 1), B.play('Pop'), randomSpot()];
const timeUp = [B.flag(), B.wait(30), B.say('Süre doldu!', 2), B.stopAll()];

module.exports = lesson({
    id: 'balon-patlat',
    title: 'Balon patlat',
    description: 'Ekranda sürekli yer değiştiren balona tıkla, 30 saniyede en çok puanı topla.',
    level: 'baslangic',
    order: 13,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['skor'],
    steps: [
        step({
            text: 'Balon patlatma oyunu yapalım! Sol alttaki "Kukla Seç" düğmesine tıkla ve "Balloon1" (balon) ' +
                'kuklasını seç. Balon artık seçili kuklan; blokları onun için yazacağız. Kuklaların adını değiştirme!',
            hint: 'Kukla Seç düğmesi kukla listesinin hemen yanındaki mavi dairedir.',
            guide: [G.ui('addSprite', 'Kukla ekle')]
        }),
        step({
            text: 'Puanı tutacak bir değişken yapalım: Değişkenler kategorisinde "Değişken oluştur" de, adına skor ' +
                'yaz ve Tamam\'a bas.',
            hint: 'Adı tam olarak "skor" (küçük harflerle) yaz.',
            guide: [G.category('variables', 'Değişkenler')]
        }),
        step({
            text: '"Yeşil bayrağa tıklandığında" bloğunun altına "skor değişkenini 0 yap" ve ' +
                '"x: (-200 ile 200 arasında rastgele bir sayı) y: (-150 ile 150 arasında rastgele bir sayı) ' +
                'konumuna git" blokları gelsin.',
            hint: 'Rastgele sayı bloğu Operatörler kategorisinde; iki kutuya da birer tane koy.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: {Balloon1: [start]},
            focus: {sprite: 'Balloon1', script: 0},
            outcome: {trigger: 'flag', expect: [{target: 'stage', prop: 'variable:skor', op: 'eq', value: 0}]}
        }),
        step({
            text: 'Balona tıklayınca patlasın! "Bu kuklaya tıklandığında" bloğu al; altına "skor i 1 kadar değiştir", ' +
                '"Pop sesini başlat" ve yeniden rastgele bir yere giden "x: … y: … konumuna git" bloğunu koy.',
            hint: 'Pop sesini ses bloğunun menüsünden seç. Konum bloğunu bir önceki betikten kopyalayabilirsin ' +
                '(sağ tık → Çoğalt).',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenthisspriteclicked', 'Sürükle')],
            scripts: {Balloon1: [start, pop]},
            focus: {sprite: 'Balloon1', script: 1, loosen: ['SOUND_MENU']}
        }),
        step({
            text: 'Balon yerinde durmasın! İlk betiğin sonuna "sürekli tekrarla" ekle. İçine "1 saniye bekle" ve ' +
                'rastgele yere giden "git" bloğunu koy.',
            hint: 'Bekle bloğu Kontrol kategorisinde. Her saniye balon yeni bir yere zıplayacak.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_forever', 'Sürükle')],
            scripts: {Balloon1: [startMoving, pop]},
            focus: {sprite: 'Balloon1', script: 0}
        }),
        step({
            text: 'Oyun 30 saniye sürsün! Yeni bir betik yap: "Yeşil bayrağa tıklandığında", "30 saniye bekle", sonra ' +
                '"2 saniye boyunca Süre doldu! de" ve "durdur (tümü)".',
            hint: 'Bu betik ayrı bir yeşil bayrak bloğuyla başlasın; diğer betiklere dokunma.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: {Balloon1: [startMoving, pop, timeUp]},
            focus: {sprite: 'Balloon1', script: 2}
        }),
        step({
            text: 'Hazır! Yeşil bayrağa tıkla ve 30 saniyede kaç balon patlatabildiğine bak. Daha zor olsun ister ' +
                'misin? Balonun yer değiştirme süresini 1 saniyeden 0.5 saniyeye indir!',
            hint: 'Bekle bloğundaki sayıyı küçült, balon daha hızlı kaçar.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
