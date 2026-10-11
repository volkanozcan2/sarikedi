const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const follow = [B.flag(), B.forever([B.goTo('_mouse_')])];
const hunt = [B.towards('Cool Cat'), B.move(2)];
const chase = body => [B.flag(), B.resetTimer(), B.go(200, 150), B.forever(body)];
const caught = message => B.if_(B.touching('Cool Cat'), [message, B.stopAll()]);
const timed = () => B.say(B.join('Süre: ', B.timer()), 2);

module.exports = lesson({
    id: 'hayaletten-kac',
    title: 'Hayaletten kaç',
    description: 'Kediyi fareyle yönet, seni kovalayan hayalete yakalanma ve ne kadar dayandığını gör.',
    level: 'baslangic',
    order: 11,
    startProject: '/uploads/bos-proje.sb3',
    variables: [],
    steps: [
        step({
            text: 'Kovalamaca oyunu! Sol alttaki "Kukla Seç" düğmesine tıkla ve "Ghost" (hayalet) kuklasını ekle. ' +
                'Kuklaların adını değiştirme!',
            hint: 'Hayalet, kovalayacak olan düşmanımız. Kukla Seç düğmesi kukla listesinin yanında.',
            guide: [G.ui('addSprite', 'Kukla ekle')]
        }),
        step({
            text: 'Kukla listesinden Cool Cat\'i seç. Kedi fareyi takip etsin: "Yeşil bayrağa tıklandığında" altına ' +
                '"sürekli tekrarla" koy, içine "fare imleci e git" bloğunu yerleştir.',
            hint: '"… e git" bloğu Hareket kategorisinde; menüden "fare imleci"ni seç.',
            guide: [G.category('events', 'Olaylar'), G.drag('event_whenflagclicked', 'Sürükle')],
            scripts: {'Cool Cat': [follow]},
            focus: {sprite: 'Cool Cat', script: 0}
        }),
        step({
            text: 'Şimdi hayaleti seç. Yeşil bayrakta "zamanlayıcıyı sıfırla", "x: 200 y: 150 konumuna git" yap; ' +
                'sonra sürekli tekrarla: "Cool Cat e doğru yönel" ve "2 adım git".',
            hint: '"… e doğru yönel" bloğu Hareket kategorisinde (menüden Cool Cat), "zamanlayıcıyı sıfırla" Algılama\'da.',
            guide: [G.category('motion', 'Hareket'), G.drag('motion_pointtowards', 'Sürükle')],
            scripts: {'Cool Cat': [follow], Ghost: [chase(hunt)]},
            focus: {sprite: 'Ghost', script: 0},
            wrong: [{scripts: {'Cool Cat': [follow], Ghost: [chase([B.towards('_mouse_'), B.move(2)])]}}]
        }),
        step({
            text: 'Hayalet kediyi yakalarsa oyun bitsin! Hayaletin döngüsüne "eğer … ise" ekle: koşul "Cool Cat e ' +
                'değiyor mu?", içine "2 saniye boyunca Yakaladım! de" ve "durdur (tümü)".',
            hint: '"… e değiyor mu?" bloğu Algılama kategorisinde, menüden Cool Cat\'i seç.',
            guide: [G.category('sensing', 'Algılama'), G.drag('control_if', 'Sürükle')],
            scripts: {'Cool Cat': [follow], Ghost: [chase(hunt.concat([caught(B.say('Yakaladım!', 2))]))]},
            focus: {sprite: 'Ghost', script: 0}
        }),
        step({
            text: 'Ne kadar dayandığını da söyleyelim. "Yakaladım!" yazan yere "… i ve … ile birleştir" bloğu koy: ' +
                '"Süre: " ile "zamanlayıcı" birleşsin.',
            hint: 'Birleştir bloğu Operatörler kategorisinde; zamanlayıcı Algılama\'da bir yuvarlak bloktur.',
            guide: [G.category('operators', 'Operatörler'), G.drag('operator_join', 'Sürükle')],
            scripts: {'Cool Cat': [follow], Ghost: [chase(hunt.concat([caught(timed())]))]},
            focus: {sprite: 'Ghost', script: 0}
        }),
        step({
            text: 'Hazır! Yeşil bayrağa tıkla, fareyi hareket ettir ve hayalete yakalanmamaya çalış. Zorlaştırmak ' +
                'için hayaletin "2 adım git" bloğundaki sayıyı 3 yap!',
            hint: 'Hayalet kediden hızlı olursa asla kaçamazsın; 3\'ü dene.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
