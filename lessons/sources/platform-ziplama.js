const {B} = require('../lib/dsl');
const {G, lesson, step} = require('../lib/compile');

const ground = () => B.touchingColor('#996600');
const walk = [B.flag(), B.go(-200, -100), B.forever([
    B.if_(B.keyDown('right arrow'), [B.dx(5)]),
    B.if_(B.keyDown('left arrow'), [B.dx(-5)])
])];
const fall = [B.changeVar('hiz', -1), B.dy(B.variable('hiz'))];
const gravity = body => [B.flag(), B.setVar('hiz', 0), B.forever(fall.concat(body))];
const land = extra => B.if_(ground(), [B.repeatUntil(B.not(ground()), [B.dy(1)]), B.setVar('hiz', 0)].concat(extra));
const jump = () => B.if_(B.keyDown('up arrow'), [B.setVar('hiz', 12)]);

module.exports = lesson({
    id: 'platform-ziplama',
    title: 'Zıplayan kedi (platform oyunu)',
    description: 'Yer çekimi, zemine basma ve zıplama mantığıyla bir platform oyunu iskeleti yap.',
    level: 'ileri',
    order: 31,
    startProject: '/uploads/bos-proje.sb3',
    variables: ['hiz'],
    steps: [
        step({
            text: 'Platform oyunu yapalım! Sağdaki "Sahne" kutusuna tıkla ve "Dekorlar" sekmesine geç. Sahnenin ' +
                'altına kalın bir zemin çiz (dikdörtgen aracı, kahverengi). İstersen yukarıda birkaç basamak da ekle. ' +
                'Kedinin başlayacağı sol alt köşeyi zeminle kapatma, kedi biraz yukarıda başlayacak.',
            hint: 'Zemin tek renk olsun. Kahverengi için Doldurma renginde Renk 8, Doygunluk 100, Parlaklık 60 dene.',
            guide: [G.ui('costumesTab', 'Dekorlar sekmesi')]
        }),
        step({
            text: 'Kod sekmesine dön ve "hiz" adında bir değişken oluştur (Değişkenler → Değişken oluştur). Kedinin ' +
                'dikey hızını tutacak.',
            hint: 'Adı küçük harflerle ve tam olarak "hiz" yaz (Türkçe ı harfi yok).',
            guide: [G.ui('codeTab', 'Kod sekmesi'), G.category('variables', 'Değişkenler')]
        }),
        step({
            text: 'Kediyi seç. "Yeşil bayrağa tıklandığında" altına "x: -200 y: -100 konumuna git" ve "sürekli tekrarla": ' +
                'eğer "sağ ok tuşuna basıldı mı?" ise "x konumunu 5 değiştir"; eğer "sol ok tuşuna basıldı mı?" ise ' +
                '"x konumunu -5 değiştir".',
            hint: '"… tuşuna basıldı mı?" bloğu Algılama kategorisinde. İki ayrı "eğer" bloğu olacak. Sol için -5 yaz.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_forever', 'Sürükle')],
            scripts: {'Cool Cat': [walk]},
            focus: {sprite: 'Cool Cat', script: 0, exactOnly: ['DX']}
        }),
        step({
            text: 'Yer çekimi: yeni bir betik yap. "Yeşil bayrağa tıklandığında" altına "hiz değişkenini 0 yap"; sonra ' +
                '"sürekli tekrarla": "hiz i -1 kadar değiştir" ve "y konumunu (hiz) değiştir". Kedi zemini görmeden ' +
                'düşecek, normal!',
            hint: '"hiz" değişkenini y konumunu değiştir bloğunun kutusuna bırak.',
            guide: [G.category('motion', 'Hareket'), G.drag('motion_changeyby', 'Sürükle')],
            scripts: {'Cool Cat': [walk, gravity([])]},
            focus: {sprite: 'Cool Cat', script: 1, exactOnly: ['VALUE']},
            outcome: {trigger: 'flag', waitMs: 500, expect: [{target: 'Cool Cat', prop: 'y', op: 'lt', value: -100}]}
        }),
        step({
            text: 'Zemine basma! Yer çekimi döngüsüne "eğer … ise" ekle: koşul "kahverengi rengine değiyor mu?". İçine: ' +
                '"kahverengi rengine değiyor DEĞİL olana kadar tekrarla: y konumunu 1 değiştir", altına da ' +
                '"hiz değişkenini 0 yap".',
            hint: '"değil" bloğu Operatörler kategorisinde; renk bloğunu onun içine koy. Önce renge değmişse kediyi ' +
                'yavaşça yukarı iteriz, sonra hızı sıfırlarız. Renk için damlalığı kullan.',
            guide: [G.category('sensing', 'Algılama'), G.drag('control_repeat_until', 'Sürükle')],
            scripts: {'Cool Cat': [walk, gravity([land([])])]},
            focus: {sprite: 'Cool Cat', script: 1, exactOnly: ['VALUE']}
        }),
        step({
            text: 'Zıplama! Aynı "eğer kahverengi rengine değiyor mu" bloğunun içine, "hiz değişkenini 0 yap"ın altına ' +
                'bir "eğer … ise" daha koy: koşul "yukarı ok tuşuna basıldı mı?", içine "hiz değişkenini 12 yap". ' +
                'Böylece kedi yalnızca zemindeyken zıplar.',
            hint: 'Zıplama bloğu zemin kontrolünün İÇİNDE olmalı; yoksa kedi havadayken de zıplar ya da hiç zıplamaz.',
            guide: [G.category('control', 'Kontrol'), G.drag('control_if', 'Sürükle')],
            scripts: {'Cool Cat': [walk, gravity([land([jump()])])]},
            focus: {sprite: 'Cool Cat', script: 1, exactOnly: ['VALUE']},
            wrong: [{scripts: {'Cool Cat': [walk, gravity([land([]), jump()])]}}]
        }),
        step({
            text: 'Platform oyunu iskeleti hazır! Yeşil bayrağa tıkla, sağ/sol okla yürü, yukarı okla zıpla. Şimdi sen ' +
                'devam et: dekora basamaklar çiz, bir hedef bayrak ekle, zıplama gücünü (12) değiştir!',
            hint: 'Zıplama gücü büyüdükçe kedi daha yükseğe çıkar.',
            guide: [G.ui('greenFlag', 'Oyunu başlat')]
        })
    ]
});
