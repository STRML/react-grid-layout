import React from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import _ from "lodash";
const ResponsiveReactGridLayout = WidthProvider(Responsive);

const generateLayout = () =>
  _.map(_.range(0, 7), function(item, i) {
    const y = Math.ceil(Math.random() * 4) + 1;
    return {
      x: (_.random(0, 5) * 2) % 12,
      y: Math.floor(i / 6) * y,
      w: 2,
      h: 2,
      i: i.toString()
    };
  });

/**
 * This layout demonstrates how to use a grid with a dynamic number of elements.
 */
class AddRemoveLayout extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 100,
    initialLayout: generateLayout()
  };

  constructor(props) {
    super(props);

    this.state = {
      newCounter: 0,
      currentBreakpoint: "lg",
      layouts: { lg: this.props.initialLayout }
    };

    this.onAddItem = this.onAddItem.bind(this);
    this.onBreakpointChange = this.onBreakpointChange.bind(this);
    this.onLayoutChange = this.onLayoutChange.bind(this);
  }

  generateDOM() {
    return _.map(this.state.layouts[this.state.currentBreakpoint], l => {
      return (
        <div key={l.i} className={l.static ? "static" : ""}>
          <div
            className="hide-button"
            onClick={this.onRemoveItem.bind(this, l)}
          >
            &times;
          </div>
          {l.static ? (
            <span
              className="text"
              title="This item is static and cannot be removed or resized."
            >
              Static - {l.i}
            </span>
          ) : (
            <span className="text">{l.i}</span>
          )}
        </div>
      );
    });
  }

  onAddItem() {
    /*eslint no-console: 0*/
    console.log("adding", "n" + this.state.newCounter);
    this.setState(prevState => ({
      // Add a new item. It must have a unique key!
      layouts: {
        ...prevState.layouts,
        [prevState.currentBreakpoint]: [
          ...prevState.layouts[prevState.currentBreakpoint],
          {
            i: "n" + this.state.newCounter,
            x:
              (this.state.layouts[prevState.currentBreakpoint].length * 2) %
              (this.state.cols || 12),
            y: Infinity, // puts it at the bottom
            w: 2,
            h: 2
          }
        ]
      },
      // Increment the counter to ensure key is always unique.
      newCounter: this.state.newCounter + 1
    }));
  }

  // We're using the cols coming back from this to calculate where to add new items.
  onBreakpointChange(breakpoint, cols) {
    this.setState({
      currentBreakpoint: breakpoint,
      cols: cols
    });
  }

  onLayoutChange(layout, layouts) {
    this.props.onLayoutChange(layout, layouts);
    this.setState({ layouts });
  }

  onRemoveItem(item) {
    console.log("removing", item.i);
    this.setState(prevState => ({
      layouts: {
        ...prevState.layouts,
        [prevState.currentBreakpoint]: prevState.layouts[
          prevState.currentBreakpoint
        ].filter(({ i }) => i !== item.i)
      }
    }));
  }

  render() {
    return (
      <div>
        <button onClick={this.onAddItem}>Add Item</button>
        <ResponsiveReactGridLayout
          {...this.props}
          layouts={this.state.layouts}
          onLayoutChange={this.onLayoutChange}
          onBreakpointChange={this.onBreakpointChange}
        >
          {this.generateDOM()}
        </ResponsiveReactGridLayout>
      </div>
    );
  }
}

module.exports = AddRemoveLayout;

if (require.main === module) {
  require("../test-hook.jsx")(module.exports);
}
