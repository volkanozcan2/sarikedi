import React from 'react';
import {mount} from 'enzyme';
import {AccountModalsComponent} from '../../../src/containers/account-modals';
import {AccountApiError} from '../../../src/lib/accounts/account-api';

jest.mock('../../../src/containers/modal.jsx', () => {
    const React = require('react');
    const ModalStub = props => React.createElement('div', {className: 'modal-stub'}, props.children);
    return {__esModule: true, default: ModalStub};
});

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const change = (wrapper, field, value) => wrapper.find(`input[data-field="${field}"]`).simulate('change', {target: {value: value}});

const makeApi = overrides => Object.assign({
    me: jest.fn(() => Promise.resolve(null)),
    login: jest.fn(() => Promise.resolve({id: 1, role: 'student', username: 'Pamuk'})),
    logout: jest.fn(() => Promise.resolve({user: null})),
    registerTeacher: jest.fn(() => Promise.resolve({user: {id: 2}, pending: true})),
    registerStudent: jest.fn(() => Promise.resolve({id: 3, role: 'student', username: 'Pamuk'})),
    classes: jest.fn(() => Promise.resolve([{id: 1, name: '5-A', code: 'ABC234', studentCount: 1}])),
    createClass: jest.fn(() => Promise.resolve({id: 2, name: '5-B', code: 'XYZ567', studentCount: 0})),
    students: jest.fn(() => Promise.resolve([{id: 10, username: 'Pamuk', realName: 'Ali Veli'}])),
    resetStudentPassword: jest.fn(() => Promise.resolve({ok: true})),
    removeStudent: jest.fn(() => Promise.resolve(null)),
    reports: jest.fn(() => Promise.resolve([
        {kind: 'comment', commentId: 9, projectId: 4, body: 'tartışmalı', author: 'Tekir', hidden: true, reports: 2, projectTitle: 'Oyun'}
    ])),
    restoreComment: jest.fn(() => Promise.resolve({ok: true})),
    deleteComment: jest.fn(() => Promise.resolve(null)),
    unshareProject: jest.fn(() => Promise.resolve({}))
}, overrides);

const makeProps = overrides => Object.assign({
    api: makeApi(),
    user: null,
    loginOpen: false,
    registerOpen: false,
    teacherOpen: false,
    onSetUser: jest.fn(),
    onCloseLogin: jest.fn(),
    onCloseRegister: jest.fn(),
    onCloseTeacher: jest.fn(),
    onOpenLogin: jest.fn(),
    onOpenRegister: jest.fn()
}, overrides);

