/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

const PROPS = ['x', 'y', 'direction', 'size', 'visible', 'said', 'variable'];
const OPS = [['eq', 'eşit'], ['neq', 'eşit değil'], ['gt', 'büyük'], ['lt', 'küçük'], ['contains', 'içerir']];

const triggerKind = trigger => (trigger === 'flag' || trigger === 'none' ? trigger : 'key');

const propKind = prop => (prop.indexOf('variable:') === 0 ? 'variable' : prop);

// Değeri özelliğe ve karşılaştırmaya uygun türe çevirir
const coerce = (op, prop, text) => {
    if (op === 'contains') return String(text);
    if (op === 'gt' || op === 'lt') return Number(text) || 0;
    if (prop === 'visible') return text === 'true' || text === true;
    const asNumber = Number(text);
    return text !== '' && isFinite(asNumber) ? asNumber : String(text);
};

class OutcomeEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleTrigger', 'handleKey', 'handleWait', 'handleAddExpectation', 'handleRemoveExpectation',
            'handleExpectationField'
        ]);
    }
    update (patch) {
        this.props.onChange(Object.assign({}, this.props.check, patch));
    }
    handleTrigger (event) {
        const kind = event.target.value;
        this.update({trigger: kind === 'key' ? {key: 'a'} : kind});
    }
    handleKey (event) {
        this.update({trigger: {key: event.target.value}});
    }
    handleWait (event) {
        this.update({waitMs: Math.max(0, Math.min(10000, Math.round(Number(event.target.value) || 0)))});
    }
    handleAddExpectation () {
        this.update({expect: this.props.check.expect.concat([{target: '', prop: 'x', op: 'gt', value: 0}])});
    }
    handleRemoveExpectation (event) {
        const index = Number(event.currentTarget.getAttribute('data-index'));
        this.update({expect: this.props.check.expect.filter((e, i) => i !== index)});
    }
    handleExpectationField (event) {
        const element = event.currentTarget;
        const index = Number(element.getAttribute('data-index'));
        const field = element.getAttribute('data-field');
        const value = event.target.value;
        const current = this.props.check.expect[index];
        const patch = {};
        if (field === 'target') {
            patch.target = value;
        } else if (field === 'prop') {
            patch.prop = value === 'variable' ? 'variable:skor' : value;
            patch.value = coerce(current.op, patch.prop, current.value);
        } else if (field === 'variable') {
            patch.prop = `variable:${value}`;
        } else if (field === 'op') {
            patch.op = value;
            patch.value = coerce(value, current.prop, current.value);
        } else {
            patch.value = coerce(current.op, current.prop, value);
        }
        const next = Object.assign({}, current, patch);
        this.update({expect: this.props.check.expect.map((e, i) => (i === index ? next : e))});
    }
    renderExpectation (exp, index) {
        const kind = propKind(exp.prop);
        return (
            <div
                className={styles.row}
                data-expectation={index}
                key={index}
            >
                <input
                    className={styles.input}
                    data-field="target"
                    data-index={index}
                    placeholder="Hedef (boş = seçili kukla, stage = sahne)"
                    type="text"
                    value={exp.target}
                    onChange={this.handleExpectationField}
                />
                <select
                    className={styles.select}
                    data-field="prop"
                    data-index={index}
                    value={kind}
                    onChange={this.handleExpectationField}
                >
                    {PROPS.map(p => (<option
                        key={p}
                        value={p}
                    >{p === 'variable' ? 'değişken' : p}</option>))}
                </select>
                {kind === 'variable' ? (
                    <input
                        className={styles.input}
                        data-field="variable"
                        data-index={index}
                        type="text"
                        value={exp.prop.slice('variable:'.length)}
                        onChange={this.handleExpectationField}
                    />
                ) : null}
                <select
                    className={styles.select}
                    data-field="op"
                    data-index={index}
                    value={exp.op}
                    onChange={this.handleExpectationField}
                >
                    {OPS.map(o => (<option
                        key={o[0]}
                        value={o[0]}
                    >{o[1]}</option>))}
                </select>
                <input
                    className={styles.input}
                    data-field="value"
                    data-index={index}
                    type="text"
                    value={String(exp.value)}
                    onChange={this.handleExpectationField}
                />
                <button
                    className={`${styles.button} ${styles.danger}`}
                    data-index={index}
                    onClick={this.handleRemoveExpectation}
                >
                    Kaldır
                </button>
            </div>
        );
    }
    render () {
        const {check} = this.props;
        const kind = triggerKind(check.trigger);
        return (
            <div>
                <div className={styles.row}>
                    <label>
                        {'Tetik: '}
                        <select
                            className={styles.select}
                            value={kind}
                            onChange={this.handleTrigger}
                        >
                            <option value="flag">yeşil bayrak</option>
                            <option value="none">hiçbiri (yalnızca bak)</option>
                            <option value="key">tuşa bas</option>
                        </select>
                    </label>
                    {kind === 'key' ? (
                        <input
                            className={styles.input}
                            placeholder="Tuş (a, ArrowLeft, space...)"
                            type="text"
                            value={check.trigger.key}
                            onChange={this.handleKey}
                        />
                    ) : null}
                    <label>
                        {'Bekle (ms): '}
                        <input
                            className={styles.input}
                            max="10000"
                            min="0"
                            type="number"
                            value={typeof check.waitMs === 'number' ? check.waitMs : 1000}
                            onChange={this.handleWait}
                        />
                    </label>
                </div>
                {check.expect.map((exp, index) => this.renderExpectation(exp, index))}
                <button
                    className={styles.button}
                    onClick={this.handleAddExpectation}
                >
                    Beklenti ekle
                </button>
            </div>
        );
    }
}

OutcomeEditor.propTypes = {
    check: PropTypes.shape({
        trigger: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({key: PropTypes.string})]),
        waitMs: PropTypes.number,
        expect: PropTypes.array
    }).isRequired,
    onChange: PropTypes.func.isRequired
};

export default OutcomeEditor;
