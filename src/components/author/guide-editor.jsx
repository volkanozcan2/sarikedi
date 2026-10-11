/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import {UI_IDS} from '../../lib/lessons/schema';
import {newGuideAction, paletteDragCount} from '../../lib/lessons/draft';
import styles from './author.css';

const CATEGORIES = ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'myBlocks'];
const KINDS = [
    ['category', 'kategori'], ['ui', 'arayüz öğesi'], ['block', 'palet bloğu'],
    ['workspaceBlock', 'çalışma alanı bloğu'], ['workspace', 'çalışma alanı (boş yer)']
];

class GuideEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleAdd', 'handleRemove', 'handleMove', 'handleKind', 'handleValue', 'handleLabel']);
    }
    handleAdd (event) {
        this.props.onChange(this.props.guide.concat([newGuideAction(event.currentTarget.getAttribute('data-type'))]));
    }
    handleRemove (event) {
        const index = Number(event.currentTarget.getAttribute('data-index'));
        this.props.onChange(this.props.guide.filter((a, i) => i !== index));
    }
    handleMove (event) {
        const index = Number(event.currentTarget.getAttribute('data-index'));
        const delta = Number(event.currentTarget.getAttribute('data-delta'));
        const target = index + delta;
        if (target < 0 || target >= this.props.guide.length) return;
        const guide = this.props.guide.slice();
        guide.splice(target, 0, guide.splice(index, 1)[0]);
        this.props.onChange(guide);
    }
    defaultTarget (kind) {
        const {paletteOpcodes, workspaceOpcodes} = this.props;
        switch (kind) {
        case 'category': return {kind: 'category', id: 'motion'};
        case 'ui': return {kind: 'ui', id: UI_IDS[0]};
        case 'block': return {kind: 'block', opcode: paletteOpcodes[0] || 'motion_movesteps'};
        case 'workspaceBlock': return {kind: 'workspaceBlock', opcode: workspaceOpcodes[0] || 'event_whenflagclicked'};
        default: return {kind: 'workspace'};
        }
    }
    updateAction (index, slot, targetOrPatch) {
        this.props.onChange(this.props.guide.map((action, i) => (i === index ?
            Object.assign({}, action, slot === 'label' ? targetOrPatch : {[slot]: targetOrPatch}) : action)));
    }
    handleKind (event) {
        const el = event.currentTarget;
        this.updateAction(
            Number(el.getAttribute('data-index')), el.getAttribute('data-slot'), this.defaultTarget(event.target.value)
        );
    }
    handleValue (event) {
        const el = event.currentTarget;
        const index = Number(el.getAttribute('data-index'));
        const slot = el.getAttribute('data-slot');
        const current = this.props.guide[index][slot];
        const value = event.target.value;
        const next = current.kind === 'category' || current.kind === 'ui' ?
            {kind: current.kind, id: value} : {kind: current.kind, opcode: value};
        this.updateAction(index, slot, next);
    }
    handleLabel (event) {
        const index = Number(event.currentTarget.getAttribute('data-index'));
        const text = event.target.value;
        this.updateAction(index, 'label', text ? {label: text} : {label: ''});
    }
    renderTarget (action, index, slot, title) {
        const target = action[slot];
        const options = {
            category: CATEGORIES,
            ui: UI_IDS,
            block: this.props.paletteOpcodes,
            workspaceBlock: this.props.workspaceOpcodes
        };
        const value = target.kind === 'category' || target.kind === 'ui' ? target.id : target.opcode;
        return (
            <div
                className={styles.row}
                key={slot}
            >
                <span>{title}</span>
                <select
                    className={styles.select}
                    data-field="kind"
                    data-index={index}
                    data-slot={slot}
                    value={target.kind}
                    onChange={this.handleKind}
                >
                    {KINDS.map(k => (<option
                        key={k[0]}
                        value={k[0]}
                    >{k[1]}</option>))}
                </select>
                {target.kind === 'workspace' ? null : (
                    <select
                        className={styles.select}
                        data-field="value"
                        data-index={index}
                        data-slot={slot}
                        value={value}
                        onChange={this.handleValue}
                    >
                        {(options[target.kind].indexOf(value) === -1 ? [value] : []).concat(options[target.kind])
                            .map(o => (<option
                                key={o}
                                value={o}
                            >{o}</option>))}
                    </select>
                )}
            </div>
        );
    }
    renderAction (action, index) {
        return (
            <div
                className={styles.checkBox}
                key={index}
            >
                <div className={styles.row}>
                    <strong>{action.type === 'drag' ? 'Sürükle' : 'Tıkla'}</strong>
                    <button
                        className={styles.button}
                        data-delta="-1"
                        data-index={index}
                        onClick={this.handleMove}
                    >
                        ▲
                    </button>
                    <button
                        className={styles.button}
                        data-delta="1"
                        data-index={index}
                        onClick={this.handleMove}
                    >
                        ▼
                    </button>
                    <button
                        className={`${styles.button} ${styles.danger}`}
                        data-index={index}
                        onClick={this.handleRemove}
                    >
                        Kaldır
                    </button>
                </div>
                {action.type === 'drag' ? [
                    this.renderTarget(action, index, 'from', 'Nereden'),
                    this.renderTarget(action, index, 'to', 'Nereye')
                ] : this.renderTarget(action, index, 'target', 'Hedef')}
                <input
                    className={styles.input}
                    data-field="label"
                    data-index={index}
                    placeholder="Balondaki yazı (isteğe bağlı)"
                    type="text"
                    value={action.label || ''}
                    onChange={this.handleLabel}
                />
            </div>
        );
    }
    render () {
        const {guide} = this.props;
        const step = {guide: guide};
        return (
            <div>
                {guide.map((action, index) => this.renderAction(action, index))}
                {paletteDragCount(step) > 1 ? (
                    <div className={styles.warning}>
                        Bir adımda en çok bir palet bloğu sürükleme eylemi olmalı;
                        fazlası el imlecini yanlış yere götürür.
                    </div>
                ) : null}
                <div className={styles.row}>
                    <button
                        className={styles.button}
                        data-type="click"
                        onClick={this.handleAdd}
                    >
                        Tıklama ekle
                    </button>
                    <button
                        className={styles.button}
                        data-type="drag"
                        onClick={this.handleAdd}
                    >
                        Sürükleme ekle
                    </button>
                </div>
            </div>
        );
    }
}

GuideEditor.propTypes = {
    guide: PropTypes.arrayOf(PropTypes.shape({type: PropTypes.string})).isRequired,
    onChange: PropTypes.func.isRequired,
    paletteOpcodes: PropTypes.arrayOf(PropTypes.string).isRequired,
    workspaceOpcodes: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default GuideEditor;
