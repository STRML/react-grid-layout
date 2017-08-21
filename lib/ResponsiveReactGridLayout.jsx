// @flow
import React from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash.isequal';

import {cloneLayout, synchronizeLayoutWithChildren, validateLayout} from './utils';
import {getBreakpointFromWidth, getColsFromBreakpoint, findOrGenerateResponsiveLayout} from './responsiveUtils';
import ReactGridLayout from './ReactGridLayout';

const noop = function(){};
const type = (obj) => Object.prototype.toString.call(obj);

import type {Layout} from './utils';
type State = {
  layout: Layout,
  breakpoint: string,
  cols: number
};

export default class ResponsiveReactGridLayout extends React.Component {

  // This should only include propTypes needed in this code; RGL itself
  // will do validation of the rest props passed to it.
  static propTypes = {

    //
    // Basic props
    //

    // Optional, but if you are managing width yourself you may want to set the breakpoint
    // yourself as well.
    breakpoint: PropTypes.string,

    // {name: pxVal}, e.g. {lg: 1200, md: 996, sm: 768, xs: 480}
    breakpoints: PropTypes.object,

    // # of cols. This is a breakpoint -> cols map
    cols: PropTypes.object,

    // layouts is an object mapping breakpoints to layouts.
    // e.g. {lg: Layout, md: Layout, ...}
    layouts(props, propName) {
      if (type(props[propName]) !== '[object Object]') {
        throw new Error('Layout property must be an object. Received: ' + type(props[propName]));
      }
      Object.keys(props[propName]).forEach((key) => {
        if (!(key in props.breakpoints)) {
          throw new Error('Each key in layouts must align with a key in breakpoints.');
        }
        validateLayout(props.layouts[key], 'layouts.' + key);
      });
    },

    // The width of this component.
    // Required in this propTypes stanza because generateInitialState() will fail without it.
    width: PropTypes.number.isRequired,

    // Defines the unit to use (using vw, vh will size elements relatively)
    unit: PropTypes.string,

    //
    // Callbacks
    //

    // Calls back with breakpoint and new # cols
    onBreakpointChange: PropTypes.func,

    // Callback so you can save the layout.
    // Calls back with (currentLayout, allLayouts). allLayouts are keyed by breakpoint.
    onLayoutChange: PropTypes.func,

    // Calls back with (containerWidth, margin, cols, containerPadding)
    onWidthChange: PropTypes.func
  };

  static defaultProps = {
    breakpoints: {lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0},
    cols: {lg: 12, md: 10, sm: 6, xs: 4, xxs: 2},
    layouts: {},
    unit: 'px',
    onBreakpointChange: noop,
    onLayoutChange: noop,
    onWidthChange: noop
  };

  state: State = this.generateInitialState();

  generateInitialState(): State {
    const {width, breakpoints, layouts, verticalCompact, cols} = this.props;
    const breakpoint = getBreakpointFromWidth(breakpoints, width);
    const colNo = getColsFromBreakpoint(breakpoint, cols);
    // Get the initial layout. This can tricky; we try to generate one however possible if one doesn't exist
    // for this layout.
    const initialLayout = findOrGenerateResponsiveLayout(layouts, breakpoints, breakpoint,
                                                         breakpoint, colNo, verticalCompact);

    return {
      layout: initialLayout,
      breakpoint: breakpoint,
      cols: colNo
    };
  }

  componentWillReceiveProps(nextProps: Object) {

    // Allow parent to set width or breakpoint directly.
    if (
         nextProps.width != this.props.width
      || nextProps.breakpoint !== this.props.breakpoint
      || !isEqual(nextProps.breakpoints, this.props.breakpoints)
      || !isEqual(nextProps.cols, this.props.cols)
    ) {
      this.onWidthChange(nextProps);
    }

    // Allow parent to set layouts directly.
    else if (!isEqual(nextProps.layouts, this.props.layouts)) {
      const {breakpoint, cols} = this.state;

      // Since we're setting an entirely new layout object, we must generate a new responsive layout
      // if one does not exist.
      const newLayout = findOrGenerateResponsiveLayout(
        nextProps.layouts, nextProps.breakpoints,
        breakpoint, breakpoint, cols, nextProps.verticalCompact
      );
      this.setState({layout: newLayout});
    }
  }

  // wrap layouts so we do not need to pass layouts to child
  onLayoutChange = (layout: Layout) => {
    this.props.onLayoutChange(layout, {...this.props.layouts, [this.state.breakpoint]: layout});
  };

  /**
   * When the width changes work through breakpoints and reset state with the new width & breakpoint.
   * Width changes are necessary to figure out the widget widths.
   */
  onWidthChange(nextProps: typeof ResponsiveReactGridLayout.prototype.props) {
    const {breakpoints, cols, layouts, verticalCompact} = nextProps;
    const newBreakpoint = nextProps.breakpoint || getBreakpointFromWidth(nextProps.breakpoints, nextProps.width);

    const lastBreakpoint = this.state.breakpoint;

    // Breakpoint change
    if (lastBreakpoint !== newBreakpoint || this.props.breakpoints !== breakpoints || this.props.cols !== cols) {
      // Preserve the current layout if the current breakpoint is not present in the next layouts.
      if (!(lastBreakpoint in layouts)) layouts[lastBreakpoint] = cloneLayout(this.state.layout);

      // Find or generate a new layout.
      const newCols: number = getColsFromBreakpoint(newBreakpoint, cols);
      let layout = findOrGenerateResponsiveLayout(layouts, breakpoints, newBreakpoint,
                                                  lastBreakpoint, newCols, verticalCompact);

      // This adds missing items.
      layout = synchronizeLayoutWithChildren(layout, nextProps.children, newCols, verticalCompact);

      // Store the new layout.
      layouts[newBreakpoint] = layout;

      // callbacks
      this.props.onLayoutChange(layout, layouts);
      this.props.onBreakpointChange(newBreakpoint, newCols);
      this.props.onWidthChange(nextProps.width, nextProps.margin, newCols, nextProps.containerPadding);

      this.setState({breakpoint: newBreakpoint, layout: layout, cols: newCols});
    }
  }

  render() {
    // eslint-disable-next-line no-unused-vars
    const {breakpoint, breakpoints, cols, layouts, onBreakpointChange, onLayoutChange, onWidthChange,
      ...other} = this.props;

    return (
      <ReactGridLayout
        {...other}
        onLayoutChange={this.onLayoutChange}
        layout={this.state.layout}
        cols={this.state.cols}
      />
    );
  }
}
