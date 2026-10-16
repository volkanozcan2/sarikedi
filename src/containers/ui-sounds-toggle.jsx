import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import {getUiSounds} from '../lib/ui-sounds';

/**
 * Arayüz seslerinin açık/kapalı durumunu ve değiştirme işlevini çocuğuna verir:
 *     <UiSoundsToggle>{(on, onToggle) => ...}</UiSoundsToggle>
 */
class UiSoundsToggle extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleToggle']);
        this.sounds = getUiSounds();
        this.state = {on: this.sounds.isOn()};
    }
    componentDidMount () {
        this.unsubscribe = this.sounds.subscribe(on => this.setState({on: on}));
    }
    componentWillUnmount () {
        if (this.unsubscribe) this.unsubscribe();
    }
    handleToggle () {
        this.sounds.setOn(!this.state.on);
    }
    render () {
        return this.props.children(this.state.on, this.handleToggle);
    }
}

UiSoundsToggle.propTypes = {
    children: PropTypes.func
};

export default UiSoundsToggle;
