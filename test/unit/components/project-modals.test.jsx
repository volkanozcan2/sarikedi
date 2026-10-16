import React from 'react';
import {mount} from 'enzyme';
import SaveProjectModal from '../../../src/components/account/save-project-modal.jsx';
import MyProjectsModal from '../../../src/components/account/my-projects-modal.jsx';

jest.mock('../../../src/containers/modal.jsx', () => {
    const React = require('react');
    const ModalStub = props => React.createElement('div', null, props.children);
    return {__esModule: true, default: ModalStub};
});

describe('SaveProjectModal', () => {
    const props = overrides => Object.assign({
        initialTitle: 'Yıldız oyunum', cloudProject: null, busy: false, error: null, message: null,
        onClose: jest.fn(), onSave: jest.fn()
    }, overrides);

    test('başlık önceden doludur; kaydedince başlık ve "yeni" kipi iletilir', () => {
        const p = props();
        const wrapper = mount(<SaveProjectModal {...p} />);
        expect(wrapper.find('input[data-field="title"]').prop('value')).toBe('Yıldız oyunum');
        wrapper.find('input[data-field="title"]').simulate('change', {target: {value: 'Yeni ad'}});
        wrapper.find('form').simulate('submit');
        expect(p.onSave).toHaveBeenCalledWith('Yeni ad', false);
    });

    test('hesaptan açılmış proje varsa varsayılan üzerine yazmadır; yeni olarak kaydetmek seçilebilir', () => {
        const p = props({cloudProject: {id: 4, title: 'Eski ad'}});
        const wrapper = mount(<SaveProjectModal {...p} />);
        expect(wrapper.text()).toContain('Eski ad');
        wrapper.find('form').simulate('submit');
        expect(p.onSave).toHaveBeenLastCalledWith('Yıldız oyunum', true);
        wrapper.find('input[data-field="mode"][value="new"]').simulate('change', {target: {value: 'new'}});
        wrapper.find('form').simulate('submit');
        expect(p.onSave).toHaveBeenLastCalledWith('Yıldız oyunum', false);
    });

    test('hata ve başarı mesajı gösterilir; başarıda form yerine Tamam çıkar', () => {
        expect(mount(<SaveProjectModal {...props({error: 'En çok 20 proje'})} />).text()).toContain('En çok 20 proje');
        const done = mount(<SaveProjectModal {...props({message: 'Kaydedildi'})} />);
        expect(done.text()).toContain('Kaydedildi');
        expect(done.find('form')).toHaveLength(0);
        done.find('button[data-action="done"]').simulate('click');
    });

    test('meşgulken kaydet düğmesi kapalı', () => {
        const wrapper = mount(<SaveProjectModal {...props({busy: true})} />);
        expect(wrapper.find('button[type="submit"]').prop('disabled')).toBe(true);
    });
});

describe('MyProjectsModal', () => {
    const projects = () => [
        {id: 1, title: 'Yıldız oyunum', size: 1500000, shared: false, updatedAt: '2026-10-11T10:00:00.000Z'},
        {id: 2, title: 'Labirent', size: 800000, shared: true, updatedAt: '2026-10-10T10:00:00.000Z'}
    ];
    const props = overrides => Object.assign({
        projects: projects(), busy: false, error: null, onClose: jest.fn(), onOpen: jest.fn(), onRemove: jest.fn()
    }, overrides);

    test('projeler adı, boyutu ve sayaçla listelenir', () => {
        const text = mount(<MyProjectsModal {...props()} />).text();
        expect(text).toContain('Yıldız oyunum');
        expect(text).toContain('Labirent');
        expect(text).toContain('2 / 20');
        expect(text).toContain('1.4 MB');
    });

    test('Aç ve Sil işleyicileri; silme onay ister', () => {
        const p = props();
        const wrapper = mount(<MyProjectsModal {...p} />);
        wrapper.find('button[data-action="open"][data-id=2]').simulate('click');
        expect(p.onOpen).toHaveBeenCalledWith(2, 'Labirent');
        window.confirm = jest.fn(() => false);
        wrapper.find('button[data-action="remove"][data-id=1]').simulate('click');
        expect(p.onRemove).not.toHaveBeenCalled();
        window.confirm = jest.fn(() => true);
        wrapper.find('button[data-action="remove"][data-id=1]').simulate('click');
        expect(p.onRemove).toHaveBeenCalledWith(1);
    });

    test('paylaşım düğmeleri: öğrenci yalnızca sınıfla, öğretmen siteyle de; paylaşılmış projede kaldırma', () => {
        const onShare = jest.fn();
        const student = mount(<MyProjectsModal {...props({onShare: onShare, userRole: 'student'})} />);
        expect(student.find('button[data-action="share-site"]')).toHaveLength(0);
        student.find('button[data-action="share-class"][data-id=1]').simulate('click');
        expect(onShare).toHaveBeenLastCalledWith(1, true, 'class');
        student.find('button[data-action="unshare"][data-id=2]').simulate('click');
        expect(onShare).toHaveBeenLastCalledWith(2, false, 'class');
        const teacher = mount(<MyProjectsModal {...props({onShare: onShare, userRole: 'teacher'})} />);
        teacher.find('button[data-action="share-site"][data-id=1]').simulate('click');
        expect(onShare).toHaveBeenLastCalledWith(1, true, 'site');
    });

    test('hiç proje yoksa açıklama gösterilir', () => {
        expect(mount(<MyProjectsModal {...props({projects: []})} />).text()).toContain('Henüz kaydedilmiş projen yok');
    });
});
