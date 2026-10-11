const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const intro = [B.flag(), B.setVar('skor', 0), B.say('Bilgi yarışmasına hoş geldin!', 2)];
const question = (text, answer, wrong) => [
    B.ask(text),
    B.ifElse(B.eq(B.answer(), answer), [B.say('Doğru!', 2), B.changeVar('skor', 1)], [B.say(wrong, 2)])
];
const q1 = question('Türkiye\'nin başkenti neresidir?', 'Ankara', 'Yanlış! Doğrusu Ankara.');
const q2 = question('2 + 2 kaç eder?', '4', 'Yanlış! Doğrusu 4.');
const finale = B.say(B.join('Skorun: ', B.variable('skor')));

const script = list => ({'Cool Cat': [list]});

module.exports = lesson({
    id: 'bilgi-yarismasi',
    title: 'Bilgi yarışması',
    description: 'Sorular sor, cevapları kontrol et ve doğru bilenlere puan ver.',
    level: 'orta',
    order: 20,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['skor'],
    steps: [
        step({
            text: 'Kendi bilgi yarışmanı yapalım! Puanları tutmak için Değişkenler kategorisinde "Değişken oluştur" de ' +
                've adına skor yaz.',
            hint: 'Adı tam olarak "skor" (küçük harflerle) yaz.',
            guide: [G.category('variables', 'Değişkenler')]
        }),
        step({
            text: 'Cool Cat\'i seç. "Yeşil bayrağa tıklandığında" altına "skor değişkenini 0 yap" ve "2 saniye boyunca ' +
                'Bilgi yarışmasına hoş geldin! de" blokları gelsin.',
            hint: '"… saniye boyunca … de" bloğu Görünüm kategorisinde.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: script(intro),
            focus: {sprite: 'Cool Cat', script: 0},
            outcome: {trigger: 'flag', expect: [{target: 'stage', prop: 'variable:skor', op: 'eq', value: 0}]}
        }),
        step({
            text: 'İlk soruyu soralım. Betiğin sonuna Algılama kategorisinden "… diye sor ve bekle" bloğunu ekle ' +
                've soruyu yaz: Türkiye\'nin başkenti neresidir?',
            hint: 'Soru kutusuna tıkla ve sorunu yaz. Cevabı oyuncu klavyeyle yazacak.',
            guide: [G.category('sensing', 'Algılama'), G.drag('sensing_askandwait', 'Sürükle')],
            scripts: script(intro.concat([q1[0]])),
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'Cevabı kontrol edelim. "sor ve bekle" bloğunun altına "eğer … ise … değilse" bloğu koy. Koşul: ' +
                '"yanıt = Ankara". Doğruysa "2 saniye boyunca Doğru! de" ve "skor i 1 kadar değiştir"; değilse ' +
                '"2 saniye boyunca Yanlış! de".',
            hint: '"yanıt" Algılama kategorisinde, "=" bloğu Operatörler\'de. Sırayla: önce yanıt, eşittir işaretinin ' +
                'sağına Ankara.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_if_else', 'Sürükle')],
            scripts: script(intro.concat(q1)),
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'İkinci soru: aynı şeyi tekrar yap! "2 + 2 kaç eder?" diye sor ve yanıt "4" ise skoru artır, değilse ' +
                'yanlış de.',
            hint: 'İlk sorunun bloklarını kopyalayıp metinleri değiştirebilirsin (sağ tık → Çoğalt).',
            guide: [G.category('sensing', 'Algılama'), G.drag('sensing_askandwait', 'Sürükle')],
            scripts: script(intro.concat(q1, q2)),
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'Sonunda skoru söyleyelim: betiğin en sonuna "Skorun: " ile "skor" değişkenini "… i ve … ile ' +
                'birleştir" bloğuyla birleştirip "… de" bloğuna koy.',
            hint: 'Birleştir bloğu Operatörler kategorisinde; skor değişkenini ikinci kutuya bırak.',
            guide: [G.category('operators', 'Operatörler'), G.drag('operator_join', 'Sürükle')],
            scripts: script(intro.concat(q1, q2, [finale])),
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'Yarışma hazır! Yeşil bayrağa tıkla ve soruları cevapla. Şimdi sıra sende: araya birkaç soru daha ' +
                'ekle! İpucu: her yeni soru için "sor ve bekle" ve "eğer … değilse" bloklarını tekrar kullan.',
            hint: 'Soruları sağ tık → Çoğalt ile çoğaltmak işini kolaylaştırır.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
