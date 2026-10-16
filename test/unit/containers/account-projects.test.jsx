import React from 'react';
import {mount} from 'enzyme';
import {AccountProjectsComponent} from '../../../src/containers/account-projects';
import {AccountApiError} from '../../../src/lib/accounts/account-api';
import {captureThumbnail} from '../../../src/lib/accounts/thumbnail';

jest.mock('../../../src/lib/accounts/thumbnail', () => ({captureThumbnail: jest.fn(() => Promise.resolve(null))}));

jest.mock('../../../src/containers/modal.jsx', () => {
    const React = require('react');
    const ModalStub = props => React.createElement('div', null, props.children);
    return {__esModule: true, default: ModalStub};
});

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const makeApi = overrides => Object.assign({
    projects: jest.fn(() => Promise.resolve([{id: 7, title: 'Eski proje', size: 1000, shared: false, updatedAt: ''}])),
    saveProject: jest.fn((title) => Promise.resolve({id: 9, title: title, size: 4, shared: false})),
    updateProject: jest.fn(id => Promise.resolve({id: id, title: 'Eski proje', size: 4, shared: false})),
    renameProject: jest.fn((id, title) => Promise.resolve({id: id, title: title})),
    removeProject: jest.fn(() => Promise.resolve(null)),
    shareProject: jest.fn(() => Promise.resolve({})),
    saveThumbnail: jest.fn(() => Promise.resolve(null)),
    downloadProject: jest.fn(() => Promise.resolve(new ArrayBuffer(8)))
}, overrides);

const makeProps = overrides => Object.assign({
    api: makeApi(),
    vm: {
        saveProjectSb3: jest.fn(() => Promise.resolve(new Blob(['zip']))),
        loadProject: jest.fn(() => Promise.resolve()),
        toJSON: jest.fn(() => '{"targets":[{"blocks":{"a":1}}]}')
    },
    saveOpen: false,
    listOpen: false,
    quickShareOpen: false,
    onCloseQuickShare: jest.fn(),
    onOpenSharedGallery: jest.fn(),
    projectTitle: 'Yıldız oyunum',
    cloudProject: null,
    onCloseSave: jest.fn(),
    onCloseList: jest.fn(),
    onCloudProject: jest.fn(),
    onSetTitle: jest.fn(),
    onLoadingStarted: jest.fn(),
    onLoadingFinished: jest.fn()
}, overrides);

