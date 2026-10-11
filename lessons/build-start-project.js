/**
 * Derslerin başlangıç projesini üretir: yalnızca Cool Cat ve boş bir dekor, hiç değişken/betik yok.
 * Her ders bu projeyle başlar; önceki derslerin artıkları (betikler, kuklalar, "my variable"
 * değişkeni) yeni dersin kontrollerini ya da menü varsayılanlarını bozmaz.
 *   node lessons/build-start-project.js
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const ASSET_DIR = path.join(__dirname, '..', 'src', 'lib', 'default-project');
const OUT = path.join(__dirname, '..', 'server', 'seed', 'assets', 'bos-proje.sb3');

const BACKDROP = 'cd21514d0531fdffb22204e0ec5ed84a';
const COOL_CAT = '209ff3921b8c5a171d514caf15630301';
const MEOW = '83c36d806dc92327b9e7049a565c6bff';

const project = {
    targets: [
        {
            isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [{
                assetId: BACKDROP,
                name: 'dekor1',
                md5ext: `${BACKDROP}.svg`,
                dataFormat: 'svg',
                rotationCenterX: 240,
                rotationCenterY: 180
            }],
            sounds: [],
            volume: 100,
            layerOrder: 0,
            tempo: 60,
            videoTransparency: 50,
            videoState: 'on',
            textToSpeechLanguage: null
        },
        {
            isStage: false,
            name: 'Cool Cat',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [{
                assetId: COOL_CAT,
                name: 'cool cat',
                bitmapResolution: 2,
                md5ext: `${COOL_CAT}.png`,
                dataFormat: 'png',
                rotationCenterX: 120,
                rotationCenterY: 108
            }],
            sounds: [{
                assetId: MEOW,
                name: 'Meow',
                dataFormat: 'wav',
                format: '',
                rate: 22050,
                sampleCount: 18688,
                md5ext: `${MEOW}.wav`
            }],
            volume: 100,
            layerOrder: 1,
            visible: true,
            x: 0,
            y: 0,
            size: 100,
            direction: 90,
            draggable: false,
            rotationStyle: 'all around'
        }
    ],
    monitors: [],
    extensions: [],
    meta: {semver: '3.0.0', vm: '0.2.0', agent: 'sarikedi'}
};

const zip = new JSZip();
// sabit tarih: çıktı her seferinde aynı baytlar olsun
const date = new Date('2026-01-01T00:00:00Z');
zip.file('project.json', JSON.stringify(project), {date: date});
[`${BACKDROP}.svg`, `${COOL_CAT}.png`, `${MEOW}.wav`].forEach(name => {
    zip.file(name, fs.readFileSync(path.join(ASSET_DIR, name)), {date: date});
});

zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'}).then(buffer => {
    fs.mkdirSync(path.dirname(OUT), {recursive: true});
    fs.writeFileSync(OUT, buffer);
    console.log(`yazıldı: ${OUT} (${buffer.length} bayt)`);
});
