import React from 'react';
import {mount} from 'enzyme';
import AuthorLogin from '../../../src/components/author/author-login';
import AuthorLessonList from '../../../src/components/author/author-lesson-list';
import PatternValuesEditor from '../../../src/components/author/pattern-values-editor';
import OutcomeEditor from '../../../src/components/author/outcome-editor';
import GuideEditor from '../../../src/components/author/guide-editor';
import AuthorStepForm from '../../../src/components/author/author-step-form';
import AuthorLessonForm from '../../../src/components/author/author-lesson-form';
import {extractPattern} from '../../../src/lib/lessons/block-pattern';
import {emptyLesson, emptyStep, newOutcomeCheck} from '../../../src/lib/lessons/draft';
import {movesFixture} from '../lessons/helpers/blocks-fixture';

const button = (wrapper, label) => wrapper.find('button').filterWhere(b => b.text().indexOf(label) !== -1);
const change = (input, value) => input.simulate('change', {target: {value: value, checked: value}});

describe('AuthorLogin', () => {
    test('şifre girilip gönderilir; boşken devre dışı', () => {
        const onLogin = jest.fn();
        const wrapper = mount(<AuthorLogin busy={false} error={null} onLogin={onLogin} />);
        expect(button(wrapper, 'Giriş').prop('disabled')).toBe(true);
        change(wrapper.find('input[type="password"]'), 'gizli');
        expect(button(wrapper, 'Giriş').prop('disabled')).toBe(false);
        button(wrapper, 'Giriş').simulate('click');
        expect(onLogin).toHaveBeenCalledWith('gizli');
    });

    test('hata gösterilir, meşgulken devre dışı', () => {
        const wrapper = mount(<AuthorLogin busy error="Şifre yanlış" onLogin={jest.fn()} />);
        expect(wrapper.text()).toContain('Şifre yanlış');
        change(wrapper.find('input[type="password"]'), 'x');
        expect(button(wrapper, 'Giriş').prop('disabled')).toBe(true);
    });
});

describe('AuthorLessonList', () => {
    const lessons = [
        {id: 'a-ders', title: 'A', level: 'baslangic', order: 0, stepCount: 3, published: true},
        {id: 'b-ders', title: 'B', level: 'orta', order: 1, stepCount: 5, published: false}
    ];
    const props = overrides => Object.assign({
        lessons: lessons, busy: false, onNew: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn(),
        onTogglePublished: jest.fn(), onMove: jest.fn(), onLogout: jest.fn()
    }, overrides);

    test('dersleri, seviyeyi ve durumu gösterir', () => {
        const wrapper = mount(<AuthorLessonList {...props()} />);
        const text = wrapper.text();
        expect(text).toContain('A');
        expect(text).toContain('3 adım');
        expect(text).toContain('Yayında');
        expect(text).toContain('Gizli');
    });

    test('satır işlemleri doğru kimlikle çağrılır', () => {
        const p = props();
        const wrapper = mount(<AuthorLessonList {...p} />);
        button(wrapper, 'Düzenle').at(1).simulate('click');
        expect(p.onEdit).toHaveBeenCalledWith('b-ders');
        button(wrapper, 'Sil').at(0).simulate('click');
        expect(p.onDelete).toHaveBeenCalledWith('a-ders');
        button(wrapper, 'Gizle').at(0).simulate('click');
        expect(p.onTogglePublished).toHaveBeenCalledWith('a-ders');
        button(wrapper, 'Yayınla').at(0).simulate('click');
        expect(p.onTogglePublished).toHaveBeenCalledWith('b-ders');
        button(wrapper, '▼').at(0).simulate('click');
        expect(p.onMove).toHaveBeenCalledWith('a-ders', 1);
        button(wrapper, '▲').at(1).simulate('click');
        expect(p.onMove).toHaveBeenCalledWith('b-ders', -1);
    });

    test('ilk satırda yukarı, son satırda aşağı devre dışı', () => {
        const wrapper = mount(<AuthorLessonList {...props()} />);
        expect(button(wrapper, '▲').at(0).prop('disabled')).toBe(true);
        expect(button(wrapper, '▼').at(1).prop('disabled')).toBe(true);
    });

    test('Yeni ders ve Çıkış, boş liste mesajı', () => {
        const p = props({lessons: []});
        const wrapper = mount(<AuthorLessonList {...p} />);
        expect(wrapper.text()).toContain('Henüz ders yok');
        button(wrapper, 'Yeni ders').simulate('click');
        button(wrapper, 'Çıkış').simulate('click');
        expect(p.onNew).toHaveBeenCalled();
        expect(p.onLogout).toHaveBeenCalled();
    });
});

