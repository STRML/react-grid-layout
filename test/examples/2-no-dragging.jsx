import React from "react";
import _ from "lodash";
import RGL, { WidthProvider } from "react-grid-layout";

const ReactGridLayout = WidthProvider(RGL);

class NoDraggingLayout extends React.PureComponent {
  static defaultProps = {
    items: 50
  };

  state = {
    disabled: true,
    mixins: true,
    gridProps: {
      className: "layout",
      isDraggable: true,
      isResizable: true,
      isEditable: false,
      cols: 12,
      rowHeight: 30,
      onLayoutChange: function() {}
    }
  };

  constructor(props) {
    super(props);

    this.state.layout = this.generateLayout();
  }

  generateDOM() {
    return _.map(_.range(this.props.items), function(i) {
      return (
        <div key={i}>
          <span className="text">{i}</span>
        </div>
      );
    });
  }

  generateLayout() {
    const p = this.props;
    return _.map(new Array(p.items), function(item, i) {
      var y = _.result(p, "y") || Math.ceil(Math.random() * 4) + 1;
      return {
        x: (i * 2) % 12,
        y: Math.floor(i / 6) * y,
        w: 2,
        h: y,
        i: i.toString()
      };
    });
  }

  onLayoutChange(layout) {
    this.state.gridProps.onLayoutChange(layout);
  }

  changeMode(e) {
    let mixins = true;
    if (e.target.value == "isEditable") {
      mixins = false;
    }
    this.setState({ mixins: mixins });
  }

  toggleDisable(e) {
    if (e.target.checked) {
      let gridProps = this.state.gridProps;
      if (this.state.mixins) {
        gridProps.isDraggable = false;
        gridProps.isResizable = false;
        gridProps.isEditable = true;
      } else {
        gridProps.isDraggable = true;
        gridProps.isResizable = true;
        gridProps.isEditable = false;
      }
      this.setState({ disabled: true, gridProps: gridProps });
    } else {
      let gridProps = this.state.gridProps;
      gridProps.isDraggable = true;
      gridProps.isResizable = true;
      gridProps.isEditable = true;
      this.setState({ disabled: false, gridProps: gridProps });
    }
  }

  render() {
    return (
      <div>
        <p>
          <label>
            <input
              name="disableMode"
              type="radio"
              value="mixins"
              checked={this.state.mixins}
              onChange={this.changeMode.bind(this)}
            />
            Disable by turning off mixins (unmounts widgets on change)
          </label>
          <br />
          <label>
            <input
              name="disableMode"
              type="radio"
              value="isEditable"
              checked={!this.state.mixins}
              onChange={this.changeMode.bind(this)}
            />
            Disable by disabling mixins (keeps widgets mounted on change)
          </label>
          <br />
          <br />
          <label>
            <input
              type="checkbox"
              checked={this.state.disabled}
              onChange={this.toggleDisable.bind(this)}
            />
            Disable widgets
          </label>
          <br />
        </p>

        <ReactGridLayout
          layout={this.state.layout}
          onLayoutChange={this.onLayoutChange.bind(this)}
          {...this.state.gridProps}
        >
          {this.generateDOM()}
        </ReactGridLayout>
      </div>
    );
  }
}

module.exports = NoDraggingLayout;

if (require.main === module) {
  require("../test-hook.jsx")(module.exports);
}
