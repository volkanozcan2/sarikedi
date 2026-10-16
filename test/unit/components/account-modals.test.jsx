import React from 'react';
import {shallow} from 'enzyme';
import AccountButtons from '../../../src/components/account/account-buttons.jsx';
import LoginModal from '../../../src/components/account/login-modal.jsx';
import RegisterModal from '../../../src/components/account/register-modal.jsx';

const change = (wrapper, field, value) => wrapper.find(`[data-field="${field}"]`).simulate('change', {target: {value: value}});
const submit = wrapper => wrapper.find('form').simulate('submit', {preventDefault: () => {}});

describe('AccountButtons', () => {
    const handlers = () => ({onLogin: jest.fn(), onRegister: jest.fn(), onLogout: jest.fn(), onTeacherPanel: jest.fn()});

    test('girişsizken Giriş ve Kaydol düğmeleri', () => {
        const h = handlers();
        const wrapper = shallow(<AccountButtons user={null} {...h} />);
        wrapper.find('[data-action="login"]').simulate('click');
        wrapper.find('[data-action="register"]').simulate('click');
        expect(h.onLogin).toHaveBeenCalledTimes(1);
        expect(h.onRegister).toHaveBeenCalledTimes(1);
        expect(wrapper.find('[data-action="logout"]')).toHaveLength(0);
    });

    test('öğrenci: takma ad ve Çıkış; Sınıflarım yok', () => {
        const h = handlers();
        const wrapper = shallow(<AccountButtons user={{role: 'student', username: 'Pamuk'}} {...h} />);
        expect(wrapper.text()).toContain('Pamuk');
        expect(wrapper.find('[data-action="teacher-panel"]')).toHaveLength(0);
        wrapper.find('[data-action="logout"]').simulate('click');
        expect(h.onLogout).toHaveBeenCalledTimes(1);
    });

    test('öğretmen: Sınıflarım düğmesi paneli açar', () => {
        const h = handlers();
        const wrapper = shallow(<AccountButtons user={{role: 'teacher', username: 'ayse'}} {...h} />);
        wrapper.find('[data-action="teacher-panel"]').simulate('click');
        expect(h.onTeacherPanel).toHaveBeenCalledTimes(1);
    });
});

describe('LoginModal', () => {
    test('formu gönderince kullanıcı adı ve şifre iletilir', () => {
        const onSubmit = jest.fn();
        const wrapper = shallow(<LoginModal onClose={jest.fn()} onSubmit={onSubmit} onSwitch={jest.fn()} />);
        change(wrapper, 'username', 'Pamuk');
        change(wrapper, 'password', 'gizli12');
        submit(wrapper);
        expect(onSubmit).toHaveBeenCalledWith('Pamuk', 'gizli12');
    });

    test('hata mesajı gösterilir; meşgulken gönderme düğmesi kapalı', () => {
        const wrapper = shallow(
            <LoginModal busy error="Kullanıcı adı ya da şifre yanlış" onClose={jest.fn()} onSubmit={jest.fn()} onSwitch={jest.fn()} />
        );
        expect(wrapper.find('[data-role="error"]').text()).toContain('şifre yanlış');
        expect(wrapper.find('button[type="submit"]').prop('disabled')).toBe(true);
    });

    test('"Kaydol" bağlantısı kayıt penceresine geçirir', () => {
        const onSwitch = jest.fn();
        const wrapper = shallow(<LoginModal onClose={jest.fn()} onSubmit={jest.fn()} onSwitch={onSwitch} />);
        wrapper.find('[data-action="switch"]').simulate('click');
        expect(onSwitch).toHaveBeenCalledTimes(1);
    });
});

describe('RegisterModal', () => {
    const mountIt = overrides => shallow(
        <RegisterModal onClose={jest.fn()} onSubmit={jest.fn()} onSwitch={jest.fn()} {...overrides} />
    );

    test('önce rol seçilir; öğrenci alanları: sınıf kodu, gerçek isim, takma ad, şifre', () => {
        const wrapper = mountIt();
        expect(wrapper.find('[data-field="username"]')).toHaveLength(0);
        wrapper.find('[data-role="student"]').simulate('click');
        ['classCode', 'realName', 'username', 'password'].forEach(field => {
            expect(wrapper.find(`[data-field="${field}"]`)).toHaveLength(1);
        });
        expect(wrapper.find('[data-field="school"]')).toHaveLength(0);
        expect(wrapper.find('p').map(p => p.text())
            .join(' ')).toContain('Takma adın herkese görünür');
    });

    test('öğretmen alanları: isim, okul, kullanıcı adı, şifre', () => {
        const wrapper = mountIt();
        wrapper.find('[data-role="teacher"]').simulate('click');
        ['realName', 'school', 'username', 'password'].forEach(field => {
            expect(wrapper.find(`[data-field="${field}"]`)).toHaveLength(1);
        });
        expect(wrapper.find('[data-field="classCode"]')).toHaveLength(0);
    });

    test('gönderince rol ve alanlar iletilir', () => {
        const onSubmit = jest.fn();
        const wrapper = mountIt({onSubmit: onSubmit});
        wrapper.find('[data-role="student"]').simulate('click');
        change(wrapper, 'classCode', 'abcdef');
        change(wrapper, 'realName', 'Ali Veli');
        change(wrapper, 'username', 'Pamuk');
        change(wrapper, 'password', 'gizli12');
        submit(wrapper);
        expect(onSubmit).toHaveBeenCalledWith('student', {
            classCode: 'abcdef', realName: 'Ali Veli', username: 'Pamuk', password: 'gizli12'
        });
    });

    test('öğretmen kaydı bitince onay bekleme mesajı gösterilir', () => {
        const wrapper = mountIt({pendingNotice: true});
        expect(wrapper.find('div').map(d => d.text())
            .join(' ')).toContain('onayladığında');
        expect(wrapper.find('form')).toHaveLength(0);
    });

    test('hata listesi gösterilir', () => {
        const wrapper = mountIt({error: 'Kayıt bilgileri geçersiz', errors: ['Şifre 6-100 karakter olmalı']});
        wrapper.find('[data-role="student"]').simulate('click');
        expect(wrapper.find('[data-role="error"]').text()).toContain('Şifre 6-100');
    });
});
