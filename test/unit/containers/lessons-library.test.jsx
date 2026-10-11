import React from 'react';
import {mountWithIntl} from '../../helpers/intl-helpers';
import {LessonsLibraryComponent} from '../../../src/containers/lessons-library';
import {progress} from '../../../src/lib/lessons/progress';

jest.mock('../../../src/components/library/library.jsx', () => {
    const React = require('react');
    const LibraryStub = () => React.createElement('div', {className: 'library-stub'});
    return {__esModule: true, default: LibraryStub};
});
jest.mock('../../../src/components/modal/modal.jsx', () => {
    const React = require('react');
    const ModalStub = props => React.createElement('div', {className: 'modal-stub'}, props.children);
    return {__esModule: true, default: ModalStub};
});

const setSearch = value => {
    Object.defineProperty(window.location, 'search', {value: value, configurable: true});
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const makeProps = overrides => Object.assign({
    visible: false,
    isProjectShown: false,
    vm: {loadProject: jest.fn(() => Promise.resolve())},
    onFailed: jest.fn(),
    onLoaded: jest.fn(),
    onLoading: jest.fn(),
    onLoadingFinished: jest.fn(),
    onLoadingStarted: jest.fn(),
    onRequestClose: jest.fn()
}, overrides);

const mountLibrary = props => {
    const wrapper = mountWithIntl(<LessonsLibraryComponent {...props} />);
    return {wrapper, instance: wrapper.find(LessonsLibraryComponent).instance()};
};

describe('LessonsLibrary container', () => {
    beforeEach(() => {
        window.alert = jest.fn();
        window.confirm = jest.fn(() => true);
        progress.reset('ilk-ders');
        setSearch('?lessons=sample');
    });

    test('?lesson= bağlantısı proje görünene kadar bekler, sonra dersi bir kez başlatır', () => {
        setSearch('?lessons=sample&lesson=ilk-ders');
        const props = makeProps();
        const {wrapper} = mountLibrary(props);
        return flush().then(() => {
            expect(props.onLoading).not.toHaveBeenCalled();
            wrapper.setProps({isProjectShown: true});
            return flush();
        }).then(() => {
            expect(props.onLoading).toHaveBeenCalledWith('ilk-ders');
            expect(props.onLoaded).toHaveBeenCalledTimes(1);
            expect(props.onLoaded.mock.calls[0][0].id).toBe('ilk-ders');
            wrapper.setProps({isProjectShown: false});
            wrapper.setProps({isProjectShown: true});
            return flush();
        }).then(() => {
            expect(props.onLoading).toHaveBeenCalledTimes(1);
        });
    });

    test('proje zaten görünüyorsa bağlantı hemen başlatır', () => {
        setSearch('?lessons=sample&lesson=ilk-ders');
        const props = makeProps({isProjectShown: true});
        mountLibrary(props);
        return flush().then(() => expect(props.onLoaded).toHaveBeenCalledTimes(1));
    });

    test('bağlantı yoksa ders kendiliğinden başlamaz', () => {
        const props = makeProps({isProjectShown: true});
        mountLibrary(props);
        return flush().then(() => expect(props.onLoading).not.toHaveBeenCalled());
    });

    test('kayıtlı ilerlemeden devam eder', () => {
        progress.save('ilk-ders', {step: 2, done: false});
        setSearch('?lessons=sample&lesson=ilk-ders');
        const props = makeProps({isProjectShown: true});
        mountLibrary(props);
        return flush().then(() => expect(props.onLoaded.mock.calls[0][1]).toBe(2));
    });

    test('var olmayan ders: failed bildirilir ve kullanıcıya uyarı gösterilir', () => {
        setSearch('?lessons=sample&lesson=yok-boyle-ders');
        const props = makeProps({isProjectShown: true});
        mountLibrary(props);
        return flush().then(() => {
            expect(props.onFailed).toHaveBeenCalledWith('Ders bulunamadı');
            expect(window.alert).toHaveBeenCalledWith('Ders bulunamadı');
            expect(props.onLoaded).not.toHaveBeenCalled();
        });
    });

    test('galeriden seçim: galeri kapanır ve ders başlar', () => {
        const props = makeProps({isProjectShown: true});
        const {instance} = mountLibrary(props);
        instance.handleSelect({id: 'tekrar-et'});
        return flush().then(() => {
            expect(props.onRequestClose).toHaveBeenCalled();
            expect(props.onLoaded.mock.calls[0][0].id).toBe('tekrar-et');
        });
    });

    test('başlangıç projesi: onaylanmazsa ders başlamaz, proje yüklenmez', () => {
        window.confirm = jest.fn(() => false);
        const props = makeProps({isProjectShown: true});
        const {instance} = mountLibrary(props);
        instance.api = {
            getLesson: () => Promise.resolve({id: 'ilk-ders', steps: [{}], startProject: '/uploads/a.sb3'})
        };
        window.fetch = jest.fn();
        return instance.start('ilk-ders').then(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(window.fetch).not.toHaveBeenCalled();
            expect(props.onLoading).not.toHaveBeenCalled();
            expect(props.onLoaded).not.toHaveBeenCalled();
        });
    });

    test('başlangıç projesi indirilemezse yükleme ekranı kapanır ve hata bildirilir', () => {
        const props = makeProps({isProjectShown: true});
        const {instance} = mountLibrary(props);
        instance.api = {
            getLesson: () => Promise.resolve({id: 'ilk-ders', steps: [{}], startProject: '/uploads/a.sb3'})
        };
        window.fetch = jest.fn(() => Promise.resolve({ok: false}));
        return instance.start('ilk-ders').then(() => {
            expect(props.onLoadingStarted).toHaveBeenCalledTimes(1);
            expect(props.onLoadingFinished).toHaveBeenCalledTimes(1);
            expect(props.onFailed).toHaveBeenCalledWith('Başlangıç projesi indirilemedi');
        });
    });

    test('başlangıç projesi yüklenir ve ders başlar', () => {
        const props = makeProps({isProjectShown: true});
        const {instance} = mountLibrary(props);
        instance.api = {
            getLesson: () => Promise.resolve({id: 'ilk-ders', steps: [{}], startProject: '/uploads/a.sb3'})
        };
        window.fetch = jest.fn(() => Promise.resolve({ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))}));
        return instance.start('ilk-ders').then(() => {
            expect(props.vm.loadProject).toHaveBeenCalledTimes(1);
            expect(props.onLoadingFinished).toHaveBeenCalledTimes(1);
            expect(props.onLoaded).toHaveBeenCalledTimes(1);
        });
    });

    test('liste alınamazsa hata durumu tutulur', () => {
        setSearch('');
        window.fetch = jest.fn(() => Promise.reject(new Error('offline')));
        const props = makeProps({visible: true});
        const {wrapper, instance} = mountLibrary(props);
        return flush().then(() => {
            expect(instance.state.error).toBe('Dersler şu an yüklenemedi');
            expect(instance.state.lessons).toBeNull();
            wrapper.update();
            expect(wrapper.find('.modal-stub').text()).toBe('Dersler şu an yüklenemedi');
        });
    });

    test('galeri açılınca liste yüklenir', () => {
        const props = makeProps({visible: true});
        const {wrapper, instance} = mountLibrary(props);
        return flush().then(() => {
            expect(instance.state.lessons.map(l => l.id)).toEqual(['ilk-ders', 'tekrar-et']);
            wrapper.update();
            expect(wrapper.find('.library-stub')).toHaveLength(1);
        });
    });
});
