/**
 * @fileoverview
 * SARIKEDİ'nin kendi kuklası "Cool Cat". Varsayılan projedeki kuklayla aynı
 * görseli kullanır (görsel varsayılan projenin önbelleğinden yüklenir) ve
 * kukla kütüphanesinde en başta görünür.
 */

import coolCatIcon from '../default-project/209ff3921b8c5a171d514caf15630301.png';

const coolCat = {
    name: 'Cool Cat',
    tags: ['animals', 'cat', 'kitten', 'kitty', 'mammal', 'orange', 'cool'],
    isStage: false,
    variables: {},
    costumes: [
        {
            assetId: '209ff3921b8c5a171d514caf15630301',
            name: 'cool cat',
            bitmapResolution: 2,
            md5ext: '209ff3921b8c5a171d514caf15630301.png',
            dataFormat: 'png',
            rotationCenterX: 120,
            rotationCenterY: 108
        }
    ],
    sounds: [
        {
            assetId: '83c36d806dc92327b9e7049a565c6bff',
            name: 'Meow',
            dataFormat: 'wav',
            format: '',
            rate: 44100,
            sampleCount: 37376,
            md5ext: '83c36d806dc92327b9e7049a565c6bff.wav'
        }
    ],
    blocks: {},
    // Kütüphane küçük resmi: görsel Scratch CDN'inde olmadığı için yerel adres kullanılır
    rawURL: coolCatIcon
};

export default coolCat;
