import React from 'react';
import {mount} from 'enzyme';
import {SharedGalleryComponent} from '../../../src/containers/shared-gallery';
import {AccountApiError} from '../../../src/lib/accounts/account-api';

jest.mock('../../../src/containers/modal.jsx', () => {
    const React = require('react');
    const ModalStub = props => React.createElement('div', null, props.children);
    return {__esModule: true, default: ModalStub};
});

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const card = () => ({
    id: 5, title: 'Yıldız oyunu', owner: {username: 'Pamuk', role: 'student'}, scope: 'class', hasThumbnail: false,
    likes: 1, liked: false, comments: 0, updatedAt: ''
});
const detail = overrides => Object.assign(card(), {comments: [], commentCount: 0, mine: false, canModerate: false}, overrides);

const makeApi = overrides => Object.assign({
    shared: jest.fn(() => Promise.resolve([card()])),
    sharedProject: jest.fn(() => Promise.resolve(detail())),
    like: jest.fn(() => Promise.resolve({liked: true, likes: 2})),
    addComment: jest.fn(() => Promise.resolve({id: 1})),
    deleteComment: jest.fn(() => Promise.resolve(null)),
    report: jest.fn(() => Promise.resolve(null)),
    setProjectScope: jest.fn(() => Promise.resolve({})),
    unshareProject: jest.fn(() => Promise.resolve({})),
    removeProject: jest.fn(() => Promise.resolve(null)),
    removeStudentProject: jest.fn(() => Promise.resolve(null)),
    downloadShared: jest.fn(() => Promise.resolve(new ArrayBuffer(8)))
}, overrides);

const makeProps = overrides => Object.assign({
    api: makeApi(),
    user: {id: 1, role: 'student', username: 'Tekir'},
    open: true,
    vm: {loadProject: jest.fn(() => Promise.resolve())},
    onClose: jest.fn(),
    onLogin: jest.fn(),
    onRegister: jest.fn(),
    onCloudProject: jest.fn(),
    onSetTitle: jest.fn(),
    onLoadingStarted: jest.fn(),
    onLoadingFinished: jest.fn()
}, overrides);

const openCard = wrapper => {
    wrapper.update();
    wrapper.find('button[data-id=5]').simulate('click');
    return flush().then(() => wrapper.update());
};

describe('SharedGallery', () => {
    beforeEach(() => {
        window.confirm = jest.fn(() => true);
    });

    test('açılınca paylaşılanlar yüklenir ve listelenir', () => {
        const props = makeProps();
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            expect(props.api.shared).toHaveBeenCalled();
            expect(wrapper.text()).toContain('Yıldız oyunu');
        });
    });

    test('girişsizken liste istenmez', () => {
        const props = makeProps({user: null});
        mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => expect(props.api.shared).not.toHaveBeenCalled());
    });

    test('liste hatası gösterilir', () => {
        const props = makeProps({api: makeApi({shared: jest.fn(() => Promise.reject(new AccountApiError('Sunucuya ulaşılamadı', 0)))})});
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => {
            wrapper.update();
            expect(wrapper.text()).toContain('Sunucuya ulaşılamadı');
        });
    });

    test('karta tıklayınca detay açılır; beğenme sayaçı günceller', () => {
        const props = makeProps();
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            expect(props.api.sharedProject).toHaveBeenCalledWith(5);
            expect(wrapper.text()).toContain('Yorumlar');
            wrapper.find('button[data-action="like"]').simulate('click');
            return flush();
        }).then(() => {
            wrapper.update();
            expect(props.api.like).toHaveBeenCalledWith(5);
            expect(wrapper.find('button[data-action="like"]').text()).toContain('2');
        });
    });

    test('yorum gönderilir ve detay yenilenir; yorum hatası gösterilir', () => {
        const props = makeProps();
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('input[data-field="comment"]').simulate('change', {target: {value: 'Bravo!'}});
            wrapper.find('form').simulate('submit');
            return flush();
        }).then(() => {
            expect(props.api.addComment).toHaveBeenCalledWith(5, 'Bravo!');
            expect(props.api.sharedProject).toHaveBeenCalledTimes(2);
        });
    });

    test('yorum reddedilirse sunucu mesajı gösterilir', () => {
        const props = makeProps({api: makeApi({addComment: jest.fn(() => Promise.reject(new AccountApiError('Yorumun uygunsuz sözcükler içeriyor', 400)))})});
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('input[data-field="comment"]').simulate('change', {target: {value: 'x'}});
            wrapper.find('form').simulate('submit');
            return flush();
        }).then(() => {
            wrapper.update();
            expect(wrapper.text()).toContain('uygunsuz');
        });
    });

    test('bildirme sunucuya gider ve teşekkür mesajı gösterilir', () => {
        const props = makeProps();
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('button[data-action="report-project"]').simulate('click');
            return flush();
        }).then(() => {
            wrapper.update();
            expect(props.api.report).toHaveBeenCalledWith(5, null);
            expect(wrapper.text()).toContain('Bildirildi');
        });
    });

    test('kopyasını aç: onaydan sonra VM\'e yüklenir, bağlantı kopar, pencere kapanır', () => {
        const props = makeProps();
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('button[data-action="open-copy"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.onLoadingStarted).toHaveBeenCalled();
            expect(props.api.downloadShared).toHaveBeenCalledWith(5);
            expect(props.vm.loadProject).toHaveBeenCalled();
            expect(props.onCloudProject).toHaveBeenCalledWith(null);
            expect(props.onSetTitle).toHaveBeenCalledWith('Yıldız oyunu');
            expect(props.onLoadingFinished).toHaveBeenCalled();
            expect(props.onClose).toHaveBeenCalled();
        });
    });

    test('moderatör paylaşımı kaldırınca listeye döner', () => {
        const props = makeProps({api: makeApi({sharedProject: jest.fn(() => Promise.resolve(detail({canModerate: true})))})});
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('button[data-action="unshare"]').simulate('click');
            return flush();
        }).then(() => {
            wrapper.update();
            expect(props.api.unshareProject).toHaveBeenCalledWith(5);
            expect(props.api.shared).toHaveBeenCalledTimes(2);
            expect(wrapper.find('button[data-action="back"]')).toHaveLength(0);
        });
    });

    test('öğretmen öğrencisinin projesini siler (onaydan sonra), listeye döner', () => {
        const props = makeProps({api: makeApi({sharedProject: jest.fn(() => Promise.resolve(detail({canModerate: true})))})});
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('button[data-action="remove-project"]').simulate('click');
            return flush();
        }).then(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(props.api.removeStudentProject).toHaveBeenCalledWith(5);
            expect(props.api.removeProject).not.toHaveBeenCalled();
        });
    });

    test('sahibi kendi paylaşılan projesini siler', () => {
        const props = makeProps({api: makeApi({sharedProject: jest.fn(() => Promise.resolve(detail({mine: true})))})});
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('button[data-action="remove-project"]').simulate('click');
            return flush();
        }).then(() => {
            expect(props.api.removeProject).toHaveBeenCalledWith(5);
            expect(props.api.removeStudentProject).not.toHaveBeenCalled();
        });
    });

    test('onaylanmazsa silinmez', () => {
        window.confirm = jest.fn(() => false);
        const props = makeProps({api: makeApi({sharedProject: jest.fn(() => Promise.resolve(detail({mine: true})))})});
        const wrapper = mount(<SharedGalleryComponent {...props} />);
        return flush().then(() => openCard(wrapper)).then(() => {
            wrapper.find('button[data-action="remove-project"]').simulate('click');
            expect(props.api.removeProject).not.toHaveBeenCalled();
        });
    });
});
