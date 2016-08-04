// @flow
import React, {PropTypes} from 'react';
import isEqual from 'lodash.isequal';
import {autoBindHandlers, bottom, cloneLayoutItem, compact, getLayoutItem, moveElement,
  synchronizeLayoutWithChildren, validateLayout} from './utils';
import GridItem from './GridItem';
const noop = function() {};

// Types
import type {ResizeEvent, DragEvent, Layout, LayoutItem} from './utils';
type State = {
  activeDrag: ?LayoutItem,
  layout: Layout,
  mounted: boolean,
  oldDragItem: ?LayoutItem,
  oldResizeItem: ?LayoutItem
};
// End Types

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */

export default class ReactGridLayout extends React.Component {
  // TODO publish internal ReactClass displayName transform
  static displayName = "ReactGridLayout";

  static propTypes = {
    //
    // Basic props
    //
    className: PropTypes.string,
    style: PropTypes.object,

    // This can be set explicitly. If it is not set, it will automatically
    // be set to the container width. Note that resizes will *not* cause this to adjust.
    // If you need that behavior, use WidthProvider.
    width: PropTypes.number,

    // If true, the container height swells and contracts to fit contents
    autoSize: PropTypes.bool,
    // # of cols.
    cols: PropTypes.number,

    // A selector that will not be draggable.
    draggableCancel: PropTypes.string,
    // A selector for the draggable handler
    draggableHandle: PropTypes.string,

    // If true, the layout will compact vertically
    verticalCompact: PropTypes.bool,

    // layout is an array of object with the format:
    // {x: Number, y: Number, w: Number, h: Number, i: String}
    layout: function (props) {
      var layout = props.layout;
      // I hope you're setting the data-grid property on the grid items
      if (layout === undefined) return;
      validateLayout(layout, 'layout');
    },

    //
    // Grid Dimensions
    //

    // Margin between items [x, y] in px
    margin: PropTypes.arrayOf(PropTypes.number),
    // Rows have a static height, but you can change this based on breakpoints if you like
    rowHeight: PropTypes.number,
    // Alternatively you can set the row height as percent of the column width. This overwrites the rowHeight property.
    rowHeightPercent: PropTypes.number,
    // Default Infinity, but you can specify a max here if you like.
    // Note that this isn't fully fleshed out and won't error if you specify a layout that
    // extends beyond the row capacity. It will, however, not allow users to drag/resize
    // an item past the barrier. They can push items beyond the barrier, though.
    // Intentionally not documented for this reason.
    maxRows: PropTypes.number,

    //
    // Flags
    //
    isDraggable: PropTypes.bool,
    isResizable: PropTypes.bool,
    // Use CSS transforms instead of top/left
    useCSSTransforms: PropTypes.bool,

    //
    // Callbacks
    //

    // Callback so you can save the layout. Calls after each drag & resize stops.
    onLayoutChange: PropTypes.func,

    // Calls when drag starts. Callback is of the signature (layout, oldItem, newItem, placeholder, e).
    // All callbacks below have the same signature. 'start' and 'stop' callbacks omit the 'placeholder'.
    onDragStart: PropTypes.func,
    // Calls on each drag movement.
    onDrag: PropTypes.func,
    // Calls when drag is complete.
    onDragStop: PropTypes.func,
    //Calls when resize starts.
    onResizeStart: PropTypes.func,
    // Calls when resize movement happens.
    onResize: PropTypes.func,
    // Calls when resize is complete.
    onResizeStop: PropTypes.func,

    //
    // Other validations
    //

    // Children must not have duplicate keys.
    children: function (props, propName, _componentName) {
      PropTypes.node.apply(this, arguments);
      var children = props[propName];

      // Check children keys for duplicates. Throw if found.
      var keys = {};
      React.Children.forEach(children, function (child) {
        if (keys[child.key]) {
          throw new Error("Duplicate child key found! This will cause problems in ReactGridLayout.");
        }
        keys[child.key] = true;
      });
    }
  };

