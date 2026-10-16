import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import {getPerformance} from '../lib/performance-settings';

/**
 * 60 FPS ve ara değer ayarlarını çocuğuna verir:
 *     <PerformanceSettings>{(settings, toggles) => ...}</PerformanceSettings>
 */
class PerformanceSettings extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleFps60', 'handleInterpolation']);
        this.performance = getPerformance(props.vm);
        this.state = this.performance.get();
    }
    componentDidMount () {
        this.unsubscribe = this.performance.subscribe(settings => this.setState(settings));
    }
    componentWillUnmount () {
        if (this.unsubscribe) this.unsubscribe();
    }
    handleFps60 () {
        this.performance.set({fps60: !this.state.fps60});
    }
    handleInterpolation () {
        this.performance.set({interpolation: !this.state.interpolation});
    }
    render () {
        return this.props.children(this.state, {
            onFps60: this.handleFps60,
            onInterpolation: this.handleInterpolation
        });
    }
}

PerformanceSettings.propTypes = {
    children: PropTypes.func,
    vm: PropTypes.shape({setCompatibilityMode: PropTypes.func})
};

const mapStateToProps = state => ({vm: state.scratchGui.vm});

export default connect(mapStateToProps, () => ({}))(PerformanceSettings);
