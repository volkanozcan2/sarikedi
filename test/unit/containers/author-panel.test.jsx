import React from 'react';
import {mount} from 'enzyme';
import {AuthorPanelComponent} from '../../../src/containers/author-panel';
import {emptyLesson} from '../../../src/lib/lessons/draft';
import {AdminApiError} from '../../../src/lib/lessons/admin-api';
import {movesFixture} from '../lessons/helpers/blocks-fixture';

jest.mock('scratch-blocks', () => ({
    getMainWorkspace: () => ({
        getFlyout: () => ({
            getWorkspace: () => ({
                getAllBlocks: () => [
                    {type: 'motion_movesteps', isShadow: () => false},
                    {type: 'motion_movesteps', isShadow: () => false},
                    {type: 'math_number', isShadow: () => true},
                    {type: 'looks_say', isShadow: () => false}
                ]
            })
        })
    })
}));

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const button = (wrapper, label) => wrapper.find('button').filterWhere(b => b.text().indexOf(label) !== -1);
const change = (input, value) => input.simulate('change', {target: {value: value, checked: value}});

const summary = (id, order, published) => ({
    id: id, title: id.toUpperCase(), description: '', level: 'baslangic', cover: null, order: order,
    stepCount: 1, published: published !== false
});

const savedLesson = overrides => Object.assign(emptyLesson(), {
    id: 'a-ders', title: 'A', steps: [{text: 'Bir adım metni', media: null, hint: null, checks: [], guide: []}]
}, overrides);

const makeApi = overrides => Object.assign({
    me: jest.fn(() => Promise.resolve(true)),
    login: jest.fn(() => Promise.resolve({admin: true})),
    logout: jest.fn(() => Promise.resolve({admin: false})),
    list: jest.fn(() => Promise.resolve([summary('a-ders', 0), summary('b-ders', 1, false)])),
    get: jest.fn(id => Promise.resolve(savedLesson({id: id}))),
    create: jest.fn(lesson => Promise.resolve(lesson)),
    replace: jest.fn((id, lesson) => Promise.resolve(lesson)),
    remove: jest.fn(() => Promise.resolve(null)),
    reorder: jest.fn(() => Promise.resolve({ok: true})),
    upload: jest.fn(() => Promise.resolve({url: '/uploads/abc.png'}))
}, overrides);

const fakeVm = () => {
    const cat = {
        isStage: false, isOriginal: true, getName: () => 'Cool Cat',
        blocks: {
            _blocks: movesFixture(),
            getScripts: () => ['hat']
        }
    };
    return {
        runtime: {targets: [cat]},
        saveProjectSb3: jest.fn(() => Promise.resolve(new Blob(['zip'])))
    };
};

const mountPanel = (overrides, apiOverrides) => {
    const api = makeApi(apiOverrides);
    const props = Object.assign({vm: fakeVm(), api: api, isAuthorMode: true}, overrides);
    const wrapper = mount(<AuthorPanelComponent {...props} />);
    return {wrapper, api, instance: wrapper.instance(), vm: props.vm};
};

const open = ctx => {
    button(ctx.wrapper, 'Yönetici').simulate('click');
    return flush().then(() => ctx.wrapper.update());
};

