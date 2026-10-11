/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import {listPatternValues, setPatternValue} from '../../lib/lessons/pattern-values';
import styles from './author.css';

class PatternValuesEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleAnyChange', 'handleValueChange']);
    }
    handleAnyChange (event) {
        const path = JSON.parse(event.currentTarget.getAttribute('data-path'));
        this.props.onChange(setPatternValue(this.props.pattern, path, event.target.checked ? {any: true} : ''));
    }
    handleValueChange (event) {
        const path = JSON.parse(event.currentTarget.getAttribute('data-path'));
        this.props.onChange(setPatternValue(this.props.pattern, path, event.target.value));
    }
    render () {
        const values = listPatternValues(this.props.pattern);
        if (values.length === 0) return <p className={styles.muted}>Bu kalıpta düzenlenecek değer yok.</p>;
        return (
            <div>
                {values.map(item => {
                    const path = JSON.stringify(item.path);
                    return (
                        <div
                            className={styles.row}
                            key={path}
                        >
                            <span>{item.label}</span>
                            <label>
                                <input
                                    checked={item.any}
                                    data-path={path}
                                    type="checkbox"
                                    onChange={this.handleAnyChange}
                                />
                                {' herhangi'}
                            </label>
                            {item.any ? null : (
                                <input
                                    className={styles.input}
                                    data-path={path}
                                    type="text"
                                    value={item.value}
                                    onChange={this.handleValueChange}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
}

PatternValuesEditor.propTypes = {
    onChange: PropTypes.func.isRequired,
    pattern: PropTypes.shape({opcode: PropTypes.string}).isRequired
};

export default PatternValuesEditor;
