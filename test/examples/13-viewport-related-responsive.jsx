'use strict';
var React = require('react');
var PureRenderMixin = require('react/lib/ReactComponentWithPureRenderMixin');
var _ = require('lodash');
var WidthProvider = require('react-grid-layout').WidthProvider;
var ResponsiveReactGridLayout = require('react-grid-layout').Responsive;
ResponsiveReactGridLayout = WidthProvider(ResponsiveReactGridLayout);

/**
 * This layout demonstrates how to use a grid with a dynamic number of elements.
 */
var ViewportRelatedResponsiveLayout = React.createClass({
  mixins: [PureRenderMixin],

  getDefaultProps() {
    return {
      className: "layout",
      cols: {lg: 12, md: 10, sm: 6, xs: 4, xxs: 2},
      rowHeight: 2,
      unit: 'vw',
      margin: [0.5,0.5]
    };
  },

  getInitialState() {
    return {
      items: [0, 1, 2, 3, 4].map(function(i) {
        return {i: i.toString(), x: i * 2, y: 0, w: 2, h: 2};
      })
    };
  },

  createElement(el) {
    var i = el.i;
    return (
      <div key={i} data-grid={el}>
        <span className="text viewport-related">{i}</span>
      </div>
    );
  },

  // We're using the cols coming back from this to calculate where to add new items.
  onBreakpointChange(breakpoint, cols) {
    this.setState({
      breakpoint: breakpoint,
      cols: cols
    });
  },

  onLayoutChange(layout) {
    this.props.onLayoutChange(layout);
    this.setState({layout: layout});
  },

  render() {
    return (
      <div>
        <ResponsiveReactGridLayout onLayoutChange={this.onLayoutChange} onBreakpointChange={this.onBreakpointChange}
                                   {...this.props}>
          {_.map(this.state.items, this.createElement)}
        </ResponsiveReactGridLayout>
      </div>
    );
  }
});

module.exports = ViewportRelatedResponsiveLayout;

if (require.main === module) {
  require('../test-hook.jsx')(module.exports);
}