describe('AuthorPanel', () => {
    beforeEach(() => {
        window.confirm = jest.fn(() => true);
    });

    test('yazar modu kapalıysa hiçbir şey çizmez ve istek atmaz', () => {
        const {wrapper, api} = mountPanel({isAuthorMode: false});
        expect(wrapper.html()).toBeNull();
        expect(api.me).not.toHaveBeenCalled();
    });

    test('kapalıyken yalnızca düğme; açınca oturum denetlenir ve liste gelir', () => {
        const ctx = mountPanel();
        expect(ctx.api.me).not.toHaveBeenCalled();
        return open(ctx).then(() => {
            expect(ctx.api.me).toHaveBeenCalledTimes(1);
            expect(ctx.api.list).toHaveBeenCalledTimes(1);
            expect(ctx.wrapper.text()).toContain('A-DERS');
            expect(ctx.wrapper.text()).toContain('Gizli');
        });
    });

    test('oturum yoksa giriş ekranı; giriş yapınca liste', () => {
        const ctx = mountPanel({}, {me: jest.fn(() => Promise.resolve(false))});
        return open(ctx).then(() => {
            expect(ctx.wrapper.find('input[type="password"]')).toHaveLength(1);
            expect(ctx.api.list).not.toHaveBeenCalled();
            change(ctx.wrapper.find('input[type="password"]'), 'sifre');
            button(ctx.wrapper, 'Giriş').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.api.login).toHaveBeenCalledWith('sifre');
            expect(ctx.wrapper.text()).toContain('A-DERS');
        });
    });

    test('yanlış şifre hatası gösterilir', () => {
        const ctx = mountPanel({}, {
            me: jest.fn(() => Promise.resolve(false)),
            login: jest.fn(() => Promise.reject(new AdminApiError('Şifre yanlış', 401)))
        });
        return open(ctx).then(() => {
            change(ctx.wrapper.find('input[type="password"]'), 'x');
            button(ctx.wrapper, 'Giriş').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.wrapper.text()).toContain('Şifre yanlış');
        });
    });

    test('yeni ders: başlıktan kimlik üretilir, kaydet create çağırır', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Yeni ders').simulate('click');
            ctx.wrapper.update();
            change(ctx.wrapper.find('input[data-field="title"]'), 'Yıldız Yakala');
            ctx.wrapper.update();
            expect(ctx.wrapper.find('input[data-field="id"]').prop('value')).toBe('yildiz-yakala');
            change(ctx.wrapper.find('textarea[data-field="text"]'), 'Merhaba, ilk adım!');
            button(ctx.wrapper, 'Kaydet').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.api.create).toHaveBeenCalledTimes(1);
            const sent = ctx.api.create.mock.calls[0][0];
            expect(sent.id).toBe('yildiz-yakala');
            expect(sent.steps[0].text).toBe('Merhaba, ilk adım!');
            expect(ctx.wrapper.text()).toContain('Kaydedildi');
            expect(ctx.wrapper.text()).toContain('gizli');
            expect(ctx.wrapper.find('input[data-field="id"]').prop('readOnly')).toBe(true);
        });
    });

    test('yayında olan ders kaydedilince gizli uyarısı çıkmaz', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Yeni ders').simulate('click');
            ctx.wrapper.update();
            change(ctx.wrapper.find('input[data-field="title"]'), 'Açık Ders');
            change(ctx.wrapper.find('textarea[data-field="text"]'), 'Bir adım metni');
            change(ctx.wrapper.find('input[data-field="published"]'), true);
            button(ctx.wrapper, 'Kaydet').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.api.create.mock.calls[0][0].published).toBe(true);
            expect(ctx.wrapper.text()).toContain('Kaydedildi');
            expect(ctx.wrapper.text()).not.toContain('gizli');
        });
    });

    test('geçersiz taslak istek atmadan hata gösterir', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Yeni ders').simulate('click');
            ctx.wrapper.update();
            button(ctx.wrapper, 'Kaydet').simulate('click');
            ctx.wrapper.update();
            expect(ctx.api.create).not.toHaveBeenCalled();
            expect(ctx.wrapper.text()).toContain('title:');
        });
    });

    test('elle yazılan kimlik başlık değişince ezilmez ve temizlenir', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Yeni ders').simulate('click');
            ctx.wrapper.update();
            change(ctx.wrapper.find('input[data-field="id"]'), 'Özel Kimlik!');
            ctx.wrapper.update();
            expect(ctx.wrapper.find('input[data-field="id"]').prop('value')).toBe('ozel-kimlik');
            change(ctx.wrapper.find('input[data-field="title"]'), 'Başka');
            ctx.wrapper.update();
            expect(ctx.wrapper.find('input[data-field="id"]').prop('value')).toBe('ozel-kimlik');
        });
    });

    test('mevcut dersi düzenle ve kaydet replace çağırır; sunucu hatası taslağı korur', () => {
        const ctx = mountPanel({}, {
            replace: jest.fn(() => Promise.reject(new AdminApiError('Ders geçersiz', 400, ['steps: bozuk'])))
        });
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.api.get).toHaveBeenCalledWith('a-ders');
            change(ctx.wrapper.find('input[data-field="title"]'), 'Yeni başlık');
            button(ctx.wrapper, 'Kaydet').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.api.replace).toHaveBeenCalledTimes(1);
            expect(ctx.api.replace.mock.calls[0][0]).toBe('a-ders');
            expect(ctx.wrapper.text()).toContain('steps: bozuk');
            expect(ctx.wrapper.find('input[data-field="title"]').prop('value')).toBe('Yeni başlık');
            expect(ctx.wrapper.text()).toContain('Kaydedilmemiş değişiklik');
        });
    });

    test('oturum bitince (401) giriş ekranına döner ama taslak korunur', () => {
        const ctx = mountPanel({}, {
            replace: jest.fn(() => Promise.reject(new AdminApiError('Giriş gerekli', 401)))
        });
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            change(ctx.wrapper.find('input[data-field="title"]'), 'Korunacak başlık');
            button(ctx.wrapper, 'Kaydet').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.wrapper.find('input[type="password"]')).toHaveLength(1);
            expect(ctx.wrapper.text()).toContain('Oturum bitti');
            expect(ctx.instance.state.draft.title).toBe('Korunacak başlık');
        });
    });

    test('oturum düşüp yeniden giriş yapılınca düzenleme ekranına dönülür ve taslak kaydedilebilir', () => {
        let fail = true;
        const ctx = mountPanel({}, {
            replace: jest.fn((id, lesson) => (fail ?
                Promise.reject(new AdminApiError('Giriş gerekli', 401)) : Promise.resolve(lesson)))
        });
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            change(ctx.wrapper.find('input[data-field="title"]'), 'Korunacak');
            button(ctx.wrapper, 'Kaydet').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.wrapper.find('input[type="password"]')).toHaveLength(1);
            fail = false;
            change(ctx.wrapper.find('input[type="password"]'), 'sifre');
            button(ctx.wrapper, 'Giriş').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.wrapper.find('input[data-field="title"]').prop('value')).toBe('Korunacak');
            expect(ctx.wrapper.text()).toContain('Kaydedilmemiş değişiklik');
            button(ctx.wrapper, 'Kaydet').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.api.replace).toHaveBeenCalledTimes(2);
            expect(ctx.wrapper.text()).toContain('Kaydedildi');
        });
    });

    test('kaydedilmemiş değişiklikle Geri onay ister; reddedilirse kalır', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            change(ctx.wrapper.find('input[data-field="title"]'), 'Değişti');
            window.confirm = jest.fn(() => false);
            button(ctx.wrapper, 'Geri').simulate('click');
            ctx.wrapper.update();
            expect(window.confirm).toHaveBeenCalled();
            expect(ctx.wrapper.find('input[data-field="title"]')).toHaveLength(1);
            window.confirm = jest.fn(() => true);
            button(ctx.wrapper, 'Geri').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.wrapper.find('input[data-field="title"]')).toHaveLength(0);
            expect(ctx.api.list).toHaveBeenCalledTimes(2);
        });
    });

    test('yayınla/gizle, sırala ve sil', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Gizle').at(0).simulate('click');
            return flush();
        }).then(() => {
            expect(ctx.api.replace).toHaveBeenCalledWith('a-ders', expect.objectContaining({published: false}));
            ctx.wrapper.update();
            button(ctx.wrapper, '▼').at(0).simulate('click');
            return flush();
        }).then(() => {
            expect(ctx.api.reorder).toHaveBeenCalledWith(['b-ders', 'a-ders']);
            ctx.wrapper.update();
            button(ctx.wrapper, 'Sil').at(0).simulate('click');
            return flush();
        }).then(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(ctx.api.remove).toHaveBeenCalledWith('a-ders');
        });
    });

    test('silme onaylanmazsa istek atılmaz', () => {
        window.confirm = jest.fn(() => false);
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Sil').at(0).simulate('click');
            expect(ctx.api.remove).not.toHaveBeenCalled();
        });
    });

    test('betik yakalanıp kontrol olarak eklenir; palet opcode\'ları benzersiz gelir', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.instance.state.paletteOpcodes).toEqual(['looks_say', 'motion_movesteps']);
            expect(ctx.instance.state.scripts).toHaveLength(1);
            button(ctx.wrapper, 'Kontrol olarak ekle').simulate('click');
            ctx.wrapper.update();
            const checks = ctx.instance.state.draft.steps[0].checks;
            expect(checks).toHaveLength(1);
            expect(checks[0].type).toBe('blocks');
            expect(checks[0].pattern.opcode).toBe('event_whenflagclicked');
            expect(checks[0].sprite).toBe('Cool Cat');
            expect(ctx.instance.state.dirty).toBe(true);
        });
    });

    test('yakalama hatası taslağı değiştirmez ve mesaj gösterir', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            ctx.instance.capture({sprite: 'Yok', id: 'x'}, false);
            ctx.wrapper.update();
            expect(ctx.instance.state.draft.steps[0].checks).toHaveLength(0);
            expect(ctx.wrapper.text()).toContain('Betik bulunamadı');
        });
    });

    test('kontrolleri dene sonucu gösterir', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            button(ctx.wrapper, 'Kontrol olarak ekle').simulate('click');
            ctx.wrapper.update();
            button(ctx.wrapper, 'Kontrolleri dene').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.wrapper.text()).toContain('Geçti');
        });
    });

    test('adım ekle, sırala ve sil (onayla)', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            button(ctx.wrapper, 'Adım ekle').simulate('click');
            ctx.wrapper.update();
            expect(ctx.instance.state.draft.steps).toHaveLength(2);
            button(ctx.wrapper, 'Yukarı').simulate('click');
            ctx.wrapper.update();
            button(ctx.wrapper, 'Adımı sil').simulate('click');
            ctx.wrapper.update();
            expect(window.confirm).toHaveBeenCalled();
            expect(ctx.instance.state.draft.steps).toHaveLength(1);
            expect(ctx.instance.state.stepIndex).toBe(0);
        });
    });

    test('kapak yükleme ve başlangıç projesi', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            ctx.instance.uploadCover(new Blob(['png']));
            return flush();
        }).then(() => {
            expect(ctx.api.upload).toHaveBeenCalledTimes(1);
            expect(ctx.instance.state.draft.cover).toBe('/uploads/abc.png');
            ctx.instance.useCurrentProject();
            return flush();
        }).then(() => {
            expect(ctx.vm.saveProjectSb3).toHaveBeenCalled();
            expect(ctx.instance.state.draft.startProject).toBe('/uploads/abc.png');
            ctx.instance.clearStartProject();
            expect(ctx.instance.state.draft.startProject).toBeNull();
        });
    });

    test('yükleme hatası mesajı gösterilir', () => {
        const ctx = mountPanel({}, {upload: jest.fn(() => Promise.reject(new AdminApiError('Dosya çok büyük', 413)))});
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
            return flush();
        }).then(() => {
            ctx.instance.uploadCover(new Blob(['x']));
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.wrapper.text()).toContain('Dosya çok büyük');
            expect(ctx.instance.state.draft.cover).toBeNull();
        });
    });

    test('çıkış: değişiklik yoksa girişe döner', () => {
        const ctx = mountPanel();
        return open(ctx).then(() => {
            button(ctx.wrapper, 'Çıkış').simulate('click');
            return flush();
        }).then(() => {
            ctx.wrapper.update();
            expect(ctx.api.logout).toHaveBeenCalled();
            expect(ctx.wrapper.find('input[type="password"]')).toHaveLength(1);
        });
    });

    describe('kayıt modu', () => {
        const startRecording = ctx => open(ctx).then(() => {
            button(ctx.wrapper, 'Yeni ders').simulate('click');
            ctx.wrapper.update();
            window.confirm = jest.fn(() => true);
            button(ctx.wrapper, 'Kaydı başlat').simulate('click');
            return flush();
        }).then(() => ctx.wrapper.update());
        const addTurnAfterMove = ctx => {
            const blocks = ctx.vm.runtime.targets[0].blocks._blocks;
            blocks.turn2 = Object.assign({}, blocks.turn, {id: 'turn2', parent: 'turn', next: null});
            blocks.turn.next = 'turn2';
        };

        test('kaydı başlat: proje başlangıç projesi olarak yüklenir, kayıt açılır', () => {
            const ctx = mountPanel();
            return startRecording(ctx).then(() => {
                expect(ctx.vm.saveProjectSb3).toHaveBeenCalled();
                expect(ctx.api.upload).toHaveBeenCalled();
                expect(ctx.instance.state.draft.startProject).toBe('/uploads/abc.png');
                // panel küçülür, kayıt çubuğu görünür
                expect(ctx.instance.state.open).toBe(false);
                expect(button(ctx.wrapper, 'Adımı kaydet')).toHaveLength(1);
                expect(button(ctx.wrapper, 'Kaydı bitir')).toHaveLength(1);
            });
        });

        test('onay verilmezse kayıt başlamaz', () => {
            const ctx = mountPanel();
            return open(ctx).then(() => {
                button(ctx.wrapper, 'Yeni ders').simulate('click');
                window.confirm = jest.fn(() => false);
                button(ctx.wrapper, 'Kaydı başlat').simulate('click');
                return flush();
            }).then(() => {
                expect(ctx.api.upload).not.toHaveBeenCalled();
                expect(ctx.instance.state.recording).toBeNull();
            });
        });

        test('değişiklik yokken adım eklenmez; blok eklenince boş adımın yerine kayıtlı adım gelir', () => {
            const ctx = mountPanel();
            return startRecording(ctx).then(() => {
                button(ctx.wrapper, 'Adımı kaydet').simulate('click');
                expect(ctx.instance.state.message).toContain('değişikliği yok');
                expect(ctx.instance.state.draft.steps).toHaveLength(1);
                addTurnAfterMove(ctx);
                button(ctx.wrapper, 'Adımı kaydet').simulate('click');
                const steps = ctx.instance.state.draft.steps;
                expect(steps).toHaveLength(1);
                expect(steps[0].checks).toHaveLength(1);
                expect(ctx.instance.state.stepIndex).toBe(0);
                expect(ctx.instance.state.dirty).toBe(true);
            });
        });

        test('kaydı bitir ve geri dönünce kayıt kapanır', () => {
            const ctx = mountPanel();
            return startRecording(ctx).then(() => {
                button(ctx.wrapper, 'Kaydı bitir').simulate('click');
                ctx.wrapper.update();
                expect(ctx.instance.state.recording).toBeNull();
                expect(button(ctx.wrapper, 'Kaydı bitir')).toHaveLength(0);
                button(ctx.wrapper, 'Yönetici').simulate('click');
                expect(button(ctx.wrapper, 'Kaydı başlat')).toHaveLength(1);
            });
        });
    });

    describe('hazır projeyi içe aktar', () => {
        class FakeWorkerVm {
            constructor () {
                const blocks = movesFixture();
                this.runtime = {targets: [{
                    isStage: false, isOriginal: true, getName: () => 'Cool Cat', comments: {},
                    blocks: {
                        _blocks: blocks,
                        getScripts: () => ['hat'],
                        deleteBlock: () => {}
                    }
                }]};
            }
            attachStorage () {}
            loadProject () {
                return Promise.resolve();
            }
            saveProjectSb3 () {
                return Promise.resolve(new Blob(['zip']));
            }
            quit () {}
        }
        const importFile = (ctx, size) => open(ctx).then(() => {
            button(ctx.wrapper, 'Yeni ders').simulate('click');
            window.confirm = jest.fn(() => true);
            ctx.vm.constructor = FakeWorkerVm;
            ctx.instance.importProject({name: 'Harika Oyun.sb3', arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))}, size);
            return flush();
        }).then(() => flush());

        test('adımlar, başlangıç projesi ve başlık taslağa yazılır', () => {
            const ctx = mountPanel();
            return importFile(ctx, 3).then(() => {
                const draft = ctx.instance.state.draft;
                expect(draft.steps.length).toBeGreaterThan(1);
                expect(draft.steps[0].guide.length).toBeGreaterThan(0);
                expect(draft.startProject).toBe('/uploads/abc.png');
                expect(draft.title).toBe('Harika Oyun');
                expect(draft.id).toBe('harika-oyun');
                expect(ctx.api.upload).toHaveBeenCalled();
                expect(ctx.instance.state.dirty).toBe(true);
            });
        });

        test('otomatik kontrol kapalıyken adımların kontrolü olmaz (öğrenci İleri der), açıkken olur', () => {
            const ctx = mountPanel();
            return importFile(ctx, 3).then(() => {
                expect(ctx.instance.state.draft.steps.every(step => step.checks.length === 0)).toBe(true);
                expect(ctx.instance.state.draft.steps[0].guide.length).toBeGreaterThan(0);
                ctx.instance.importProject({name: 'a.sb3', arrayBuffer: () => Promise.resolve(new ArrayBuffer(1))}, 3, true);
                return flush().then(() => flush()).then(() => {
                    expect(ctx.instance.state.draft.steps[0].checks).toHaveLength(1);
                });
            });
        });

        test('hatada taslak değişmez ve hata gösterilir', () => {
            const ctx = mountPanel();
            return importFile(ctx, 3).then(() => {
                const before = ctx.instance.state.draft;
                ctx.vm.constructor = class extends FakeWorkerVm {
                    loadProject () {
                        return Promise.reject(new Error('Dosya bozuk'));
                    }
                };
                ctx.instance.importProject({name: 'x.sb3', arrayBuffer: () => Promise.resolve(new ArrayBuffer(1))}, 3);
                return flush().then(() => flush()).then(() => {
                    expect(ctx.instance.state.draft).toBe(before);
                    expect(ctx.instance.state.error).toBe('Dosya bozuk');
                });
            });
        });
    });

    describe('yerleşim ve gezinme', () => {
        let app;
        beforeEach(() => {
            app = document.createElement('div');
            app.id = 'app';
            document.body.appendChild(app);
        });
        afterEach(() => {
            document.body.removeChild(app);
        });

        test('panel açılınca editör daralır, küçülünce eski haline döner', () => {
            const ctx = mountPanel();
            button(ctx.wrapper, 'Yönetici').simulate('click');
            expect(app.style.minWidth).toBe('0');
            return flush().then(() => {
                ctx.wrapper.update();
                button(ctx.wrapper, 'Küçült').simulate('click');
                expect(app.style.minWidth).toBe('');
            });
        });

        test('başlıktaki "Ders listesi" düzenlemeden listeye döner', () => {
            const ctx = mountPanel();
            return open(ctx).then(() => {
                button(ctx.wrapper, 'Düzenle').at(0).simulate('click');
                return flush();
            }).then(() => {
                ctx.wrapper.update();
                button(ctx.wrapper, 'Ders listesi').simulate('click');
                return flush();
            }).then(() => {
                ctx.wrapper.update();
                expect(ctx.instance.state.status).toBe('list');
                expect(ctx.instance.state.draft).toBeNull();
            });
        });

        test('listede "Dersler menüsü" kütüphaneyi açar', () => {
            const onOpenLessons = jest.fn();
            const ctx = mountPanel({onOpenLessons: onOpenLessons});
            return open(ctx).then(() => {
                button(ctx.wrapper, 'Dersler menüsü').simulate('click');
                expect(onOpenLessons).toHaveBeenCalledTimes(1);
            });
        });
    });
});
