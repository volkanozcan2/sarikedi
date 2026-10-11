/**
 * scratch-vm'i arayüzsüz (Node'da) çalıştırır: ders çözümlerini yükleyip kontrolleri
 * gerçek VM üzerinde denemek için. Renderer olmadığından çarpışma/renk algılama
 * çalışmaz; yalnızca blok yapısı, hareket, değişken ve tuş olayları denenir.
 */

const VM = require('scratch-vm');
const Minilog = require('minilog');

Minilog.disable();

const EDITING_SPRITE = 'Cool Cat';

const loadVm = project => {
    const vm = new VM();
    return vm.loadProject(project).then(() => {
        const sprite = vm.runtime.targets.find(target => !target.isStage && target.getName() === EDITING_SPRITE);
        if (sprite) vm.setEditingTarget(sprite.id);
        vm.start();
        return vm;
    });
};

const disposeVm = vm => {
    try {
        vm.stopAll();
    } finally {
        vm.quit();
    }
};

module.exports = {loadVm, disposeVm};
