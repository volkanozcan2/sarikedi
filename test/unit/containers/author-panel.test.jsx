import React from 'react';
import {mount} from 'enzyme';
import {AuthorPanelComponent} from '../../../src/containers/author-panel';
import {AdminApiError} from '../../../src/lib/admin/admin-api';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const button = (wrapper, label) => wrapper.find('button').filterWhere(b => b.text().indexOf(label) !== -1);

const teachers = () => [
    {id: 1, username: 'ayse', realName: 'Ayşe Yılmaz', school: 'Atatürk İlkokulu', approved: false, classes: []}
];

const makeApi = overrides => Object.assign({
    me: jest.fn(() => Promise.resolve(true)),
    login: jest.fn(() => Promise.resolve({admin: true})),
    logout: jest.fn(() => Promise.resolve({admin: false})),
    accounts: jest.fn(() => Promise.resolve({teachers: teachers()})),
    approveTeacher: jest.fn(() => Promise.resolve({})),
    removeTeacher: jest.fn(() => Promise.resolve(null)),
    resetTeacherPassword: jest.fn(() => Promise.resolve(null))
}, overrides);

const open = props => {
    const wrapper = mount(<AuthorPanelComponent isAuthorMode {...props} />);
    button(wrapper, 'Yönetici').simulate('click');
    return flush().then(() => {
        wrapper.update();
        return wrapper;
    });
};

describe('AuthorPanel (yalnızca hesap yönetimi)', () => {
    test('?author yoksa hiçbir şey çizilmez', () => {
        const wrapper = mount(<AuthorPanelComponent isAuthorMode={false} api={makeApi()} />);
        expect(wrapper.html()).toBe(null);
    });

    test('açılınca oturum denetlenir; giriş yapılmışsa hesaplar görünür, ders ya da kayıt yoktur', () => {
        const api = makeApi();
        return open({api}).then(wrapper => {
            expect(api.me).toHaveBeenCalled();
            expect(api.accounts).toHaveBeenCalled();
            expect(wrapper.text()).toContain('Ayşe Yılmaz');
            expect(wrapper.text()).toContain('Onay bekliyor');
            expect(wrapper.text()).not.toContain('Yeni ders');
            expect(wrapper.text()).not.toContain('Ders');
        });
    });

    test('giriş yapılmamışsa giriş formu çıkar; doğru şifreyle hesaplar yüklenir', () => {
        const api = makeApi({me: jest.fn(() => Promise.resolve(false))});
        return open({api}).then(wrapper => {
            expect(wrapper.find('input[type="password"]')).toHaveLength(1);
            wrapper.find('input[type="password"]').simulate('change', {target: {value: 'gizli'}});
            button(wrapper, 'Giriş').simulate('click');
            return flush().then(() => {
                wrapper.update();
                expect(api.login).toHaveBeenCalledWith('gizli');
                expect(wrapper.text()).toContain('Ayşe Yılmaz');
            });
        });
    });

    test('öğretmen onaylanınca liste yenilenir', () => {
        const api = makeApi();
        return open({api}).then(wrapper => {
            wrapper.find('button[data-action="approve"][data-id=1]').simulate('click');
            return flush().then(() => {
                expect(api.approveTeacher).toHaveBeenCalledWith(1, true);
                expect(api.accounts).toHaveBeenCalledTimes(2);
            });
        });
    });

    test('çıkış giriş ekranına döner', () => {
        const api = makeApi();
        return open({api}).then(wrapper => {
            wrapper.find('button[data-action="logout"]').simulate('click');
            return flush().then(() => {
                wrapper.update();
                expect(api.logout).toHaveBeenCalled();
                expect(wrapper.find('input[type="password"]')).toHaveLength(1);
            });
        });
    });

    test('oturum düşerse (401) giriş ekranı ve uyarı gelir', () => {
        const api = makeApi({approveTeacher: jest.fn(() => Promise.reject(new AdminApiError('Giriş gerekli', 401)))});
        return open({api}).then(wrapper => {
            wrapper.find('button[data-action="approve"][data-id=1]').simulate('click');
            return flush().then(() => {
                wrapper.update();
                expect(wrapper.find('input[type="password"]')).toHaveLength(1);
                expect(wrapper.text()).toContain('Oturum bitti');
            });
        });
    });
});
