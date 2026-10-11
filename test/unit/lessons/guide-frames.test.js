import {buildGuideFrames, totalDurationMs} from '../../../src/lib/lessons/guide-frames';

const rect = (left, top, width, height) => ({left, top, width, height});

describe('buildGuideFrames', () => {
    test('tıklama: git, bas, bekle; merkeze hedeflenir', () => {
        const frames = buildGuideFrames([{type: 'click', rect: rect(100, 200, 40, 20), label: 'Buraya tıkla'}]);
        expect(frames).toEqual([
            {kind: 'move', x: 120, y: 210, ms: 800, holding: false, label: 'Buraya tıkla'},
            {kind: 'press', x: 120, y: 210, ms: 300, holding: false, label: ''},
            {kind: 'pause', x: 120, y: 210, ms: 500, holding: false, label: ''}
        ]);
    });

    test('sürükleme: kaynağa git, bas, bırakılacak yere basılı götür, bırak', () => {
        const frames = buildGuideFrames([{
            type: 'drag', fromRect: rect(0, 0, 20, 20), toRect: rect(200, 100, 40, 40), label: 'Sürükle'
        }]);
        expect(frames.map(f => f.kind)).toEqual(['move', 'press', 'move', 'release', 'pause']);
        expect(frames[0]).toEqual({kind: 'move', x: 10, y: 10, ms: 800, holding: false, label: 'Sürükle'});
        expect(frames[2]).toEqual({kind: 'move', x: 220, y: 120, ms: 1100, holding: true, label: ''});
        expect(frames[3]).toEqual({kind: 'release', x: 220, y: 120, ms: 300, holding: false, label: ''});
    });

    test('rect\'i olmayan eylemler atlanır', () => {
        const frames = buildGuideFrames([
            {type: 'click', rect: null},
            {type: 'drag', fromRect: rect(0, 0, 10, 10), toRect: null},
            {type: 'click', rect: rect(0, 0, 10, 10)}
        ]);
        expect(frames).toHaveLength(3);
        expect(frames[0].kind).toBe('move');
    });

    test('hepsi atlanırsa ya da liste boşsa boş dizi', () => {
        expect(buildGuideFrames([])).toEqual([]);
        expect(buildGuideFrames([{type: 'click', rect: null}])).toEqual([]);
        expect(buildGuideFrames(null)).toEqual([]);
    });

    test('bilinmeyen eylem türü atlanır', () => {
        expect(buildGuideFrames([{type: 'sallan', rect: rect(0, 0, 1, 1)}])).toEqual([]);
    });

    test('toplam süre', () => {
        const frames = buildGuideFrames([{type: 'click', rect: rect(0, 0, 10, 10)}]);
        expect(totalDurationMs(frames)).toBe(1600);
        expect(totalDurationMs([])).toBe(0);
    });
});
