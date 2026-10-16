import React from 'react';
import {mount} from 'enzyme';
import AuthorAccounts from '../../../src/components/author/author-accounts.jsx';

const teachers = () => [
    {
        id: 1, username: 'ayse', realName: 'Ayşe Yılmaz', school: 'Atatürk İlkokulu', approved: true,
        classes: [{id: 1, name: '5-A', code: 'ABC234', students: [{id: 10, username: 'Pamuk', realName: 'Ali Veli'}]}]
    },
    {id: 2, username: 'bekleyen', realName: 'Mehmet Kaya', school: 'Cumhuriyet Ortaokulu', approved: false, classes: []}
];

const props = overrides => Object.assign({
    teachers: teachers(), busy: false, onBack: jest.fn(), onApprove: jest.fn(), onRemove: jest.fn(),
    onResetPassword: jest.fn()
}, overrides);

describe('AuthorAccounts', () => {
    test('öğretmenler isim, okul, kullanıcı adı ve durumla; sınıf ve öğrenciler (gerçek isimleriyle) görünür', () => {
        const text = mount(<AuthorAccounts {...props()} />).text();
        expect(text).toContain('Ayşe Yılmaz');
        expect(text).toContain('Atatürk İlkokulu');
        expect(text).toContain('ayse');
        expect(text).toContain('ABC234');
        expect(text).toContain('Pamuk');
        expect(text).toContain('Ali Veli');
        expect(text).toContain('Onay bekliyor');
    });

    test('bekleyen öğretmen onaylanır; onaylı öğretmen için onay kaldırılır', () => {
        const p = props();
        const wrapper = mount(<AuthorAccounts {...p} />);
        wrapper.find('button[data-action="approve"][data-id=2]').simulate('click');
        expect(p.onApprove).toHaveBeenCalledWith(2, true);
        wrapper.find('button[data-action="unapprove"][data-id=1]').simulate('click');
        expect(p.onApprove).toHaveBeenCalledWith(1, false);
    });

    test('öğretmen silme onay ister', () => {
        const p = props();
        const wrapper = mount(<AuthorAccounts {...p} />);
        window.confirm = jest.fn(() => false);
        wrapper.find('button[data-action="remove"][data-id=1]').simulate('click');
        expect(p.onRemove).not.toHaveBeenCalled();
        window.confirm = jest.fn(() => true);
        wrapper.find('button[data-action="remove"][data-id=1]').simulate('click');
        expect(p.onRemove).toHaveBeenCalledWith(1);
    });

    test('şifre sıfırlama: yeni şifre girilip gönderilir', () => {
        const p = props();
        const wrapper = mount(<AuthorAccounts {...p} />);
        wrapper.find('button[data-action="reset-start"][data-id=1]').simulate('click');
        wrapper.find('input[data-field="newPassword"]').simulate('change', {target: {value: 'yeni-sifre'}});
        wrapper.find('button[data-action="reset-save"]').simulate('click');
        expect(p.onResetPassword).toHaveBeenCalledWith(1, 'yeni-sifre');
    });

    test('hiç öğretmen yoksa açıklama; geri düğmesi çağrılır', () => {
        const p = props({teachers: []});
        const wrapper = mount(<AuthorAccounts {...p} />);
        expect(wrapper.text()).toContain('Henüz kayıtlı öğretmen yok');
        wrapper.find('button[data-action="back"]').simulate('click');
        expect(p.onBack).toHaveBeenCalled();
    });
});
