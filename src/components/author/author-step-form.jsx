/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import GuideEditor from './guide-editor.jsx';
import OutcomeEditor from './outcome-editor.jsx';
import PatternValuesEditor from './pattern-values-editor.jsx';
import {countPatternBlocks} from '../../lib/lessons/pattern-values';
import styles from './author.css';

class AuthorStepForm extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleText', 'handleHint', 'handleGuide', 'handleScriptChoice', 'handleExact', 'handleCapture',
            'handleRemoveCheck', 'handleMedia', 'handleClearMedia'
        ]);
        this.state = {scriptIndex: 0, exact: false};
        this.changers = {};
        this.patternChangers = {};
        this.spriteChangers = {};
    }
    handleText (event) {
        this.props.onChange({text: event.target.value});
    }
    handleHint (event) {
        this.props.onChange({hint: event.target.value ? event.target.value : null});
    }
    handleGuide (guide) {
        this.props.onChange({guide: guide});
    }
    handleScriptChoice (event) {
        this.setState({scriptIndex: Number(event.target.value)});
    }
    handleExact (event) {
        this.setState({exact: event.target.checked});
    }
    handleCapture () {
        const script = this.props.scripts[this.state.scriptIndex] || this.props.scripts[0];
        this.props.onCapture(script, this.state.exact);
    }
    handleRemoveCheck (event) {
        this.props.onRemoveCheck(Number(event.currentTarget.getAttribute('data-index')));
    }
    handleMedia (event) {
        const file = event.target.files && event.target.files[0];
        if (file) this.props.onUploadMedia(file);
    }
    handleClearMedia () {
        this.props.onChange({media: null});
    }
    getChanger (index) {
        if (!this.changers[index]) this.changers[index] = check => this.props.onChangeCheck(index, check);
        return this.changers[index];
    }
    getPatternChanger (index) {
        if (!this.patternChangers[index]) {
            // kukla kapsamı gibi kontrolün diğer alanları korunur
            this.patternChangers[index] = pattern => this.props.onChangeCheck(
                index, Object.assign({}, this.props.step.checks[index], {pattern: pattern})
            );
        }
        return this.patternChangers[index];
    }
    getSpriteChanger (index) {
        if (!this.spriteChangers[index]) {
            this.spriteChangers[index] = event => {
                const check = Object.assign({}, this.props.step.checks[index]);
                if (event.target.value) check.sprite = event.target.value;
                else delete check.sprite;
                this.props.onChangeCheck(index, check);
            };
        }
        return this.spriteChangers[index];
    }
    renderCheck (check, index) {
        return (
            <div
                className={styles.checkBox}
                key={index}
            >
                <div className={styles.row}>
                    <strong>
                        {check.type === 'blocks' ?
                            `Blok kontrolü (${countPatternBlocks(check.pattern)} blok)` : 'Sonuç kontrolü'}
                    </strong>
                    <button
                        className={`${styles.button} ${styles.danger}`}
                        data-index={index}
                        onClick={this.handleRemoveCheck}
                    >
                        Kontrolü sil
                    </button>
                </div>
                {check.type === 'blocks' ? (
                    <label className={styles.field}>
                        <span>Kukla (boşsa tüm kuklalarda aranır)</span>
                        <input
                            className={styles.input}
                            data-field="sprite"
                            type="text"
                            value={check.sprite || ''}
                            onChange={this.getSpriteChanger(index)}
                        />
                    </label>
                ) : null}
                {check.type === 'blocks' ? (
                    <PatternValuesEditor
                        pattern={check.pattern}
                        onChange={this.getPatternChanger(index)}
                    />
                ) : (
                    <OutcomeEditor
                        check={check}
                        onChange={this.getChanger(index)}
                    />
                )}
            </div>
        );
    }
    renderTestResult () {
        const result = this.props.testResult;
        if (!result) return null;
        if (result.manual) {
            return <div className={styles.warning}>{'Bu adım kontrolsüz (öğrenci İleri\'ye basar).'}</div>;
        }
        return (
            <div className={result.passed ? styles.message : styles.error}>
                <strong>{result.passed ? 'Geçti' : 'Geçmedi'}</strong>
                {result.error ? <div>{`Hata: ${result.error.message}`}</div> : null}
                {result.results.map((r, i) => (
                    <div key={i}>
                        {`${r.type === 'blocks' ? 'Blok kontrolü' : 'Sonuç kontrolü'}: ${
                            r.passed ? 'geçti' : 'geçmedi'}`}
                        {r.skipped ? ' (atlandı)' : ''}
                        {(r.failures || []).map((f, j) => <div key={j}>{f.reason}</div>)}
                    </div>
                ))}
            </div>
        );
    }
    render () {
        const {step, index, scripts} = this.props;
        return (
            <div>
                <h3 className={styles.sectionTitle}>{`Adım ${index + 1}`}</h3>
                <label className={styles.field}>
                    <span>Metin</span>
                    <textarea
                        className={styles.textarea}
                        data-field="text"
                        value={step.text}
                        onChange={this.handleText}
                    />
                </label>
                <label className={styles.field}>
                    <span>İpucu (isteğe bağlı)</span>
                    <input
                        className={styles.input}
                        data-field="hint"
                        type="text"
                        value={step.hint || ''}
                        onChange={this.handleHint}
                    />
                </label>
                <div className={styles.field}>
                    <span>Görsel (isteğe bağlı)</span>
                    {step.media ? (
                        <div className={styles.row}>
                            <code>{step.media}</code>
                            <button
                                className={styles.button}
                                onClick={this.handleClearMedia}
                            >
                                Görseli kaldır
                            </button>
                        </div>
                    ) : null}
                    <input
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        disabled={this.props.busy}
                        type="file"
                        onChange={this.handleMedia}
                    />
                </div>

                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>El rehberi</h4>
                    <GuideEditor
                        guide={step.guide}
                        paletteOpcodes={this.props.paletteOpcodes}
                        workspaceOpcodes={this.props.workspaceOpcodes}
                        onChange={this.handleGuide}
                    />
                </div>

                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Kontroller</h4>
                    {step.checks.length === 0 ?
                        <p className={styles.muted}>{'Kontrol yok: öğrenci "İleri" ile geçer.'}</p> : null}
                    {step.checks.map((check, i) => this.renderCheck(check, i))}
                    <div className={styles.checkBox}>
                        <strong>Çalışma alanından blok kontrolü yakala</strong>
                        {scripts.length === 0 ? (
                            <p className={styles.warning}>
                                {'Çalışma alanında betik yok. Çözümü editörde yap, sonra Yenile\'ye bas.'}
                            </p>
                        ) : (
                            <div className={styles.row}>
                                <select
                                    className={styles.select}
                                    value={this.state.scriptIndex}
                                    onChange={this.handleScriptChoice}
                                >
                                    {scripts.map((s, i) => (
                                        <option
                                            key={`${s.sprite}-${s.id}`}
                                            value={i}
                                        >
                                            {`${s.sprite}: ${s.opcode} (${s.blockCount} blok)`}
                                        </option>
                                    ))}
                                </select>
                                <label>
                                    <input
                                        checked={this.state.exact}
                                        data-field="exact"
                                        type="checkbox"
                                        onChange={this.handleExact}
                                    />
                                    {' sayıları da tam değer yap'}
                                </label>
                                <button
                                    className={`${styles.button} ${styles.primary}`}
                                    onClick={this.handleCapture}
                                >
                                    Kontrol olarak ekle
                                </button>
                            </div>
                        )}
                        <div className={styles.row}>
                            <button
                                className={styles.button}
                                onClick={this.props.onRefresh}
                            >
                                Yenile
                            </button>
                            <button
                                className={styles.button}
                                onClick={this.props.onAddOutcome}
                            >
                                Sonuç kontrolü ekle
                            </button>
                        </div>
                    </div>
                    <div className={styles.row}>
                        <button
                            className={`${styles.button} ${styles.primary}`}
                            disabled={this.props.busy}
                            onClick={this.props.onTry}
                        >
                            Kontrolleri dene
                        </button>
                        <span className={styles.muted}>(proje çalıştırılır; durumu değişebilir)</span>
                    </div>
                    {this.renderTestResult()}
                </div>
            </div>
        );
    }
}

AuthorStepForm.propTypes = {
    busy: PropTypes.bool,
    index: PropTypes.number.isRequired,
    onAddOutcome: PropTypes.func.isRequired,
    onCapture: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onChangeCheck: PropTypes.func.isRequired,
    onRefresh: PropTypes.func.isRequired,
    onRemoveCheck: PropTypes.func.isRequired,
    onTry: PropTypes.func.isRequired,
    onUploadMedia: PropTypes.func.isRequired,
    paletteOpcodes: PropTypes.arrayOf(PropTypes.string).isRequired,
    scripts: PropTypes.arrayOf(PropTypes.shape({
        sprite: PropTypes.string, id: PropTypes.string, opcode: PropTypes.string, blockCount: PropTypes.number
    })).isRequired,
    step: PropTypes.shape({
        text: PropTypes.string,
        hint: PropTypes.string,
        media: PropTypes.string,
        checks: PropTypes.array,
        guide: PropTypes.array
    }).isRequired,
    testResult: PropTypes.shape({
        passed: PropTypes.bool,
        manual: PropTypes.bool,
        results: PropTypes.array,
        error: PropTypes.shape({message: PropTypes.string})
    }),
    workspaceOpcodes: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default AuthorStepForm;
