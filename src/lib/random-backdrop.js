import backdrops from './libraries/backdrops.json';

// "outdoors" etiketli ama bina/duvar görünümlü olanlar açılış dekoru olarak uygun değil
const EXCLUDED = ['Wall 1', 'Wall 2', 'Mural', 'School', 'Greek Theater'];

const isOutdoor = item => {
    const tags = (item.tags || []).map(tag => tag.trim());
    return tags.indexOf('outdoors') !== -1 && EXCLUDED.indexOf(item.name.trim()) === -1;
};

/**
 * Bina dışı (outdoors) dekorlardan rastgele birini seçer.
 * @param {function} [random] - 0 ile 1 arasında sayı veren işlev (test için)
 * @returns {object} dekor kütüphanesi kaydı
 */
const pickOutdoorBackdrop = (random = Math.random) => {
    const choices = backdrops.filter(isOutdoor);
    return choices[Math.floor(random() * choices.length)];
};

/**
 * Yeni açılan varsayılan projede boş dekoru rastgele bir bina dışı dekorla değiştirir.
 * İndirme başarısız olursa boş dekor kalır.
 * @param {VM} vm - sanal makine
 * @param {function} [random] - rastgele sayı üretici (test için)
 * @returns {Promise} bitince çözülür; hata fırlatmaz
 */
const useRandomOutdoorBackdrop = (vm, random = Math.random) => {
    const stage = vm.runtime.getTargetForStage();
    if (!stage || stage.getCostumes().length !== 1) return Promise.resolve();
    const item = pickOutdoorBackdrop(random);
    return vm.addBackdrop(item.md5ext, {
        name: item.name,
        rotationCenterX: item.rotationCenterX,
        rotationCenterY: item.rotationCenterY,
        bitmapResolution: item.bitmapResolution,
        skinId: null
    }).then(() => {
        stage.deleteCostume(0);
        vm.runtime.requestTargetsUpdate(stage);
    })
        .catch(() => {});
};

export {pickOutdoorBackdrop, useRandomOutdoorBackdrop};