describe('PatternValuesEditor', () => {
    const pattern = () => extractPattern(movesFixture(), 'hat');

    test('her değer için satır; ANY olanlarda metin kutusu yok', () => {
        const wrapper = mount(<PatternValuesEditor pattern={pattern()} onChange={jest.fn()} />);
        expect(wrapper.find('input[type="checkbox"]')).toHaveLength(2);
        expect(wrapper.find('input[type="text"]')).toHaveLength(0);
        expect(wrapper.text()).toContain('motion_movesteps.STEPS');
    });

    test('"herhangi" kutusu kapatılınca tam değer kutusu açılır ve değişiklik bildirilir', () => {
        const onChange = jest.fn();
        const wrapper = mount(<PatternValuesEditor pattern={pattern()} onChange={onChange} />);
        wrapper.find('input[type="checkbox"]').at(0).simulate('change', {target: {checked: false}});
        const updated = onChange.mock.calls[0][0];
        expect(updated.next.inputs.STEPS).toEqual({literal: ''});
    });

    test('tam değer yazılınca kalıp güncellenir; kutu işaretlenince tekrar herhangi olur', () => {
        const onChange = jest.fn();
        const exact = extractPattern(movesFixture(), 'hat', {exactLiterals: true});
        const wrapper = mount(<PatternValuesEditor pattern={exact} onChange={onChange} />);
        change(wrapper.find('input[type="text"]').at(0), '25');
        expect(onChange.mock.calls[0][0].next.inputs.STEPS).toEqual({literal: '25'});
        wrapper.find('input[type="checkbox"]').at(1).simulate('change', {target: {checked: true}});
        expect(onChange.mock.calls[1][0].next.next.inputs.DEGREES).toEqual({literal: {any: true}});
    });
});

describe('OutcomeEditor', () => {
    test('mevcut kontrol alanları gösterilir', () => {
        const wrapper = mount(<OutcomeEditor check={newOutcomeCheck()} onChange={jest.fn()} />);
        expect(wrapper.find('select').length).toBeGreaterThanOrEqual(3);
        expect(wrapper.find('input[type="number"]').length).toBeGreaterThanOrEqual(1);
    });

    test('tetik, bekleme ve beklenti değişiklikleri bildirilir', () => {
        const onChange = jest.fn();
        const wrapper = mount(<OutcomeEditor check={newOutcomeCheck()} onChange={onChange} />);
        wrapper.find('select').at(0).simulate('change', {target: {value: 'key'}});
        expect(onChange.mock.calls[0][0].trigger).toEqual({key: 'a'});
        wrapper.find('input[type="number"]').at(0).simulate('change', {target: {value: '800'}});
        expect(onChange.mock.calls[1][0].waitMs).toBe(800);
    });

    test('beklenti ekle ve sil', () => {
        const onChange = jest.fn();
        const wrapper = mount(<OutcomeEditor check={newOutcomeCheck()} onChange={onChange} />);
        button(wrapper, 'Beklenti ekle').simulate('click');
        expect(onChange.mock.calls[0][0].expect).toHaveLength(2);
        button(wrapper, 'Kaldır').at(0).simulate('click');
        expect(onChange.mock.calls[1][0].expect).toHaveLength(0);
    });

    test('değer sayıya, karşılaştırma ve özellik seçimine göre türü korur', () => {
        const onChange = jest.fn();
        const wrapper = mount(<OutcomeEditor check={newOutcomeCheck()} onChange={onChange} />);
        const row = wrapper.find('[data-expectation]').at(0);
        row.find('input[data-field="value"]').simulate('change', {target: {value: '12'}});
        expect(onChange.mock.calls[0][0].expect[0].value).toBe(12);
        row.find('select[data-field="op"]').simulate('change', {target: {value: 'contains'}});
        expect(onChange.mock.calls[1][0].expect[0].op).toBe('contains');
        expect(typeof onChange.mock.calls[1][0].expect[0].value).toBe('string');
    });
});

