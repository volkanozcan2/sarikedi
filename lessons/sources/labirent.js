const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const START = [B.flag(), B.size(30), B.go(-200, -150)];
const MOVES = [
    [B.key('right arrow'), B.dx(5)],
    [B.key('left arrow'), B.dx(-5)]
];
const VERTICAL = [
    [B.key('up arrow'), B.dy(5)],
    [B.key('down arrow'), B.dy(-5)]
];
const wall = () => B.if_(B.touchingColor('#000000'), [B.go(-200, -150)]);
const goal = () => B.if_(B.touchingColor('#00ff00'), [B.say('Kazandın!', 2), B.stopAll()]);
const loop = body => [B.flag(), B.size(30), B.go(-200, -150), B.forever(body)];

module.exports = lesson({
    id: 'labirent',
    title: 'Labirentten çık',
    description: 'Kediyi ok tuşlarıyla labirentte gezdir, duvarlara değmeden yeşil hedefe ulaştır.',
    level: 'baslangic',
    order: 12,
    startProject: '/uploads/bos-proje.sb3',
    variables: [],
    steps: [
        step({
            text: 'Önce labirenti çizelim. Sağdaki "Sahne" kutusuna tıkla ve "Dekorlar" sekmesine geç. ' +
                'Dikdörtgen aracıyla siyah duvarlar çiz, kedinin geçebileceği yollar bırak. Sol alt köşeyi (kedinin ' +
                'başlayacağı yer) boş bırak! Sağ üst köşeye yeşil bir kare çiz: orası hedefimiz.',
            hint: 'Siyah için Doldurma renginde Parlaklık\'ı 0 yap. Yeşil için Renk 33, Doygunluk 100, Parlaklık 100 ' +
                'dene. Duvarlar kalın olsun.',
            guide: [G.ui('costumesTab', 'Dekorlar sekmesi')]
        }),
        step({
            text: 'Kod sekmesine dön ve Cool Cat kuklasını seç. "Yeşil bayrağa tıklandığında" bloğunun altına "boyutu % 30 ' +
                'yap" ve "x: -200 y: -150 konumuna git" bloklarını tak: kedi küçülüp labirentin başına gitsin.',
            hint: 'Önce Olaylar\'dan yeşil bayrak bloğunu al, altına Görünüm ve Hareket bloklarını tak.',
            guide: [G.ui('codeTab', 'Kod sekmesi'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: {'Cool Cat': [START]},
            focus: {sprite: 'Cool Cat', script: 0},
            outcome: {trigger: 'flag', expect: [{target: 'Cool Cat', prop: 'x', op: 'lt', value: 0}]}
        }),
        step({
            text: 'Kediyi sağa ve sola yürütelim. "sağ ok tuşuna basılınca" → "x konumunu 5 değiştir" ve ' +
                '"sol ok tuşuna basılınca" → "x konumunu -5 değiştir" betiklerini yap.',
            hint: 'Sol için değer kutusuna -5 yaz (eksi işareti kediyi sola götürür). Tuş menüsünden ok tuşunu seç.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenkeypressed', 'Sürükle')],
            scripts: {'Cool Cat': [START].concat(MOVES)},
            focus: [{sprite: 'Cool Cat', script: 1}, {sprite: 'Cool Cat', script: 2, exactOnly: ['DX']}]
        }),
        step({
            text: 'Şimdi yukarı ve aşağı: "yukarı ok tuşuna basılınca" → "y konumunu 5 değiştir" ve ' +
                '"aşağı ok tuşuna basılınca" → "y konumunu -5 değiştir".',
            hint: 'Aşağı için -5 yaz. Mavi "y konumunu değiştir" bloğu Hareket kategorisinde.',
            guide: [G.category('motion', 'Hareket'), G.drag('motion_changeyby', 'Sürükle')],
            scripts: {'Cool Cat': [START].concat(MOVES, VERTICAL)},
            focus: [{sprite: 'Cool Cat', script: 3}, {sprite: 'Cool Cat', script: 4, exactOnly: ['DY']}]
        }),
        step({
            text: 'Duvara değince kedi başa dönsün! Yeşil bayrak betiğinin sonuna "sürekli tekrarla" ekle. İçine ' +
                '"eğer … ise" koy; koşul "siyah rengine değiyor mu?", içine "x: -200 y: -150 konumuna git".',
            hint: 'Renk kutusuna tıkla, damlalık simgesiyle labirentin siyah duvarından renk seç.',
            guide: [G.category('sensing', 'Algılama'), G.drag('control_forever', 'Sürükle')],
            scripts: {'Cool Cat': [loop([wall()])].concat(MOVES, VERTICAL)},
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'Hedefe ulaşınca oyun bitsin. Aynı döngünün içine ikinci bir "eğer … ise" ekle: koşul ' +
                '"yeşil rengine değiyor mu?", içine "2 saniye boyunca Kazandın! de" ve "durdur (tümü)".',
            hint: 'Kontrol kategorisinde "durdur" bloğu var, menüden "tümü"nü seç. Rengi damlalıkla yeşil hedeften seç.',
            guide: [G.category('looks', 'Görünüm'), G.drag('looks_sayforsecs', 'Sürükle')],
            scripts: {'Cool Cat': [loop([wall(), goal()])].concat(MOVES, VERTICAL)},
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'Oyun hazır! Yeşil bayrağa tıkla ve kediyi labirentin sonuna götür. İstersen labirenti zorlaştır, ' +
                'duvarları kalınlaştır ya da kediyi biraz daha hızlı yap.',
            hint: 'Hızı değiştirmek için x ve y konumunu değiştir bloklarındaki 5 sayısını büyüt.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
