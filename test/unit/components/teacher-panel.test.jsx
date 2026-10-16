import React from 'react';
import {mount} from 'enzyme';
import TeacherPanel from '../../../src/components/account/teacher-panel.jsx';

jest.mock('../../../src/containers/modal.jsx', () => {
    const React = require('react');
    const ModalStub = props => React.createElement('div', null, props.children);
    return {__esModule: true, default: ModalStub};
});

const baseProps = overrides => Object.assign({
    classes: [{id: 1, name: '5-A', code: 'ABC234', studentCount: 2}, {id: 2, name: '5-B', code: 'XYZ567', studentCount: 0}],
    studentsByClass: {1: [{id: 10, username: 'Pamuk', realName: 'Ali Veli'}, {id: 11, username: 'Tekir', realName: 'Ayşe Can'}]},
    expandedId: null,
    busy: false,
    error: null,
    message: null,
    onClose: jest.fn(),
    onCreateClass: jest.fn(),
    onToggleClass: jest.fn(),
    onResetPassword: jest.fn(),
    onRemoveStudent: jest.fn(),
    reports: [],
    onRestoreComment: jest.fn(),
    onDeleteReportedComment: jest.fn(),
    onUnshareProject: jest.fn()
}, overrides);

const texts = wrapper => wrapper.text();

describe('TeacherPanel', () => {
    test('sınıflar adı, kodu ve öğrenci sayısıyla listelenir', () => {
        const wrapper = mount(<TeacherPanel {...baseProps()} />);
        const all = texts(wrapper);
        expect(all).toContain('5-A');
        expect(all).toContain('ABC234');
        expect(all).toContain('XYZ567');
        expect(all).toContain('2 öğrenci');
    });

    test('sınıf yoksa açıklama gösterilir', () => {
        const wrapper = mount(<TeacherPanel {...baseProps({classes: []})} />);
        expect(texts(wrapper)).toContain('Henüz sınıfın yok');
    });

    test('yeni sınıf: ad girilip gönderilir ve alan temizlenir', () => {
        const props = baseProps();
        const wrapper = mount(<TeacherPanel {...props} />);
        wrapper.find('[data-field="className"]').simulate('change', {target: {value: '6-C'}});
        wrapper.find('form').simulate('submit', {preventDefault: () => {}});
        expect(props.onCreateClass).toHaveBeenCalledWith('6-C');
        expect(wrapper.find('[data-field="className"]').prop('value')).toBe('');
    });

    test('sınıfa tıklayınca öğrenciler açılır/kapanır istenir', () => {
        const props = baseProps();
        const wrapper = mount(<TeacherPanel {...props} />);
            wrapper.find('button[data-action="toggle-class"]').first()
            .simulate('click');
        expect(props.onToggleClass).toHaveBeenCalledWith(1);
    });

    test('açık sınıfta öğrenciler takma ad ve gerçek isimle görünür', () => {
        const wrapper = mount(<TeacherPanel {...baseProps({expandedId: 1})} />);
        const all = texts(wrapper);
        expect(all).toContain('Pamuk');
        expect(all).toContain('Ali Veli');
        expect(all).toContain('Tekir');
    });

    test('şifre sıfırlama: yeni şifre girilip gönderilir', () => {
        const props = baseProps({expandedId: 1});
        const wrapper = mount(<TeacherPanel {...props} />);
        wrapper.find('button[data-action="reset-start"]').first()
            .simulate('click');
        wrapper.find('[data-field="newPassword"]').simulate('change', {target: {value: 'yeni-sifre'}});
        wrapper.find('button[data-action="reset-save"]').simulate('click');
        expect(props.onResetPassword).toHaveBeenCalledWith(10, 'yeni-sifre');
    });

    test('öğrenci çıkarma onay ister', () => {
        const props = baseProps({expandedId: 1});
        const wrapper = mount(<TeacherPanel {...props} />);
        window.confirm = jest.fn(() => false);
        wrapper.find('button[data-action="remove-student"]').first()
            .simulate('click');
        expect(props.onRemoveStudent).not.toHaveBeenCalled();
        window.confirm = jest.fn(() => true);
        wrapper.find('button[data-action="remove-student"]').first()
            .simulate('click');
        expect(props.onRemoveStudent).toHaveBeenCalledWith(10);
    });

    test('hata ve bilgi mesajı gösterilir', () => {
        const wrapper = mount(<TeacherPanel {...baseProps({error: 'Sınıf açılamadı', message: 'Şifre değişti'})} />);
        const all = texts(wrapper);
        expect(all).toContain('Sınıf açılamadı');
        expect(all).toContain('Şifre değişti');
    });

    describe('bildirimler', () => {
        const reports = () => [
            {kind: 'comment', commentId: 9, projectId: 4, body: 'tartışmalı yorum', author: 'Tekir', hidden: true, reports: 2, projectTitle: 'Yıldız oyunu'},
            {kind: 'project', projectId: 6, reports: 1, projectTitle: 'Şüpheli proje'}
        ];

        test('bildirim yoksa bölüm gösterilmez; varsa yorum ve proje bildirimleri listelenir', () => {
            expect(mount(<TeacherPanel {...baseProps()} />).text()).not.toContain('Bildirimler');
            const text = mount(<TeacherPanel {...baseProps({reports: reports()})} />).text();
            expect(text).toContain('Bildirimler');
            expect(text).toContain('tartışmalı yorum');
            expect(text).toContain('Tekir');
            expect(text).toContain('2 bildirim');
            expect(text).toContain('Şüpheli proje');
        });

        test('yorumu geri getir / sil, projeyi paylaşımdan kaldır', () => {
            const props = baseProps({reports: reports()});
            const wrapper = mount(<TeacherPanel {...props} />);
            wrapper.find('button[data-action="restore-comment"]').simulate('click');
            expect(props.onRestoreComment).toHaveBeenCalledWith(9);
            window.confirm = jest.fn(() => true);
            wrapper.find('button[data-action="delete-reported"]').simulate('click');
            expect(props.onDeleteReportedComment).toHaveBeenCalledWith(4, 9);
            wrapper.find('button[data-action="unshare-reported"]').simulate('click');
            expect(props.onUnshareProject).toHaveBeenCalledWith(6);
        });
    });
});
