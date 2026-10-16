import {captureThumbnail} from '../../../src/lib/accounts/thumbnail';

const fakeEnv = overrides => {
    const drawn = [];
    const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({drawImage: (...args) => drawn.push(args)}),
        toBlob: callback => callback({type: 'image/png', size: 5})
    };
    return Object.assign({
        createCanvas: () => canvas,
        loadImage: () => Promise.resolve({width: 480, height: 360}),
        drawn: drawn,
        canvas: canvas
    }, overrides);
};

const vmWith = renderer => ({runtime: {renderer: renderer}});

describe('captureThumbnail', () => {
    test('sahne görüntüsünü alır, 240x180 tuvale çizer ve PNG blob döndürür', () => {
        const renderer = {requestSnapshot: cb => cb('data:image/png;base64,AAAA'), draw: jest.fn()};
        const env = fakeEnv();
        return captureThumbnail(vmWith(renderer), env).then(blob => {
            expect(blob).toEqual({type: 'image/png', size: 5});
            expect(env.canvas.width).toBe(240);
            expect(env.canvas.height).toBe(180);
            expect(env.drawn[0].slice(1)).toEqual([0, 0, 240, 180]);
            expect(renderer.draw).toHaveBeenCalled();
        });
    });

    test('çizici yoksa ya da görüntü alınamazsa null (kaydetme engellenmez)', () => {
        return captureThumbnail({runtime: {}}, fakeEnv()).then(result => {
            expect(result).toBeNull();
            const broken = {requestSnapshot: () => {
                throw new Error('x');
            }, draw: jest.fn()};
            return captureThumbnail(vmWith(broken), fakeEnv());
        }).then(result => {
            expect(result).toBeNull();
            const renderer = {requestSnapshot: cb => cb('data:image/png;base64,AAAA'), draw: jest.fn()};
            return captureThumbnail(vmWith(renderer), fakeEnv({loadImage: () => Promise.reject(new Error('yüklenemedi'))}));
        }).then(result => expect(result).toBeNull());
    });

    test('görüntü hiç gelmezse zaman aşımıyla null', () => {
        const renderer = {requestSnapshot: () => {}, draw: jest.fn()};
        return captureThumbnail(vmWith(renderer), fakeEnv({timeoutMs: 20})).then(result => expect(result).toBeNull());
    });
});
