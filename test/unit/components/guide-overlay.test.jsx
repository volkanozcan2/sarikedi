import React from 'react';
import {mount} from 'enzyme';
import GuideOverlay from '../../../src/components/guide-overlay/guide-overlay';

const frames = () => [
    {kind: 'move', x: 100, y: 200, ms: 800, holding: false, label: 'Buraya tıkla'},
    {kind: 'press', x: 100, y: 200, ms: 300, holding: false, label: ''},
    {kind: 'pause', x: 100, y: 200, ms: 500, holding: false, label: ''}
];

const setReducedMotion = value => {
    window.matchMedia = () => ({matches: value});
};

describe('GuideOverlay', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        setReducedMotion(false);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('boş çerçevelerde hiçbir şey çizmez ve onDone çağrılır', () => {
        const onDone = jest.fn();
        const wrapper = mount(<GuideOverlay frames={[]} playKey={0} onDone={onDone} />);
        expect(wrapper.find('img')).toHaveLength(0);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    test('oynarken el çizilir; etiket ilk hareket çerçevesinde görünür', () => {
        const wrapper = mount(<GuideOverlay frames={frames()} playKey={0} onDone={jest.fn()} />);
        jest.runTimersToTime(60);
        wrapper.update();
        expect(wrapper.find('img')).toHaveLength(1);
        expect(wrapper.text()).toContain('Buraya tıkla');
    });

    test('tüm çerçeveler bitince el kaybolur ve onDone bir kez çağrılır', () => {
        const onDone = jest.fn();
        const wrapper = mount(<GuideOverlay frames={frames()} playKey={0} onDone={onDone} />);
        jest.runTimersToTime(5000);
        wrapper.update();
        expect(wrapper.find('img')).toHaveLength(0);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    test('playKey değişince animasyon baştan başlar', () => {
        const wrapper = mount(<GuideOverlay frames={frames()} playKey={0} onDone={jest.fn()} />);
        jest.runTimersToTime(5000);
        wrapper.update();
        expect(wrapper.find('img')).toHaveLength(0);
        wrapper.setProps({playKey: 1});
        jest.runTimersToTime(60);
        wrapper.update();
        expect(wrapper.find('img')).toHaveLength(1);
    });

    test('söküldüğünde zamanlayıcıları temizler (onDone çağrılmaz)', () => {
        const onDone = jest.fn();
        const wrapper = mount(<GuideOverlay frames={frames()} playKey={0} onDone={onDone} />);
        wrapper.unmount();
        jest.runTimersToTime(5000);
        expect(onDone).not.toHaveBeenCalled();
    });

    test('hareketi azalt açıksa el oynamaz, hedefler sabit halkayla vurgulanır', () => {
        setReducedMotion(true);
        const wrapper = mount(<GuideOverlay frames={frames()} playKey={0} onDone={jest.fn()} />);
        wrapper.update();
        expect(wrapper.find('img')).toHaveLength(0);
        expect(wrapper.find('.guide-ring')).toHaveLength(1);
        expect(wrapper.text()).toContain('Buraya tıkla');
        jest.runTimersToTime(5000);
        wrapper.update();
        expect(wrapper.find('.guide-ring')).toHaveLength(1);
    });

    test('hareketi azalt açıkken sürükleme için başlangıç ve bitiş vurgulanır', () => {
        setReducedMotion(true);
        const dragFrames = [
            {kind: 'move', x: 10, y: 10, ms: 800, holding: false, label: 'Sürükle'},
            {kind: 'press', x: 10, y: 10, ms: 300, holding: false, label: ''},
            {kind: 'move', x: 200, y: 100, ms: 1100, holding: true, label: ''},
            {kind: 'release', x: 200, y: 100, ms: 300, holding: false, label: ''}
        ];
        const wrapper = mount(<GuideOverlay frames={dragFrames} playKey={0} onDone={jest.fn()} />);
        wrapper.update();
        expect(wrapper.find('.guide-ring')).toHaveLength(2);
    });

    test('el tıklamayı engellemez (pointer-events: none)', () => {
        const wrapper = mount(<GuideOverlay frames={frames()} playKey={0} onDone={jest.fn()} />);
        jest.runTimersToTime(60);
        wrapper.update();
        expect(wrapper.find('div').first().prop('style').pointerEvents).toBe('none');
    });
});