  static defaultProps = {
    autoSize: true,
    cols: 12,
    className: '',
    rowHeight: 150,
    maxRows: Infinity, // infinite vertical growth
    layout: [],
    margin: [10, 10],
    isDraggable: true,
    isResizable: true,
    useCSSTransforms: true,
    verticalCompact: true,
    onLayoutChange: noop,
    onDragStart: noop,
    onDrag: noop,
    onDragStop: noop,
    onResizeStart: noop,
    onResize: noop,
    onResizeStop: noop
  };

  state: State = {
    activeDrag: null,
    layout: synchronizeLayoutWithChildren(this.props.layout, this.props.children,
                                          this.props.cols, this.props.verticalCompact),
    mounted: false,
    oldDragItem: null,
    oldResizeItem: null
  };

  constructor(props: typeof ReactGridLayout.prototype.props, context: any): void {
    super(props, context);
    autoBindHandlers(this, ['onDragStart', 'onDrag', 'onDragStop', 'onResizeStart', 'onResize', 'onResizeStop']);
  }

  componentDidMount() {
    this.setState({mounted: true});
    // Call back with layout on mount. This should be done after correcting the layout width
    // to ensure we don't rerender with the wrong width.
    this.props.onLayoutChange(this.state.layout);
  }

  componentWillReceiveProps(nextProps: typeof ReactGridLayout.prototype.props) {
    let newLayoutBase;
    // Allow parent to set layout directly.
    if (!isEqual(nextProps.layout, this.props.layout)) {
      newLayoutBase = nextProps.layout;
    }

    // If children change, also regenerate the layout. Use our state
    // as the base in case because it may be more up to date than
    // what is in props.
    else if (nextProps.children.length !== this.props.children.length) {
      newLayoutBase = this.state.layout;
    }

    // We need to regenerate the layout.
    if (newLayoutBase) {
      const newLayout = synchronizeLayoutWithChildren(newLayoutBase, nextProps.children,
                                                      nextProps.cols, nextProps.verticalCompact);
      this.setState({layout: newLayout});
      this.props.onLayoutChange(newLayout);
    }
  }

  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  containerHeight() {
    if (!this.props.autoSize) return;
    var rowHeight;
    if (this.props.rowHeightPercent) {
      var colWidth = (this.props.width - (this.props.margin[0] * (this.props.cols + 1))) / this.props.cols;
      rowHeight = colWidth * this.props.rowHeightPercent / 100;
    } else {
      rowHeight = this.props.rowHeight;
    }
    return bottom(this.state.layout) * (rowHeight + this.props.margin[1]) + this.props.margin[1] + 'px';
  }

