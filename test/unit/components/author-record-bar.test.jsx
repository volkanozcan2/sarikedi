import React from 'react';
import {mount} from 'enzyme';
import AuthorRecordBar from '../../../src/components/author/author-record-bar.jsx';

const props = overrides => Object.assign({
    stepCount: 2,
    status: null,
    busy: false,
    onSaveStep: jest.fn(),
    onStop: jest.fn(),
    onOpenPanel: jest.fn()
}, overrides);

const button = (wrapper, label) => wrapper.find('button').filterWhere(b => b.text().indexOf(label) !== -1);

describe('AuthorRecordBar', () => {
    test('düğmeler ilgili işlevleri çağırır', () => {
        const p = props();
        const wrapper = mount(<AuthorRecordBar {...p} />);
        button(wrapper, 'Adımı kaydet').simulate('click');
        button(wrapper, 'Kaydı bitir').simulate('click');
        button(wrapper, 'Paneli aç').simulate('click');
        expect(p.onSaveStep).toHaveBeenCalledTimes(1);
        expect(p.onStop).toHaveBeenCalledTimes(1);
        expect(p.onOpenPanel).toHaveBeenCalledTimes(1);
    });

    test('adım sayısını ve durum mesajını gösterir; meşgulken kaydet kapalıdır', () => {
        const wrapper = mount(<AuthorRecordBar {...props({status: 'Adım 2 kaydedildi', busy: true})} />);
        expect(wrapper.text()).toContain('Adım 2 kaydedildi');
        expect(wrapper.text()).toContain('2');
        expect(button(wrapper, 'Adımı kaydet').prop('disabled')).toBe(true);
    });

    test('tutamaçtan sürüklenince konum değişir, sınırlar içinde kalır', () => {
        const wrapper = mount(<AuthorRecordBar {...props()} />);
        const instance = wrapper.instance();
        instance.element = {getBoundingClientRect: () => ({left: 100, top: 500, width: 300, height: 40})};
        wrapper.find('[data-handle]').simulate('mouseDown', {clientX: 120, clientY: 510, button: 0});
        instance.handleMove({clientX: 220, clientY: 410});
        expect(instance.state.pos).toEqual({left: 200, top: 400});
        instance.handleMove({clientX: -5000, clientY: -5000});
        expect(instance.state.pos).toEqual({left: 0, top: 0});
        instance.handleUp();
        instance.handleMove({clientX: 300, clientY: 300});
        expect(instance.state.pos).toEqual({left: 0, top: 0});
    });
});
