import React from 'react';
import {mountWithIntl} from '../../helpers/intl-helpers';
import LessonPanel from '../../../src/components/lesson-panel/lesson-panel';

const baseProps = overrides => Object.assign({
    title: 'Kediyi yürüt',
    stepIndex: 1,
    totalSteps: 3,
    step: {text: 'Bloğu sürükle', media: null, hint: 'Mavi blok', guide: [{type: 'click'}]},
    completed: false,
    passed: false,
    manual: false,
    expanded: true,
    hintVisible: false,
    onNext: jest.fn(),
    onPrev: jest.fn(),
    onExit: jest.fn(),
    onToggleExpanded: jest.fn(),
    onShowHint: jest.fn(),
    onReplayGuide: jest.fn()
}, overrides);

const button = (wrapper, label) => wrapper.find('button').filterWhere(b => b.text().indexOf(label) !== -1);

describe('LessonPanel', () => {
    test('başlık, adım sayacı ve metin görünür', () => {
        const wrapper = mountWithIntl(<LessonPanel {...baseProps()} />);
        const text = wrapper.text();
        expect(text).toContain('Kediyi yürüt');
        expect(text).toContain('Adım 2 / 3');
        expect(text).toContain('Bloğu sürükle');
    });

    test('görsel varsa img çizilir', () => {
        const props = baseProps({step: {text: 'x', media: '/uploads/a.gif', hint: null, guide: []}});
        expect(mountWithIntl(<LessonPanel {...props} />).find('img.lesson-panel-media')).toHaveLength(1);
        expect(mountWithIntl(<LessonPanel {...baseProps()} />).find('img.lesson-panel-media')).toHaveLength(0);
    });

    test('kontrollü adımda İleri geçilene kadar devre dışı, geçince etkin', () => {
        const locked = mountWithIntl(<LessonPanel {...baseProps()} />);
        expect(button(locked, 'İleri').prop('disabled')).toBe(true);
        const props = baseProps({passed: true});
        const open = mountWithIntl(<LessonPanel {...props} />);
        expect(button(open, 'İleri').prop('disabled')).toBe(false);
        button(open, 'İleri').simulate('click');
        expect(props.onNext).toHaveBeenCalled();
        expect(open.text()).toContain('Harika');
    });

    test('anlatım (manuel) adımında İleri hemen etkin', () => {
        const wrapper = mountWithIntl(<LessonPanel {...baseProps({manual: true})} />);
        expect(button(wrapper, 'İleri').prop('disabled')).toBe(false);
    });

    test('son adımda İleri yerine Bitir yazar', () => {
        const wrapper = mountWithIntl(<LessonPanel {...baseProps({stepIndex: 2, manual: true})} />);
        expect(button(wrapper, 'Bitir')).toHaveLength(1);
        expect(button(wrapper, 'İleri')).toHaveLength(0);
    });

    test('Geri ilk adımda devre dışı', () => {
        const first = mountWithIntl(<LessonPanel {...baseProps({stepIndex: 0})} />);
        expect(button(first, 'Geri').prop('disabled')).toBe(true);
        const props = baseProps();
        const wrapper = mountWithIntl(<LessonPanel {...props} />);
        button(wrapper, 'Geri').simulate('click');
        expect(props.onPrev).toHaveBeenCalled();
    });

    test('ipucu düğmesi ve ipucu metni', () => {
        const props = baseProps();
        const wrapper = mountWithIntl(<LessonPanel {...props} />);
        expect(wrapper.text()).not.toContain('Mavi blok');
        button(wrapper, 'İpucu').simulate('click');
        expect(props.onShowHint).toHaveBeenCalled();
        const shown = mountWithIntl(<LessonPanel {...baseProps({hintVisible: true})} />);
        expect(shown.text()).toContain('Mavi blok');
        expect(button(shown, 'İpucu')).toHaveLength(0);
        const noHint = mountWithIntl(<LessonPanel {...baseProps({step: {text: 'x', hint: null, guide: []}})} />);
        expect(button(noHint, 'İpucu')).toHaveLength(0);
    });

    test('Tekrar göster yalnızca rehber varsa', () => {
        const props = baseProps();
        const wrapper = mountWithIntl(<LessonPanel {...props} />);
        button(wrapper, 'Tekrar göster').simulate('click');
        expect(props.onReplayGuide).toHaveBeenCalled();
        const none = mountWithIntl(<LessonPanel {...baseProps({step: {text: 'x', hint: null, guide: []}})} />);
        expect(button(none, 'Tekrar göster')).toHaveLength(0);
    });

    test('küçültülünce gövde gizlenir, başlık kalır', () => {
        const wrapper = mountWithIntl(<LessonPanel {...baseProps({expanded: false})} />);
        expect(wrapper.text()).toContain('Kediyi yürüt');
        expect(wrapper.text()).not.toContain('Bloğu sürükle');
    });

    test('kapat ve küçült düğmeleri', () => {
        const props = baseProps();
        const wrapper = mountWithIntl(<LessonPanel {...props} />);
        wrapper.find('button[aria-label="Dersi kapat"]').simulate('click');
        expect(props.onExit).toHaveBeenCalled();
        wrapper.find('button[aria-label="Küçült veya büyüt"]').simulate('click');
        expect(props.onToggleExpanded).toHaveBeenCalled();
    });

    test('tamamlanınca tebrik ve Derslere dön', () => {
        const props = baseProps({completed: true});
        const wrapper = mountWithIntl(<LessonPanel {...props} />);
        expect(wrapper.text()).toContain('Tebrikler');
        expect(wrapper.text()).not.toContain('Bloğu sürükle');
        button(wrapper, 'Derslere dön').simulate('click');
        expect(props.onExit).toHaveBeenCalled();
    });

    test('step null iken çökmez', () => {
        expect(() => mountWithIntl(<LessonPanel {...baseProps({step: null})} />)).not.toThrow();
    });
});