  /**
   * When dragging starts
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDragStart(i:string, x:number, y:number, {e, node}: DragEvent) {
    const {layout} = this.state;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    this.setState({oldDragItem: cloneLayoutItem(l)});

    this.props.onDragStart(layout, l, l, null, e, node);
  }

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDrag(i:string, x:number, y:number, {e, node}: DragEvent) {
    const {oldDragItem} = this.state;
    let {layout} = this.state;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    // Create placeholder (display only)
    var placeholder = {
      w: l.w, h: l.h, x: l.x, y: l.y, placeholder: true, i: i
    };

    // Move the element to the dragged location.
    layout = moveElement(layout, l, x, y, true /* isUserAction */);

    this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);

    this.setState({
      layout: compact(layout, this.props.verticalCompact),
      activeDrag: placeholder
    });
  }

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param  {String} i Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDragStop(i:string, x:number, y:number, {e, node}: DragEvent) {
    const {oldDragItem} = this.state;
    let {layout} = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) return;

    // Move the element here
    layout = moveElement(layout, l, x, y, true /* isUserAction */);

    this.props.onDragStop(layout, oldDragItem, l, null, e, node);

    // Set state
    this.setState({
      activeDrag: null,
      layout: compact(layout, this.props.verticalCompact),
      oldDragItem: null
    });

    this.props.onLayoutChange(this.state.layout);
  }

  onResizeStart(i:string, w:number, h:number, {e, node}: ResizeEvent) {
    const {layout} = this.state;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    this.setState({oldResizeItem: cloneLayoutItem(l)});

    this.props.onResizeStart(layout, l, l, null, e, node);
  }

  onResize(i:string, w:number, h:number, {e, node}: ResizeEvent) {
    const {layout, oldResizeItem} = this.state;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    // Set new width and height.
    l.w = w;
    l.h = h;

    // Create placeholder element (display only)
    var placeholder = {
      w: w, h: h, x: l.x, y: l.y, static: true, i: i
    };

    this.props.onResize(layout, oldResizeItem, l, placeholder, e, node);

    // Re-compact the layout and set the drag placeholder.
    this.setState({layout: compact(layout, this.props.verticalCompact), activeDrag: placeholder});
  }

  onResizeStop(i:string, w:number, h:number, {e, node}: ResizeEvent) {
    const {layout, oldResizeItem} = this.state;
    var l = getLayoutItem(layout, i);

    this.props.onResizeStop(layout, oldResizeItem, l, null, e, node);

    // Set state
    this.setState({
      activeDrag: null,
      layout: compact(layout, this.props.verticalCompact),
      oldResizeItem: null
    });

    this.props.onLayoutChange(this.state.layout);
  }

  /**
   * Create a placeholder object.
   * @return {Element} Placeholder div.
   */
  placeholder(): ?React.Element<any> {
    const {activeDrag} = this.state;
    if (!activeDrag) return null;
    const {width, cols, margin, rowHeight, rowHeightPercent, maxRows, useCSSTransforms} = this.props;

    // {...this.state.activeDrag} is pretty slow, actually
    return (
      <GridItem
        w={activeDrag.w}
        h={activeDrag.h}
        x={activeDrag.x}
        y={activeDrag.y}
        i={activeDrag.i}
        className="react-grid-placeholder"
        containerWidth={width}
        cols={cols}
        margin={margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        rowHeightPercent={rowHeightPercent}
        isDraggable={false}
        isResizable={false}
        useCSSTransforms={useCSSTransforms}>
        <div />
      </GridItem>
    );
  }

  /**
   * Given a grid item, set its style attributes & surround in a <Draggable>.
   * @param  {Element} child React element.
   * @return {Element}       Element wrapped in draggable and properly placed.
   */
  processGridItem(child: React.Element<any>): ?React.Element<any> {
    if (!child.key) return;
    const l = getLayoutItem(this.state.layout, child.key);
    if (!l) return null;
    const {width, cols, margin, rowHeight, rowHeightPercent, maxRows, isDraggable, isResizable,
           useCSSTransforms, draggableCancel, draggableHandle} = this.props;
    const {mounted} = this.state;

    // Parse 'static'. Any properties defined directly on the grid item will take precedence.
    const draggable = Boolean(!l.static && isDraggable && (l.isDraggable || l.isDraggable == null));
    const resizable = Boolean(!l.static && isResizable && (l.isResizable || l.isResizable == null));

    return (
      <GridItem
        containerWidth={width}
        cols={cols}
        margin={margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        rowHeightPercent={rowHeightPercent}
        cancel={draggableCancel}
        handle={draggableHandle}
        onDragStop={this.onDragStop}
        onDragStart={this.onDragStart}
        onDrag={this.onDrag}
        onResizeStart={this.onResizeStart}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
        isDraggable={draggable}
        isResizable={resizable}
        useCSSTransforms={useCSSTransforms && mounted}
        usePercentages={!mounted}

        w={l.w}
        h={l.h}
        x={l.x}
        y={l.y}
        i={l.i}
        minH={l.minH}
        minW={l.minW}
        maxH={l.maxH}
        maxW={l.maxW}
        static={l.static}
        >
        {child}
      </GridItem>
    );
  }

  render() {
    const {className, style} = this.props;

    const mergedClassName = `react-grid-layout ${className}`;
    const mergedStyle = {
      height: this.containerHeight(),
      ...style
    };

    return (
      <div className={mergedClassName} style={mergedStyle}>
        {React.Children.map(this.props.children, (child) => this.processGridItem(child))}
        {this.placeholder()}
      </div>
    );
  }
}
