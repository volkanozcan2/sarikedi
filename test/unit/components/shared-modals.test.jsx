import React from 'react';
import {mount} from 'enzyme';
import SharedGalleryModal from '../../../src/components/account/shared-gallery-modal.jsx';
import SharedProjectModal from '../../../src/components/account/shared-project-modal.jsx';

jest.mock('../../../src/containers/modal.jsx', () => {
    const React = require('react');
    const ModalStub = props => React.createElement('div', null, props.children);
    return {__esModule: true, default: ModalStub};
});

const card = overrides => Object.assign({
    id: 1, title: 'Yıldız oyunu', owner: {username: 'Pamuk', role: 'student'}, scope: 'class', hasThumbnail: true,
    likes: 3, liked: false, comments: 2, updatedAt: '2026-10-11T10:00:00.000Z'
}, overrides);

describe('SharedGalleryModal', () => {
    const props = overrides => Object.assign({
        user: {id: 1, role: 'student', username: 'Tekir'}, projects: [card(), card({id: 2, title: 'Labirent', hasThumbnail: false, owner: {username: 'ayse', role: 'teacher'}})],
        loading: false, error: null, onClose: jest.fn(), onSelect: jest.fn(), onLogin: jest.fn(), onRegister: jest.fn()
    }, overrides);

    test('kartlar başlık, takma ad, beğeni ve yorum sayısıyla görünür; gerçek isim yok', () => {
        const text = mount(<SharedGalleryModal {...props()} />).text();
        expect(text).toContain('Yıldız oyunu');
        expect(text).toContain('Pamuk');
        expect(text).toContain('Öğretmen: ayse');
        expect(text).toContain('3');
        expect(text).toContain('2');
    });

    test('küçük resmi olan kart sunucudaki resmi, olmayan Cool Cat\'i kullanır', () => {
        const wrapper = mount(<SharedGalleryModal {...props()} />);
        const sources = wrapper.find('img').map(img => img.prop('src'));
        expect(sources).toContain('/api/shared/1/thumbnail');
        expect(sources).toContain('static/cool-cat.png');
    });

    test('karta tıklayınca seçilir', () => {
        const p = props();
        const wrapper = mount(<SharedGalleryModal {...p} />);
        wrapper.find('button[data-id=2]').simulate('click');
        expect(p.onSelect).toHaveBeenCalledWith(2);
    });

    test('girişsizken giriş çağrısı gösterilir', () => {
        const p = props({user: null, projects: []});
        const wrapper = mount(<SharedGalleryModal {...p} />);
        expect(wrapper.text()).toContain('giriş yap');
        wrapper.find('button[data-action="login"]').simulate('click');
        wrapper.find('button[data-action="register"]').simulate('click');
        expect(p.onLogin).toHaveBeenCalled();
        expect(p.onRegister).toHaveBeenCalled();
    });

    test('boş liste açıklaması', () => {
        expect(mount(<SharedGalleryModal {...props({projects: []})} />).text()).toContain('Henüz paylaşılan proje yok');
    });
});

describe('SharedProjectModal', () => {
    const detail = overrides => Object.assign(card(), {
        canModerate: false, commentCount: 2,
        comments: [
            {id: 10, body: 'Harika!', author: {username: 'Tekir', role: 'student'}, createdAt: '2026-10-11T11:00:00.000Z', mine: true, canDelete: true},
            {id: 11, body: 'Güzel', author: {username: 'Zeytin', role: 'student'}, createdAt: '2026-10-11T12:00:00.000Z', mine: false, canDelete: false}
        ]
    }, overrides);
    const props = overrides => Object.assign({
        project: detail(), busy: false, error: null, onClose: jest.fn(), onBack: jest.fn(), onOpenCopy: jest.fn(),
        onLike: jest.fn(), onComment: jest.fn(), onDeleteComment: jest.fn(), onReport: jest.fn(),
        onSetScope: jest.fn(), onUnshare: jest.fn()
    }, overrides);

    test('başlık, sahibi, beğeni ve yorumlar; yalnızca takma adlar', () => {
        const text = mount(<SharedProjectModal {...props()} />).text();
        expect(text).toContain('Yıldız oyunu');
        expect(text).toContain('Pamuk');
        expect(text).toContain('Harika!');
        expect(text).toContain('Zeytin');
    });

    test('Aç, beğen işleyicileri', () => {
        const p = props();
        const wrapper = mount(<SharedProjectModal {...p} />);
        wrapper.find('button[data-action="open-copy"]').simulate('click');
        wrapper.find('button[data-action="like"]').simulate('click');
        expect(p.onOpenCopy).toHaveBeenCalled();
        expect(p.onLike).toHaveBeenCalled();
    });

    test('yorum yazılıp gönderilir ve alan temizlenir', () => {
        const p = props();
        const wrapper = mount(<SharedProjectModal {...p} />);
        wrapper.find('input[data-field="comment"]').simulate('change', {target: {value: 'Bravo!'}});
        wrapper.find('form').simulate('submit');
        expect(p.onComment).toHaveBeenCalledWith('Bravo!');
        expect(wrapper.find('input[data-field="comment"]').prop('value')).toBe('');
    });

    test('silme yalnızca yetkili yorumda; bildirme başkasının yorumunda; silme onay ister', () => {
        const p = props();
        const wrapper = mount(<SharedProjectModal {...p} />);
        expect(wrapper.find('button[data-action="delete-comment"]')).toHaveLength(1);
        expect(wrapper.find('button[data-action="report-comment"]')).toHaveLength(1);
        window.confirm = jest.fn(() => true);
        wrapper.find('button[data-action="delete-comment"]').simulate('click');
        expect(p.onDeleteComment).toHaveBeenCalledWith(10);
        wrapper.find('button[data-action="report-comment"]').simulate('click');
        expect(p.onReport).toHaveBeenCalledWith(11);
    });

    test('proje bildirme düğmesi (kendi projen değilse)', () => {
        const p = props();
        const wrapper = mount(<SharedProjectModal {...p} />);
        wrapper.find('button[data-action="report-project"]').simulate('click');
        expect(p.onReport).toHaveBeenCalledWith(null);
    });

    test('moderatör: kapsamı değiştirir ve paylaşımı kaldırır', () => {
        const p = props({project: detail({canModerate: true})});
        const wrapper = mount(<SharedProjectModal {...p} />);
        wrapper.find('button[data-action="scope-site"]').simulate('click');
        expect(p.onSetScope).toHaveBeenCalledWith('site');
        window.confirm = jest.fn(() => true);
        wrapper.find('button[data-action="unshare"]').simulate('click');
        expect(p.onUnshare).toHaveBeenCalled();
    });

    test('moderatör değilse moderasyon düğmeleri yok; hata gösterilir', () => {
        const wrapper = mount(<SharedProjectModal {...props({error: 'Çok fazla yorum yazdın'})} />);
        expect(wrapper.find('button[data-action="unshare"]')).toHaveLength(0);
        expect(wrapper.text()).toContain('Çok fazla yorum');
    });
});
