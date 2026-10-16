import {pickOutdoorBackdrop, useRandomOutdoorBackdrop} from '../../../src/lib/random-backdrop';
import backdrops from '../../../src/lib/libraries/backdrops.json';

describe('random-backdrop', () => {
    test('seçilen dekor her zaman "outdoors" etiketlidir, duvar/mural gibi olanlar seçilmez', () => {
        for (let i = 0; i < 200; i++) {
            const item = pickOutdoorBackdrop();
            expect(item.tags.map(t => t.trim())).toContain('outdoors');
            expect(['Wall 1', 'Wall 2', 'Mural']).not.toContain(item.name.trim());
        }
    });

    test('rastgele sayıya göre ilk ve son adayı seçebilir', () => {
        expect(pickOutdoorBackdrop(() => 0)).toBeTruthy();
        expect(pickOutdoorBackdrop(() => 0.999999)).toBeTruthy();
        expect(backdrops).toContain(pickOutdoorBackdrop(() => 0.5));
    });

    const makeVm = addBackdrop => {
        const stage = {
            costumes: ['bos'],
            getCostumes () {
                return this.costumes;
            },
            deleteCostume: jest.fn(function (i) {
                this.costumes.splice(i, 1);
            })
        };
        return {
            stage: stage,
            runtime: {getTargetForStage: () => stage, requestTargetsUpdate: jest.fn()},
            addBackdrop: addBackdrop
        };
    };

    test('boş dekor, eklenen bina dışı dekorla değiştirilir', () => {
        const vm = makeVm(jest.fn(() => {
            vm.stage.costumes.push('yeni');
            return Promise.resolve();
        }));
        return useRandomOutdoorBackdrop(vm, () => 0).then(() => {
            expect(vm.addBackdrop).toHaveBeenCalledTimes(1);
            expect(vm.stage.costumes).toEqual(['yeni']);
            expect(vm.runtime.requestTargetsUpdate).toHaveBeenCalled();
        });
    });

    test('indirme başarısız olursa boş dekor kalır ve hata fırlatılmaz', () => {
        const vm = makeVm(jest.fn(() => Promise.reject(new Error('ağ yok'))));
        return useRandomOutdoorBackdrop(vm).then(() => {
            expect(vm.stage.deleteCostume).not.toHaveBeenCalled();
            expect(vm.stage.costumes).toEqual(['bos']);
        });
    });

    test('sahnede birden çok dekor varsa dokunmaz', () => {
        const vm = makeVm(jest.fn());
        vm.stage.costumes.push('ikinci');
        return useRandomOutdoorBackdrop(vm).then(() => expect(vm.addBackdrop).not.toHaveBeenCalled());
    });
});
