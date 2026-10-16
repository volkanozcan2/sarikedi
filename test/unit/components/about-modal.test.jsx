import React from 'react';
import {shallow} from 'enzyme';
import AboutModalComponent from '../../../src/components/about-modal/about-modal.jsx';

describe('AboutModalComponent', () => {
    const wrapper = () => shallow(<AboutModalComponent onRequestClose={jest.fn()} />);

    test('logo ve altında "Kodlar burada" yazısı gösterilir', () => {
        const w = wrapper();
        expect(w.find('p')).toHaveLength(1);
        expect(w.find('p').text()).toBe('Kodlar burada: github.com/volkanozcan2/sarikedi');
        expect(w.find('img')).toHaveLength(1);
        expect(w.find('button')).toHaveLength(0);
    });

    test('GitHub bağlantısı yeni sekmede güvenli açılır', () => {
        const link = wrapper().find('a');
        expect(link.prop('href')).toBe('https://github.com/volkanozcan2/sarikedi');
        expect(link.prop('target')).toBe('_blank');
        expect(link.prop('rel')).toBe('noopener noreferrer');
    });
});
