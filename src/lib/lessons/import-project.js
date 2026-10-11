/**
 * @fileoverview
 * Hazır bir .sb3 dosyasını derse çevirir: projeyi ayrı bir (arayüzsüz) VM'e yükler, betiklerinden
 * adımlar üretir, sonra blokları silip kalan projeyi (kuklalar, kostümler, sesler, değişkenler)
 * dersin başlangıç projesi olarak kaydeder. Düzenleyicideki mevcut proje etkilenmez.
 */

import {buildImportSteps} from './importer';

const readWithReader = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsArrayBuffer(file);
});

const readBuffer = file => (typeof file.arrayBuffer === 'function' ? file.arrayBuffer() : readWithReader(file));

const stripBlocks = worker => {
    worker.runtime.targets.forEach(target => {
        if (!target.isOriginal) return;
        target.blocks.getScripts().slice()
            .forEach(id => target.blocks.deleteBlock(id));
        target.comments = {};
    });
};

/**
 * @param {object} vm düzenleyicinin scratch-vm'i (yalnızca sınıfı ve depolaması kullanılır)
 * @param {File} file .sb3 dosyası
 * @param {object} [options] chunkSize, labels (buildImportSteps seçenekleri)
 * @return {Promise<object>} {steps, blob, title}
 */
const importProjectFile = (vm, file, options) => {
    const Worker = vm.constructor;
    const worker = new Worker();
    if (vm.runtime && vm.runtime.storage) worker.attachStorage(vm.runtime.storage);
    return readBuffer(file)
        .then(buffer => worker.loadProject(buffer))
        .then(() => {
            const steps = buildImportSteps(worker, options);
            stripBlocks(worker);
            return worker.saveProjectSb3().then(blob => ({
                steps: steps,
                blob: blob,
                title: String(file.name || '').replace(/\.sb3$/i, '')
            }));
        })
        .then(
            result => {
                worker.quit();
                return result;
            },
            error => {
                worker.quit();
                throw error;
            }
        );
};

export {
    importProjectFile
};
