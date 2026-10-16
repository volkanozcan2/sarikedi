/**
 * Kutlama efektleri (canvas-confetti). Kütüphane projeyle birlikte paketlenir, dışarıdan yüklenmez.
 * Konfeti sayfanın en üstünde kendi tuvalinde çizilir, tıklamaları engellemez ve "hareketi azalt"
 * tercihi açıksa hiç gösterilmez.
 */
import confetti from 'canvas-confetti';

import {getUiSounds} from './ui-sounds';

// tema renkleri: sarı, mercan, nane, yeşil, turuncu, koyu yeşil
const COLORS = ['#FFD447', '#FF9A80', '#62D3B4', '#9DDB73', '#FFB85C', '#184D47'];
const Z_INDEX = 2147482000; // açılış ekranının altında, her şeyin üstünde

const base = {colors: COLORS, zIndex: Z_INDEX, disableForReducedMotion: true};

/**
 * Tek bir konfeti patlaması.
 * @param {object} [options] - x, y (0-1 arası ekran konumu), count (parça sayısı)
 */
const burst = (options = {}) => {
    confetti(Object.assign({}, base, {
        particleCount: options.count || 120,
        spread: 75,
        startVelocity: 48,
        origin: {x: typeof options.x === 'number' ? options.x : 0.5, y: typeof options.y === 'number' ? options.y : 0.6}
    }));
};

/**
 * Büyük kutlama: iki yandan art arda konfeti, ortadan da bir patlama (yaklaşık 1,5 sn) ve kutlama sesi.
 * Ses, arayüz sesleri kapalıysa çalmaz.
 * @param {object} [options] - sound: false ise ses çalınmaz
 */
const celebrate = (options = {}) => {
    if (options.sound !== false) getUiSounds().play('celebrate', true);
    const end = Date.now() + 1500;
    burst({x: 0.5, y: 0.55, count: 160});
    const frame = () => {
        confetti(Object.assign({}, base, {particleCount: 6, angle: 60, spread: 60, origin: {x: 0, y: 0.75}}));
        confetti(Object.assign({}, base, {particleCount: 6, angle: 120, spread: 60, origin: {x: 1, y: 0.75}}));
        if (Date.now() < end) window.requestAnimationFrame(frame);
    };
    frame();
};

export {burst, celebrate};
