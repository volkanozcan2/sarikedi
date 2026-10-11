import React from 'react';
import {mount} from 'enzyme';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';
import LessonPlayer, {LessonPlayerComponent} from '../../../src/containers/lesson-player';

const lesson = {
    id: 'ilk-ders',
    title: 'Kediyi yürüt',
    steps: [
        {text: 'Birinci adım', media: null, hint: null, checks: [], guide: []},
        {text: 'İkinci adım', media: null, hint: null, checks: [], guide: []}
    ]
};

const makeVm = () => ({
    runtime: {on: jest.fn(), off: jest.fn(), targets: []}
});

const render = lessons => {
    const store = configureStore()({scratchGui: {lessons: lessons}});
    const vm = makeVm();
    const wrapper = mount(
        <Provider store={store}>
            <IntlProvider locale="en">
                <LessonPlayer vm={vm} />
            </IntlProvider>
        </Provider>
    );
    return {wrapper, store, vm};
};

describe('LessonPlayer container', () => {
    test('ders etkin değilken hiçbir şey çizmez ve izleyici başlamaz', () => {
        const {wrapper, vm} = render({status: 'idle', lesson: null, stepIndex: 0, passed: false, expanded: true});
        expect(wrapper.text()).toBe('');
        expect(vm.runtime.on).not.toHaveBeenCalled();
    });

    test('etkin derste paneli çizer ve izleyiciyi başlatır', () => {
        const {wrapper, vm} = render({status: 'active', lesson, stepIndex: 0, passed: false, expanded: true});
        expect(wrapper.text()).toContain('Kediyi yürüt');
        expect(wrapper.text()).toContain('Birinci adım');
        expect(vm.runtime.on).toHaveBeenCalledWith('PROJECT_CHANGED', expect.any(Function));
    });

    test('sökülünce izleyici durur', () => {
        const {wrapper, vm} = render({status: 'active', lesson, stepIndex: 0, passed: false, expanded: true});
        wrapper.unmount();
        expect(vm.runtime.off).toHaveBeenCalledWith('PROJECT_CHANGED', expect.any(Function));
    });

    test('tamamlanınca tebrik gösterir', () => {
        const {wrapper} = render({status: 'completed', lesson, stepIndex: 1, passed: false, expanded: true});
        expect(wrapper.text()).toContain('Tebrikler');
    });
});

describe('LessonPlayer otomatik ilerleme', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const setup = overrides => {
        const props = Object.assign({
            status: 'active',
            lesson: lesson,
            stepIndex: 1,
            passed: false,
            expanded: true,
            vm: makeVm(),
            onExit: jest.fn(),
            onNextStep: jest.fn(),
            onPrevStep: jest.fn(),
            onStepPassed: jest.fn(),
            onToggleExpanded: jest.fn()
        }, overrides);
        const wrapper = mount(
            <IntlProvider locale="en">
                <LessonPlayerComponent {...props} />
            </IntlProvider>
        );
        return {props, instance: wrapper.find(LessonPlayerComponent).instance()};
    };

    const passed = {passed: true, manual: false, results: []};

    test('doğru çözüm ~900 ms sonra sonraki adıma geçirir', () => {
        const {props, instance} = setup();
        instance.handleResult(passed);
        expect(props.onStepPassed).toHaveBeenCalledTimes(1);
        jest.runTimersToTime(1000);
        expect(props.onNextStep).toHaveBeenCalledTimes(1);
    });

    test('Geri ile dönülen adımda (hâlâ doğruysa) otomatik ileri atlanmaz', () => {
        const {props, instance} = setup();
        instance.handlePrev();
        instance.handleResult(passed);
        expect(props.onStepPassed).toHaveBeenCalledTimes(1);
        jest.runTimersToTime(5000);
        expect(props.onNextStep).not.toHaveBeenCalled();
    });

    test('Geri sonrası İleri\'ye basılınca otomatik ilerleme yeniden açılır', () => {
        const {props, instance} = setup();
        instance.handlePrev();
        instance.handleNext();
        expect(props.onNextStep).toHaveBeenCalledTimes(1);
        instance.handleResult(passed);
        jest.runTimersToTime(1000);
        expect(props.onNextStep).toHaveBeenCalledTimes(2);
    });

    test('bekleyen otomatik ilerleme Geri ile iptal edilir', () => {
        const {props, instance} = setup();
        instance.handleResult(passed);
        instance.handlePrev();
        jest.runTimersToTime(5000);
        expect(props.onNextStep).not.toHaveBeenCalled();
    });

    test('zaten geçilmiş adımda tekrar bildirim ilerletmez', () => {
        const {props, instance} = setup({passed: true});
        instance.handleResult(passed);
        jest.runTimersToTime(5000);
        expect(props.onStepPassed).not.toHaveBeenCalled();
        expect(props.onNextStep).not.toHaveBeenCalled();
    });
});