describe('GuideEditor', () => {
    const baseProps = overrides => Object.assign({
        guide: [], paletteOpcodes: ['motion_movesteps', 'looks_say'], workspaceOpcodes: ['event_whenflagclicked'],
        onChange: jest.fn()
    }, overrides);

    test('tıklama ve sürükleme eylemi eklenir', () => {
        const p = baseProps();
        const wrapper = mount(<GuideEditor {...p} />);
        button(wrapper, 'Tıklama ekle').simulate('click');
        expect(p.onChange.mock.calls[0][0]).toEqual([{type: 'click', target: {kind: 'category', id: 'motion'}}]);
        button(wrapper, 'Sürükleme ekle').simulate('click');
        expect(p.onChange.mock.calls[1][0][0].type).toBe('drag');
    });

    test('eylem sil ve sırala', () => {
        const guide = [
            {type: 'click', target: {kind: 'category', id: 'motion'}},
            {type: 'click', target: {kind: 'ui', id: 'greenFlag'}}
        ];
        const p = baseProps({guide: guide});
        const wrapper = mount(<GuideEditor {...p} />);
        button(wrapper, '▼').at(0).simulate('click');
        expect(p.onChange.mock.calls[0][0].map(a => a.target.kind)).toEqual(['ui', 'category']);
        button(wrapper, 'Kaldır').at(1).simulate('click');
        expect(p.onChange.mock.calls[1][0]).toHaveLength(1);
    });

    test('hedef türü ve değeri değişir; etiket yazılır', () => {
        const guide = [{type: 'click', target: {kind: 'category', id: 'motion'}}];
        const p = baseProps({guide: guide});
        const wrapper = mount(<GuideEditor {...p} />);
        wrapper.find('select[data-field="kind"]').at(0).simulate('change', {target: {value: 'ui'}});
        expect(p.onChange.mock.calls[0][0][0].target).toEqual({kind: 'ui', id: 'greenFlag'});
        wrapper.find('select[data-field="kind"]').at(0).simulate('change', {target: {value: 'block'}});
        expect(p.onChange.mock.calls[1][0][0].target).toEqual({kind: 'block', opcode: 'motion_movesteps'});
        wrapper.find('select[data-field="value"]').at(0).simulate('change', {target: {value: 'control'}});
        expect(p.onChange.mock.calls[2][0][0].target).toEqual({kind: 'category', id: 'control'});
        change(wrapper.find('input[data-field="label"]').at(0), 'Buraya tıkla');
        expect(p.onChange.mock.calls[3][0][0].label).toBe('Buraya tıkla');
    });

    test('birden fazla palet bloğu sürükleme uyarısı', () => {
        const drag = {type: 'drag', from: {kind: 'block', opcode: 'motion_movesteps'}, to: {kind: 'workspace'}};
        const wrapper = mount(<GuideEditor {...baseProps({guide: [drag, drag]})} />);
        expect(wrapper.text()).toContain('en çok bir palet bloğu');
        const single = mount(<GuideEditor {...baseProps({guide: [drag]})} />);
        expect(single.text()).not.toContain('en çok bir palet bloğu');
    });
});