describe('AccountModals', () => {
    test('açılışta oturum sorgulanır ve kullanıcı store\'a yazılır', () => {
        const props = makeProps({api: makeApi({me: jest.fn(() => Promise.resolve({id: 5, username: 'ayse'}))})});
        mount(<AccountModalsComponent {...props} />);
        return flush().then(() => expect(props.onSetUser).toHaveBeenCalledWith({id: 5, username: 'ayse'}));
    });

    test('sunucuya ulaşılamazsa kullanıcı null ve yüklendi sayılır', () => {
        const props = makeProps({api: makeApi({me: jest.fn(() => Promise.reject(new AccountApiError('x', 0)))})});
        mount(<AccountModalsComponent {...props} />);
        return flush().then(() => expect(props.onSetUser).toHaveBeenCalledWith(null));
    });

    test('giriş başarılı: kullanıcı yazılır, pencere kapanır', () => {
        const props = makeProps({loginOpen: true});
        const wrapper = mount(<AccountModalsComponent {...props} />);
        change(wrapper, 'username', 'Pamuk');
        change(wrapper, 'password', 'gizli12');
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            expect(props.api.login).toHaveBeenCalledWith('Pamuk', 'gizli12');
            expect(props.onSetUser).toHaveBeenCalledWith(expect.objectContaining({username: 'Pamuk'}));
            expect(props.onCloseLogin).toHaveBeenCalled();
        });
    });

    test('giriş hatası mesajı gösterilir, pencere açık kalır', () => {
        const props = makeProps({
            loginOpen: true,
            api: makeApi({login: jest.fn(() => Promise.reject(new AccountApiError('Kullanıcı adı ya da şifre yanlış', 401)))})
        });
        const wrapper = mount(<AccountModalsComponent {...props} />);
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            wrapper.update();
            expect(wrapper.text()).toContain('şifre yanlış');
            expect(props.onCloseLogin).not.toHaveBeenCalled();
        });
    });

    test('öğrenci kaydı: oturum açılır ve pencere kapanır', () => {
        const props = makeProps({registerOpen: true});
        const wrapper = mount(<AccountModalsComponent {...props} />);
        wrapper.find('button[data-role="student"]').simulate('click');
        change(wrapper, 'classCode', 'ABC234');
        change(wrapper, 'realName', 'Ali Veli');
        change(wrapper, 'username', 'Pamuk');
        change(wrapper, 'password', 'gizli12');
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            expect(props.api.registerStudent).toHaveBeenCalledWith({
                classCode: 'ABC234', realName: 'Ali Veli', username: 'Pamuk', password: 'gizli12'
            });
            expect(props.onSetUser).toHaveBeenCalledWith(expect.objectContaining({role: 'student'}));
            expect(props.onCloseRegister).toHaveBeenCalled();
        });
    });

    test('öğretmen kaydı: oturum açılmaz, onay bekleme mesajı çıkar', () => {
        const props = makeProps({registerOpen: true});
        const wrapper = mount(<AccountModalsComponent {...props} />);
        wrapper.find('button[data-role="teacher"]').simulate('click');
        change(wrapper, 'realName', 'Ayşe Yılmaz');
        change(wrapper, 'school', 'Atatürk İlkokulu');
        change(wrapper, 'username', 'ayse');
        change(wrapper, 'password', 'sifre123');
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            wrapper.update();
            expect(props.api.registerTeacher).toHaveBeenCalled();
            expect(props.onSetUser).not.toHaveBeenCalledWith(expect.objectContaining({id: 2}));
            expect(wrapper.text()).toContain('onayladığında');
        });
    });

    test('kayıt hatasında alan hataları gösterilir', () => {
        const props = makeProps({
            registerOpen: true,
            api: makeApi({registerStudent: jest.fn(() => Promise.reject(
                Object.assign(new AccountApiError('Kayıt bilgileri geçersiz', 400), {errors: ['Şifre 6-100 karakter olmalı']})
            ))})
        });
        const wrapper = mount(<AccountModalsComponent {...props} />);
        wrapper.find('button[data-role="student"]').simulate('click');
        wrapper.find('form').simulate('submit');
        return flush().then(() => {
            wrapper.update();
            expect(wrapper.text()).toContain('Şifre 6-100');
        });
    });

    test('öğretmen paneli açılınca sınıflar yüklenir; sınıf açma, öğrenci listesi ve şifre sıfırlama', () => {
        const props = makeProps({teacherOpen: true, user: {id: 1, role: 'teacher', username: 'ayse'}});
        const wrapper = mount(<AccountModalsComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            expect(props.api.classes).toHaveBeenCalled();
            expect(wrapper.text()).toContain('ABC234');
            change(wrapper, 'className', '5-B');
            wrapper.find('form').simulate('submit');
            return flush();
        }).then(() => {
            expect(props.api.createClass).toHaveBeenCalledWith('5-B');
            wrapper.update();
            wrapper.find('button[data-action="toggle-class"]').first()
                .simulate('click');
            return flush();
        }).then(() => {
            wrapper.update();
            expect(props.api.students).toHaveBeenCalledWith(1);
            expect(wrapper.text()).toContain('Ali Veli');
            wrapper.find('button[data-action="reset-start"]').simulate('click');
            change(wrapper, 'newPassword', 'yeni-sifre');
            wrapper.find('button[data-action="reset-save"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.api.resetStudentPassword).toHaveBeenCalledWith(10, 'yeni-sifre');
        });
    });

    test('öğretmen paneli bildirimleri getirir; geri getirme ve silme sunucuya gider', () => {
        window.confirm = jest.fn(() => true);
        const props = makeProps({teacherOpen: true, user: {id: 1, role: 'teacher', username: 'ayse'}});
        const wrapper = mount(<AccountModalsComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            expect(props.api.reports).toHaveBeenCalled();
            expect(wrapper.text()).toContain('tartışmalı');
            wrapper.find('button[data-action="restore-comment"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.api.restoreComment).toHaveBeenCalledWith(9);
            wrapper.update();
            wrapper.find('button[data-action="delete-reported"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.api.deleteComment).toHaveBeenCalledWith(4, 9);
            expect(props.api.reports.mock.calls.length).toBeGreaterThanOrEqual(3);
        });
    });
});
