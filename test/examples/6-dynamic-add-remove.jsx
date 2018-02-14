import React from "react";
import { WidthProvider, Responsive, createDragApiRef } from "react-grid-layout";
import _ from "lodash";
import Draggable from "react-draggable";

const ResponsiveReactGridLayout = WidthProvider(Responsive);

/**
 * This layout demonstrates how to use a grid with a dynamic number of elements.
 */
class AddRemoveLayout extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 100
  };

  constructor(props) {
    super(props);

    this.state = {
      items: [0, 1, 2, 3, 4].map(function(i, key, list) {
        return {
          i: i.toString(),
          x: i * 2,
          y: 0,
          w: 2,
          h: 2,
          add: i === (list.length - 1).toString()
        };
      }),
      newCounter: 0,
      placeholderPosition: { x: 0, y: 0 }
    };
    this.dragApi = createDragApiRef();

    this.onAddItem = this.onAddItem.bind(this);
    this.onBreakpointChange = this.onBreakpointChange.bind(this);
    this.onLayoutChange = this.onLayoutChange.bind(this);
    this.dragPlaceholder = this.dragPlaceholder.bind(this);
    this.stopPlaceholder = this.stopPlaceholder.bind(this);
  }

  createElement(el) {
    const removeStyle = {
      position: "absolute",
      right: "2px",
      top: 0,
      cursor: "pointer"
    };
    const i = el.add ? "+" : el.i;
    return (
      <div key={i} data-grid={el}>
        {el.add ? (
          <span
            className="add text"
            onClick={this.onAddItem}
            title="You can add an item by clicking here, too."
          >
            Add +
          </span>
        ) : (
          <span className="text">{i}</span>
        )}
        <span
          className="remove"
          style={removeStyle}
          onClick={this.onRemoveItem.bind(this, i)}
        >
          x
        </span>
      </div>
    );
  }

  onAddItem() {
    /*eslint no-console: 0*/
    console.log("adding", "n" + this.state.newCounter);
    this.setState({
      // Add a new item. It must have a unique key!
      items: this.state.items.concat({
        i: "n" + this.state.newCounter,
        x: (this.state.items.length * 2) % (this.state.cols || 12),
        y: Infinity, // puts it at the bottom
        w: 2,
        h: 2
      }),
      // Increment the counter to ensure key is always unique.
      newCounter: this.state.newCounter + 1
    });
  }

  onLayoutChange(layout) {
    console.log("layout changed", layout);
    this.setState({
      items: layout
    });
  }

  // We're using the cols coming back from this to calculate where to add new items.
  onBreakpointChange(breakpoint, cols) {
    this.setState({
      breakpoint: breakpoint,
      cols: cols
    });
  }

  onRemoveItem(i) {
    console.log("removing", i);
    this.setState({ items: _.reject(this.state.items, { i: i }) });
  }

  dragPlaceholder(event, { node, newPosition }) {
    if (this.dragApi.value) {
      const containerRect = this.container.getBoundingClientRect();
      const left = event.clientX - containerRect.left;
      const top = event.clientY - containerRect.top;
      if (left < 0 || top < 0) {
        this.dragApi.value.dragOut({
          event,
          position: {
            left,
            top
          }
        });
      } else {
        this.dragApi.value.dragIn({
          i: "n" + this.state.newCounter,
          w: 2,
          h: 2,
          event,
          node,
          position: {
            left,
            top
          }
        });
      }
    }
  }

  stopPlaceholder(event, { node }) {
    if (this.dragApi.value) {
      const containerRect = this.container.getBoundingClientRect();
      this.dragApi.value.stop({
        event,
        position: {
          left: event.clientX - containerRect.left,
          top: event.clientY - containerRect.top
        }
      });
      this.setState(state => ({
        newCounter: state.newCounter + 1
      }));
    }
  }

  render() {
    return (
      <div>
        <button onClick={this.onAddItem}>Add Item</button>
        <Draggable
          position={this.state.placeholderPosition}
          onDrag={this.dragPlaceholder}
          onStop={this.stopPlaceholder}
        >
          <button style={{ position: "relative", zIndex: 1000 }}>
            Drag external Item
          </button>
        </Draggable>
        <div ref={node => (this.container = node)}>
          <ResponsiveReactGridLayout
            dragApiRef={this.dragApi}
            onLayoutChange={this.onLayoutChange}
            onBreakpointChange={this.onBreakpointChange}
          >
            {_.map(this.state.items, el => this.createElement(el))}
          </ResponsiveReactGridLayout>
        </div>
      </div>
    );
  }
}

module.exports = AddRemoveLayout;

if (require.main === module) {
  require("../test-hook.jsx")(module.exports);
}