describe('AuthorStepForm', () => {
    const props = overrides => Object.assign({
        step: emptyStep(), index: 0,
        scripts: [{sprite: 'Cool Cat', id: 'hat', opcode: 'event_whenflagclicked', blockCount: 3}],
        paletteOpcodes: [], workspaceOpcodes: [], testResult: null, busy: false,
        onChange: jest.fn(), onChangeCheck: jest.fn(), onRemoveCheck: jest.fn(), onAddOutcome: jest.fn(),
        onCapture: jest.fn(), onTry: jest.fn(), onRefresh: jest.fn(), onUploadMedia: jest.fn()
    }, overrides);

    test('metin ve ipucu değişiklikleri yama olarak bildirilir', () => {
        const p = props();
        const wrapper = mount(<AuthorStepForm {...p} />);
        change(wrapper.find('textarea[data-field="text"]'), 'Yeni metin');
        expect(p.onChange).toHaveBeenCalledWith({text: 'Yeni metin'});
        change(wrapper.find('input[data-field="hint"]'), 'İpucu');
        expect(p.onChange).toHaveBeenCalledWith({hint: 'İpucu'});
        change(wrapper.find('input[data-field="hint"]'), '');
        expect(p.onChange).toHaveBeenCalledWith({hint: null});
    });

    test('betik yakalama: seçilen betik ve "tam değer" seçeneğiyle', () => {
        const p = props();
        const wrapper = mount(<AuthorStepForm {...p} />);
        expect(wrapper.text()).toContain('event_whenflagclicked');
        button(wrapper, 'Kontrol olarak ekle').simulate('click');
        expect(p.onCapture).toHaveBeenCalledWith({sprite: 'Cool Cat', id: 'hat', opcode: 'event_whenflagclicked', blockCount: 3}, false);
        wrapper.find('input[data-field="exact"]').simulate('change', {target: {checked: true}});
        button(wrapper, 'Kontrol olarak ekle').simulate('click');
        expect(p.onCapture.mock.calls[1][1]).toBe(true);
    });

    test('betik yoksa uyarı gösterilir ve ekleme devre dışı', () => {
        const wrapper = mount(<AuthorStepForm {...props({scripts: []})} />);
        expect(wrapper.text()).toContain('Çalışma alanında betik yok');
        expect(button(wrapper, 'Kontrol olarak ekle')).toHaveLength(0);
    });

    test('mevcut kontroller: blok kalıbı değer editörüyle, sonuç kontrolü editörüyle; sil', () => {
        const pattern = extractPattern(movesFixture(), 'hat');
        const step = Object.assign(emptyStep(), {checks: [{type: 'blocks', pattern: pattern}, newOutcomeCheck()]});
        const p = props({step: step});
        const wrapper = mount(<AuthorStepForm {...p} />);
        expect(wrapper.find(PatternValuesEditor)).toHaveLength(1);
        expect(wrapper.find(OutcomeEditor)).toHaveLength(1);
        button(wrapper, 'Kontrolü sil').at(1).simulate('click');
        expect(p.onRemoveCheck).toHaveBeenCalledWith(1);
    });

    test('blok kontrolünde kukla adı düzenlenir; boşaltılınca alan kaldırılır', () => {
        const pattern = extractPattern(movesFixture(), 'hat');
        const step = Object.assign(emptyStep(), {checks: [{type: 'blocks', sprite: 'Star', pattern: pattern}]});
        const p = props({step: step});
        const wrapper = mount(<AuthorStepForm {...p} />);
        expect(wrapper.find('input[data-field="sprite"]').prop('value')).toBe('Star');
        change(wrapper.find('input[data-field="sprite"]'), 'Ball');
        expect(p.onChangeCheck).toHaveBeenCalledWith(0, {type: 'blocks', sprite: 'Ball', pattern: pattern});
        change(wrapper.find('input[data-field="sprite"]'), '');
        expect(p.onChangeCheck).toHaveBeenLastCalledWith(0, {type: 'blocks', pattern: pattern});
    });

    test('kalıp değeri düzenlenince kontrolün kukla kapsamı korunur', () => {
        const pattern = extractPattern(movesFixture(), 'hat');
        const step = Object.assign(emptyStep(), {checks: [{type: 'blocks', sprite: 'Star', pattern: pattern}]});
        const p = props({step: step});
        const wrapper = mount(<AuthorStepForm {...p} />);
        wrapper.find('input[type="checkbox"]').at(0).simulate('change', {target: {checked: false}});
        const updated = p.onChangeCheck.mock.calls[0][1];
        expect(updated.sprite).toBe('Star');
        expect(updated.type).toBe('blocks');
        expect(updated.pattern.next.inputs.STEPS).toEqual({literal: ''});
    });

    test('Dene ve sonuç gösterimi', () => {
        const p = props({testResult: {passed: false, manual: false, results: [
            {type: 'blocks', passed: true}, {type: 'outcome', passed: false, failures: [{index: 0, reason: 'x beklendi'}]}
        ]}});
        const wrapper = mount(<AuthorStepForm {...p} />);
        button(wrapper, 'Kontrolleri dene').simulate('click');
        expect(p.onTry).toHaveBeenCalled();
        expect(wrapper.text()).toContain('Geçmedi');
        expect(wrapper.text()).toContain('x beklendi');
        const ok = mount(<AuthorStepForm {...props({testResult: {passed: true, manual: false, results: []}})} />);
        expect(ok.text()).toContain('Geçti');
        const manual = mount(<AuthorStepForm {...props({testResult: {passed: false, manual: true, results: []}})} />);
        expect(manual.text()).toContain('kontrolsüz');
    });

    test('sonuç kontrolü ekle ve yenile düğmeleri', () => {
        const p = props();
        const wrapper = mount(<AuthorStepForm {...p} />);
        button(wrapper, 'Sonuç kontrolü ekle').simulate('click');
        button(wrapper, 'Yenile').simulate('click');
        expect(p.onAddOutcome).toHaveBeenCalled();
        expect(p.onRefresh).toHaveBeenCalled();
    });
});

