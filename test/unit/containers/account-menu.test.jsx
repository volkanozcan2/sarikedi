import React from 'react';
import {mount} from 'enzyme';
import {AccountMenuComponent} from '../../../src/containers/account-menu';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('AccountMenu', () => {
    const props = overrides => Object.assign({
        api: {logout: jest.fn(() => Promise.resolve({user: null}))},
        user: {role: 'student', username: 'Pamuk'},
        onLoggedOut: jest.fn(), onLogin: jest.fn(), onRegister: jest.fn(), onTeacherPanel: jest.fn()
    }, overrides);

    test('Çıkış sunucuyu çağırır ve oturumu kapatır', () => {
        const p = props();
        const wrapper = mount(<AccountMenuComponent {...p} />);
        wrapper.find('button[data-action="logout"]').simulate('click');
        return flush().then(() => {
            expect(p.api.logout).toHaveBeenCalled();
            expect(p.onLoggedOut).toHaveBeenCalled();
        });
    });

    test('sunucu hata verse de ekranda çıkış yapılır', () => {
        const p = props({api: {logout: jest.fn(() => Promise.reject(new Error('x')))}});
        const wrapper = mount(<AccountMenuComponent {...p} />);
        wrapper.find('button[data-action="logout"]').simulate('click');
        return flush().then(() => expect(p.onLoggedOut).toHaveBeenCalled());
    });

    test('girişsizken Giriş ve Kaydol işleyicileri çağrılır', () => {
        const p = props({user: null});
        const wrapper = mount(<AccountMenuComponent {...p} />);
        wrapper.find('button[data-action="login"]').simulate('click');
        wrapper.find('button[data-action="register"]').simulate('click');
        expect(p.onLogin).toHaveBeenCalled();
        expect(p.onRegister).toHaveBeenCalled();
    });
});
