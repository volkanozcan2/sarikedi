import React from 'react';
import {shallow} from 'enzyme';
import AboutModalComponent from '../../../src/components/about-modal/about-modal.jsx';

describe('AboutModalComponent', () => {
    const paragraphs = () => shallow(<AboutModalComponent onRequestClose={jest.fn()} />)
        .find('p')
        .map(p => p.text());

    test('selamlama metni, güneş gözlüklü emoji ve token bilgisi', () => {
        const text = paragraphs().join(' ');
        expect(text).toContain('Merhaba. Scratch bildiğin gibi açık kaynaklı bir proje.');
        expect(text).toContain('Umarım senin de işine yarar 😎');
        expect(text).toContain('2 günde yaklaşık');
        expect(text).toContain('256 milyon token');
    });

    test('token sayısı bağlantısı kullanım görselini açar, tekrar tıklayınca kapatır', () => {
        const wrapper = shallow(<AboutModalComponent onRequestClose={jest.fn()} />);
        expect(wrapper.find('img[data-usage]')).toHaveLength(0);
        wrapper.find('button[data-action="show-usage"]').simulate('click');
        expect(wrapper.find('img[data-usage]')).toHaveLength(1);
        wrapper.find('[data-action="close-usage"]').simulate('click');
        expect(wrapper.find('img[data-usage]')).toHaveLength(0);
    });

    test('GitHub bağlantısı yeni sekmede güvenli açılır', () => {
        const link = shallow(<AboutModalComponent onRequestClose={jest.fn()} />).find('a');
        expect(link.prop('href')).toBe('https://github.com/volkanozcan2/sarikedi');
        expect(link.prop('target')).toBe('_blank');
        expect(link.prop('rel')).toBe('noopener noreferrer');
    });
});