describe('AccountProjects', () => {
    beforeEach(() => {
        window.confirm = jest.fn(() => true);
    });

    test('yeni proje olarak kaydeder: sb3 sunucuya gider, açık proje bilgisi ve başlık güncellenir', () => {
        const props = makeProps({saveOpen: true});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            wrapper.update();
            expect(props.vm.saveProjectSb3).toHaveBeenCalled();
            expect(props.api.saveProject).toHaveBeenCalledWith('Yıldız oyunum', expect.anything());
            expect(props.onCloudProject).toHaveBeenCalledWith({id: 9, title: 'Yıldız oyunum'});
            expect(props.onSetTitle).toHaveBeenCalledWith('Yıldız oyunum');
            expect(wrapper.text()).toContain('hesabına kaydedildi');
        });
    });

    test('açık hesap projesinin üzerine yazar; başlık değiştiyse yeniden adlandırır', () => {
        const props = makeProps({saveOpen: true, cloudProject: {id: 7, title: 'Eski proje'}});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        wrapper.find('input[data-field="title"]').simulate('change', {target: {value: 'Yeni ad'}});
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            expect(props.api.updateProject).toHaveBeenCalledWith(7, expect.anything());
            expect(props.api.renameProject).toHaveBeenCalledWith(7, 'Yeni ad');
            expect(props.api.saveProject).not.toHaveBeenCalled();
        });
    });

    test('kaydetme hatasında mesaj gösterilir', () => {
        const props = makeProps({
            saveOpen: true,
            api: makeApi({saveProject: jest.fn(() => Promise.reject(new AccountApiError('En çok 20 proje saklayabilirsin', 409)))})
        });
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            wrapper.update();
            expect(wrapper.text()).toContain('En çok 20 proje');
            expect(props.onCloudProject).not.toHaveBeenCalled();
        });
    });

    test('proje listesi açılınca yüklenir; Aç projeyi VM\'e yükler ve pencereyi kapatır', () => {
        const props = makeProps({listOpen: true});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            expect(wrapper.text()).toContain('Eski proje');
            wrapper.find('button[data-action="open"]').simulate('click');
            return flush();
        }).then(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(props.onLoadingStarted).toHaveBeenCalled();
            expect(props.api.downloadProject).toHaveBeenCalledWith(7);
            expect(props.vm.loadProject).toHaveBeenCalled();
            expect(props.onCloudProject).toHaveBeenCalledWith({id: 7, title: 'Eski proje'});
            expect(props.onSetTitle).toHaveBeenCalledWith('Eski proje');
            expect(props.onLoadingFinished).toHaveBeenCalled();
            expect(props.onCloseList).toHaveBeenCalled();
        });
    });

    test('açma onaylanmazsa hiçbir şey yüklenmez', () => {
        window.confirm = jest.fn(() => false);
        const props = makeProps({listOpen: true});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            wrapper.find('button[data-action="open"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.api.downloadProject).not.toHaveBeenCalled();
            expect(props.onLoadingStarted).not.toHaveBeenCalled();
        });
    });

    test('indirme hatasında yükleme göstergesi kapanır ve hata gösterilir', () => {
        const props = makeProps({
            listOpen: true,
            api: makeApi({downloadProject: jest.fn(() => Promise.reject(new AccountApiError('Proje indirilemedi', 404)))})
        });
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            wrapper.find('button[data-action="open"]').simulate('click');
            return flush();
        }).then(() => {
            wrapper.update();
            expect(props.onLoadingFinished).toHaveBeenCalled();
            expect(props.onCloseList).not.toHaveBeenCalled();
            expect(wrapper.text()).toContain('Proje indirilemedi');
        });
    });

    test('silince liste yenilenir; açık proje silindiyse bağlantı kopar', () => {
        const props = makeProps({listOpen: true, cloudProject: {id: 7, title: 'Eski proje'}});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            wrapper.find('button[data-action="remove"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.api.removeProject).toHaveBeenCalledWith(7);
            expect(props.api.projects).toHaveBeenCalledTimes(2);
            expect(props.onCloudProject).toHaveBeenCalledWith(null);
        });
    });

    test('kaydedince sahnenin küçük resmi sunucuya gönderilir', () => {
        captureThumbnail.mockImplementationOnce(() => Promise.resolve({size: 3}));
        const props = makeProps({saveOpen: true});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        wrapper.find('form').simulate('submit');
        return flush().then(() => expect(props.api.saveThumbnail).toHaveBeenCalledWith(9, {size: 3}));
    });

    test('küçük resim alınamazsa kayıt yine de tamamlanır', () => {
        captureThumbnail.mockImplementationOnce(() => Promise.reject(new Error('x')));
        const props = makeProps({saveOpen: true});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            expect(props.onCloudProject).toHaveBeenCalledWith({id: 9, title: 'Yıldız oyunum'});
            expect(props.api.saveThumbnail).not.toHaveBeenCalled();
        });
    });

    test('paylaş düğmesi sunucuya gider ve liste yenilenir', () => {
        const props = makeProps({listOpen: true, userRole: 'teacher'});
        const wrapper = mount(<AccountProjectsComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            wrapper.find('button[data-action="share-site"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.api.shareProject).toHaveBeenCalledWith(7, true, 'site');
            expect(props.api.projects).toHaveBeenCalledTimes(2);
        });
    });

    describe('tek tıkla paylaş', () => {
        test('yeni proje: kaydeder, sınıfa paylaşır, bilgi mesajı gösterir', () => {
            const props = makeProps({quickShareOpen: true, userRole: 'student'});
            const wrapper = mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => {
                wrapper.update();
                expect(props.vm.saveProjectSb3).toHaveBeenCalled();
                expect(props.api.saveProject).toHaveBeenCalledWith('Yıldız oyunum', expect.anything());
                expect(props.api.shareProject).toHaveBeenCalledWith(9, true, 'class');
                expect(props.onCloudProject).toHaveBeenCalledWith({id: 9, title: 'Yıldız oyunum'});
                expect(wrapper.text()).toContain('sınıfınla paylaşıldı');
            });
        });

        test('hesaptan açılmış proje varsa üzerine yazar (yeni kopya açmaz)', () => {
            const props = makeProps({quickShareOpen: true, cloudProject: {id: 7, title: 'Eski proje'}});
            mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => {
                expect(props.api.updateProject).toHaveBeenCalledWith(7, expect.anything());
                expect(props.api.saveProject).not.toHaveBeenCalled();
                expect(props.api.shareProject).toHaveBeenCalledWith(7, true, 'class');
            });
        });

        test('başlık boşsa "Projem" adıyla kaydedilir', () => {
            const props = makeProps({quickShareOpen: true, projectTitle: ''});
            mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => expect(props.api.saveProject).toHaveBeenCalledWith('Projem', expect.anything()));
        });

        test('hata (ör. 20 proje sınırı) gösterilir, paylaşım denenmez', () => {
            const props = makeProps({
                quickShareOpen: true,
                api: makeApi({saveProject: jest.fn(() => Promise.reject(new AccountApiError('En çok 20 proje saklayabilirsin', 409)))})
            });
            const wrapper = mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => {
                wrapper.update();
                expect(wrapper.text()).toContain('En çok 20 proje');
                expect(props.api.shareProject).not.toHaveBeenCalled();
            });
        });

        test('Paylaşılanlara git: pencere kapanır, galeri açılır', () => {
            const props = makeProps({quickShareOpen: true});
            const wrapper = mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => {
                wrapper.update();
                wrapper.find('button[data-action="go-shared"]').simulate('click');
                expect(props.onCloseQuickShare).toHaveBeenCalled();
                expect(props.onOpenSharedGallery).toHaveBeenCalled();
            });
        });
    });

    describe('değişiklik yapılmadan paylaş', () => {
        // projeyi Projelerim'den açar, sonra Paylaş'a basar
        const openThenShare = (vmOverrides, apiOverrides) => {
            const props = makeProps({
                listOpen: true,
                api: makeApi(apiOverrides)
            });
            Object.assign(props.vm, vmOverrides);
            const wrapper = mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => {
                wrapper.update();
                wrapper.find('button[data-action="open"]').simulate('click');
                return flush();
            }).then(() => {
                wrapper.setProps({cloudProject: {id: 7, title: 'Eski proje'}, listOpen: false, quickShareOpen: true});
                return flush();
            }).then(() => {
                wrapper.update();
                return {props, wrapper};
            });
        };

        test('açılan proje değişmediyse uyarı çıkar, kaydetme/paylaşma yapılmaz', () => (
            openThenShare().then(({props, wrapper}) => {
                expect(wrapper.text()).toContain('değişiklik yapmadın');
                expect(props.api.updateProject).not.toHaveBeenCalled();
                expect(props.api.shareProject).not.toHaveBeenCalled();
            })
        ));

        test('değişiklik yapıldıysa uyarı çıkmaz, normal paylaşılır', () => {
            let calls = 0;
            return openThenShare({toJSON: jest.fn(() => (calls++ ? '{"targets":[{"blocks":{"a":2}}]}' : '{"targets":[{"blocks":{"a":1}}]}'))})
                .then(({props}) => {
                    expect(props.api.shareProject).toHaveBeenCalledWith(7, true, 'class');
                });
        });

        test('"Yine de paylaş" normal paylaşımı yapar', () => (
            openThenShare().then(({props, wrapper}) => {
                wrapper.find('button[data-action="share-anyway"]').simulate('click');
                return flush().then(() => {
                    expect(props.api.shareProject).toHaveBeenCalledWith(7, true, 'class');
                });
            })
        ));

        test('adı değiştir: yeni ad kaydedilir, başlık güncellenir', () => (
            openThenShare().then(({props, wrapper}) => {
                wrapper.find('button[data-action="rename"]').simulate('click');
                wrapper.find('input').simulate('change', {target: {value: 'Yeni ad'}});
                wrapper.find('form').simulate('submit');
                return flush().then(() => {
                    expect(props.api.renameProject).toHaveBeenCalledWith(7, 'Yeni ad');
                    expect(props.onCloudProject).toHaveBeenCalledWith({id: 7, title: 'Yeni ad'});
                    expect(props.onSetTitle).toHaveBeenCalledWith('Yeni ad');
                });
            })
        ));

        test('sil: önce onay ister, onaylanınca hesaptan siler ve açık hesap projesini bırakır', () => (
            openThenShare().then(({props, wrapper}) => {
                wrapper.find('button[data-action="delete"]').simulate('click');
                expect(props.api.removeProject).not.toHaveBeenCalled();
                wrapper.find('button[data-action="delete-confirm"]').simulate('click');
                return flush().then(() => {
                    expect(props.api.removeProject).toHaveBeenCalledWith(7);
                    expect(props.onCloudProject).toHaveBeenCalledWith(null);
                    expect(props.onCloseQuickShare).toHaveBeenCalled();
                });
            })
        ));
    });

    describe('boş proje', () => {
        test('hiç blok yoksa paylaşılmaz, uyarı çıkar', () => {
            const props = makeProps({quickShareOpen: true});
            props.vm.toJSON = jest.fn(() => JSON.stringify({targets: [{blocks: {}}, {blocks: {}}]}));
            const wrapper = mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => {
                wrapper.update();
                expect(wrapper.text()).toContain('Boş proje paylaşılamaz');
                expect(props.api.saveProject).not.toHaveBeenCalled();
                expect(props.api.shareProject).not.toHaveBeenCalled();
            });
        });

        test('en az bir blok varsa paylaşılır', () => {
            const props = makeProps({quickShareOpen: true});
            props.vm.toJSON = jest.fn(() => JSON.stringify({targets: [{blocks: {}}, {blocks: {a: {opcode: 'x'}}}]}));
            mount(<AccountProjectsComponent {...props} />);
            return flush().then(() => expect(props.api.shareProject).toHaveBeenCalled());
        });
    });
});