describe('AuthorLessonForm', () => {
    const props = overrides => Object.assign({
        draft: Object.assign(emptyLesson(), {id: 'deneme', title: 'Deneme'}), isNew: false, dirty: false, busy: false,
        errors: [], message: null, stepIndex: 0, onChange: jest.fn(), onChangeId: jest.fn(), onSelectStep: jest.fn(),
        onAddStep: jest.fn(), onRemoveStep: jest.fn(), onMoveStep: jest.fn(), onSave: jest.fn(), onBack: jest.fn(),
        onUploadCover: jest.fn(), onUseCurrentProject: jest.fn(), onClearStartProject: jest.fn()
    }, overrides);

    test('üst bilgi alanları yama bildirir; var olan dersin kimliği salt okunur', () => {
        const p = props();
        const wrapper = mount(<AuthorLessonForm {...p} />);
        change(wrapper.find('input[data-field="title"]'), 'Yeni başlık');
        expect(p.onChange).toHaveBeenCalledWith({title: 'Yeni başlık'});
        wrapper.find('select[data-field="level"]').simulate('change', {target: {value: 'orta'}});
        expect(p.onChange).toHaveBeenCalledWith({level: 'orta'});
        expect(wrapper.find('input[data-field="id"]').prop('readOnly')).toBe(true);
        const fresh = mount(<AuthorLessonForm {...props({isNew: true})} />);
        change(fresh.find('input[data-field="id"]'), 'yeni-ders');
        expect(fresh.find('input[data-field="id"]').prop('readOnly')).toBe(false);
    });

    test('adım listesi: seç, ekle, sil, sırala', () => {
        const draft = Object.assign(emptyLesson(), {id: 'd', title: 'D', steps: [emptyStep(), emptyStep(), emptyStep()]});
        const p = props({draft: draft, stepIndex: 1});
        const wrapper = mount(<AuthorLessonForm {...p} />);
        wrapper.find('button[data-step]').at(2).simulate('click');
        expect(p.onSelectStep).toHaveBeenCalledWith(2);
        button(wrapper, 'Adım ekle').simulate('click');
        button(wrapper, 'Adımı sil').simulate('click');
        expect(p.onRemoveStep).toHaveBeenCalledWith(1);
        button(wrapper, 'Yukarı').simulate('click');
        expect(p.onMoveStep).toHaveBeenCalledWith(1, -1);
        button(wrapper, 'Aşağı').simulate('click');
        expect(p.onMoveStep).toHaveBeenCalledWith(1, 1);
        expect(p.onAddStep).toHaveBeenCalled();
    });

    test('kaydet ve geri; değişiklik varken işaret; hata ve mesaj gösterimi', () => {
        const p = props({dirty: true, errors: ['title: 1-120 karakter olmalı'], message: 'Kaydedildi'});
        const wrapper = mount(<AuthorLessonForm {...p} />);
        expect(wrapper.text()).toContain('Kaydedilmemiş değişiklik');
        expect(wrapper.text()).toContain('title: 1-120 karakter olmalı');
        expect(wrapper.text()).toContain('Kaydedildi');
        button(wrapper, 'Kaydet').simulate('click');
        button(wrapper, 'Geri').simulate('click');
        expect(p.onSave).toHaveBeenCalled();
        expect(p.onBack).toHaveBeenCalled();
    });

    test('başlangıç projesi düğmeleri ve çocuk adım formu', () => {
        const draft = Object.assign(emptyLesson(), {id: 'd', title: 'D', startProject: '/uploads/a.sb3'});
        const p = props({draft: draft});
        const wrapper = mount(
            <AuthorLessonForm {...p}>
                <div className="step-form-yer-tutucu" />
            </AuthorLessonForm>
        );
        expect(wrapper.find('.step-form-yer-tutucu')).toHaveLength(1);
        expect(wrapper.text()).toContain('/uploads/a.sb3');
        button(wrapper, 'Başlangıç projesini kaldır').simulate('click');
        expect(p.onClearStartProject).toHaveBeenCalled();
        button(wrapper, 'Şu anki projeyi başlangıç projesi yap').simulate('click');
        expect(p.onUseCurrentProject).toHaveBeenCalled();
    });

    test('meşgulken kaydet devre dışı', () => {
        const wrapper = mount(<AuthorLessonForm {...props({busy: true})} />);
        expect(button(wrapper, 'Kaydet').prop('disabled')).toBe(true);
    });
});
