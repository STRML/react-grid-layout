// @flow
import React from "react";
import PropTypes from "prop-types";
import isEqual from "lodash.isequal";
import classNames from "classnames";
import {
  autoBindHandlers,
  bottom,
  childrenEqual,
  cloneLayoutItem,
  compact,
  getLayoutItem,
  moveElement,
  synchronizeLayoutWithChildren,
  validateLayout,
  getFirstCollision,
  noop,
  createDragApiRef
} from "./utils";
import GridItem, { calcXY } from "./GridItem";
import type {
  ChildrenArray as ReactChildrenArray,
  Element as ReactElement
} from "react";

// Types
import type {
  EventCallback,
  CompactType,
  GridResizeEvent,
  GridDragEvent,
  Layout,
  LayoutItem,
  DragApiRefObject
} from "./utils";

type State = {
  activeDrag: ?LayoutItem,
  layout: Layout,
  mounted: boolean,
  oldDragItem: ?LayoutItem,
  oldLayout: ?Layout,
  oldResizeItem: ?LayoutItem
};

export type Props = {
  className: string,
  style: Object,
  width: number,
  autoSize: boolean,
  cols: number,
  draggableCancel: string,
  draggableHandle: string,
  verticalCompact: boolean,
  compactType: ?("horizontal" | "vertical"),
  layout: Layout,
  margin: [number, number],
  containerPadding: [number, number] | null,
  rowHeight: number,
  maxRows: number,
  isDraggable: boolean,
  isResizable: boolean,
  preventCollision: boolean,
  useCSSTransforms: boolean,
  dragApiRef: DragApiRefObject,

  // Callbacks
  onLayoutChange: Layout => void,
  onDrag: EventCallback,
  onDragStart: EventCallback,
  onDragStop: EventCallback,
  onResize: EventCallback,
  onResizeStart: EventCallback,
  onResizeStop: EventCallback,
  children: ReactChildrenArray<ReactElement<any>>
};
// End Types

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */

export default class ReactGridLayout extends React.Component<Props, State> {
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

    // Deprecated
    verticalCompact: function(props: Props) {
      if (
        props.verticalCompact === false &&
        process.env.NODE_ENV !== "production"
      ) {
        console.warn(
          // eslint-disable-line no-console
          "`verticalCompact` on <ReactGridLayout> is deprecated and will be removed soon. " +
            'Use `compactType`: "horizontal" | "vertical" | null.'
        );
      }
    },
    // Choose vertical or hotizontal compaction
    compactType: PropTypes.oneOf(["vertical", "horizontal"]),

    // layout is an array of object with the format:
    // {x: Number, y: Number, w: Number, h: Number, i: String}
    layout: function(props: Props) {
      var layout = props.layout;
      // I hope you're setting the data-grid property on the grid items
      if (layout === undefined) return;
      validateLayout(layout, "layout");
    },

    //
    // Grid Dimensions
    //

    // Margin between items [x, y] in px
    margin: PropTypes.arrayOf(PropTypes.number),
    // Padding inside the container [x, y] in px
    containerPadding: PropTypes.arrayOf(PropTypes.number),
    // Rows have a static height, but you can change this based on breakpoints if you like
    rowHeight: PropTypes.number,
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
    // If true, grid items won't change position when being dragged over.
    preventCollision: PropTypes.bool,
    // Use CSS transforms instead of top/left
    useCSSTransforms: PropTypes.bool,

    //
    // Callbacks
    //

    // Callback so you can save the layout. Calls after each drag & resize stops.
    onLayoutChange: PropTypes.func,

    // Calls when drag starts. Callback is of the signature (layout, oldItem, newItem, placeholder, e, ?node).
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
    children: function(props: Props, propName: string) {
      var children = props[propName];

      // Check children keys for duplicates. Throw if found.
      var keys = {};
      React.Children.forEach(children, function(child) {
        if (keys[child.key]) {
          throw new Error(
            'Duplicate child key "' +
              child.key +
              '" found! This will cause problems in ReactGridLayout.'
          );
        }
        keys[child.key] = true;
      });
    }
  };

  static defaultProps = {
    autoSize: true,
    cols: 12,
    className: "",
    style: {},
    draggableHandle: "",
    draggableCancel: "",
    containerPadding: null,
    rowHeight: 150,
    maxRows: Infinity, // infinite vertical growth
    layout: [],
    margin: [10, 10],
    isDraggable: true,
    isResizable: true,
    useCSSTransforms: true,
    verticalCompact: true,
    compactType: "vertical",
    preventCollision: false,
    dragApiRef: createDragApiRef(),
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
    layout: synchronizeLayoutWithChildren(
      this.props.layout,
      this.props.children,
      this.props.cols,
      // Legacy support for verticalCompact: false
      this.compactType()
    ),
    mounted: false,
    oldDragItem: null,
    oldLayout: null,
    oldResizeItem: null
  };

  constructor(props: Props, context: any): void {
    super(props, context);
    autoBindHandlers(this, [
      "onDragStart",
      "onDrag",
      "onDragStop",
      "onResizeStart",
      "onResize",
      "onResizeStop"
    ]);
  }

  componentDidMount() {
    let dragInfo = null;

    this.props.dragApiRef.value = {
      dragIn: ({ i, w, h, node, event, position }) => {
        dragInfo = { i, w, h, node };
        const { layout } = this.state;
        const { margin, containerPadding } = this.props;
        const { x, y } = calcXY(position.top, position.left, {
          containerWidth: this.props.width,
          cols: this.props.cols,
          margin,
          containerPadding: containerPadding || margin,
          rowHeight: this.props.rowHeight,
          maxRows: this.props.maxRows,
          w,
          h
        });
        if (!this.state.activeDrag) {
          const l = { i, w, h, x, y };
          this.setState({
            oldDragItem: l,
            oldLayout: layout,
            layout: [...this.state.layout, l],
            activeDrag: l
          });
          this.props.onDragStart(layout, l, l, null, event, node);
        } else {
          this.onDrag(i, x, y, { e: event, node, newPosition: position });
        }
      },

      dragOut: ({ event }) => {
        if (dragInfo) {
          const { i } = dragInfo;
          this.setState((state, props) => ({
            layout: compact(
              state.layout.filter(d => d.i !== i),
              this.compactType(),
              props.cols
            ),
            activeDrag: null
          }));
        }
      },

      stop: ({ event, position }) => {
        if (dragInfo) {
          const { i, w, h, node } = dragInfo;
          const { margin, containerPadding } = this.props;
          const { x, y } = calcXY(position.top, position.left, {
            containerWidth: this.props.width,
            cols: this.props.cols,
            margin,
            containerPadding: containerPadding || margin,
            rowHeight: this.props.rowHeight,
            maxRows: this.props.maxRows,
            w,
            h
          });
          this.onDragStop(i, x, y, { e: event, node, newPosition: position });
          dragInfo = null;
        }
      }
    };

    this.setState({ mounted: true });
    // Possibly call back with layout on mount. This should be done after correcting the layout width
    // to ensure we don't rerender with the wrong width.
    this.onLayoutMaybeChanged(this.state.layout, this.props.layout);
  }

  componentWillReceiveProps(nextProps: Props) {
    let newLayoutBase;
    // Legacy support for compactType
    // Allow parent to set layout directly.
    if (
      !isEqual(nextProps.layout, this.props.layout) ||
      nextProps.compactType !== this.props.compactType
    ) {
      newLayoutBase = nextProps.layout;
    } else if (!childrenEqual(this.props.children, nextProps.children)) {
      // If children change, also regenerate the layout. Use our state
      // as the base in case because it may be more up to date than
      // what is in props.
      newLayoutBase = this.state.layout;
    }

    // We need to regenerate the layout.
    if (newLayoutBase) {
      const newLayout = synchronizeLayoutWithChildren(
        newLayoutBase,
        nextProps.children,
        nextProps.cols,
        this.compactType(nextProps)
      );
      const oldLayout = this.state.layout;
      this.setState({ layout: newLayout });
      this.onLayoutMaybeChanged(newLayout, oldLayout);
    }
  }

  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  containerHeight() {
    if (!this.props.autoSize) return;
    const nbRow = bottom(this.state.layout);
    const containerPaddingY = this.props.containerPadding
      ? this.props.containerPadding[1]
      : this.props.margin[1];
    return (
      nbRow * this.props.rowHeight +
      (nbRow - 1) * this.props.margin[1] +
      containerPaddingY * 2 +
      "px"
    );
  }

  compactType(props: ?Object): CompactType {
    if (!props) props = this.props;
    return props.verticalCompact === false ? null : props.compactType;
  }

  /**
   * When dragging starts
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDragStart(i: string, x: number, y: number, { e, node }: GridDragEvent) {
    const { layout } = this.state;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    this.setState({
      oldDragItem: cloneLayoutItem(l),
      oldLayout: this.state.layout
    });

    return this.props.onDragStart(layout, l, l, null, e, node);
  }

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDrag(i: string, x: number, y: number, { e, node }: GridDragEvent) {
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols } = this.props;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    // Create placeholder (display only)
    var placeholder = {
      i: i,
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      placeholder: true
    };

    // Move the element to the dragged location.
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      this.props.preventCollision,
      this.compactType(),
      cols
    );

    this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);

    this.setState({
      layout: compact(layout, this.compactType(), cols),
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
  onDragStop(i: string, x: number, y: number, { e, node }: GridDragEvent) {
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols, preventCollision } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) return;

    // Move the element here
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      preventCollision,
      this.compactType(),
      cols
    );

    this.props.onDragStop(layout, oldDragItem, l, null, e, node);

    // Set state
    const newLayout = compact(layout, this.compactType(), cols);
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldDragItem: null,
      oldLayout: null
    });

    this.onLayoutMaybeChanged(newLayout, oldLayout);
  }

  onLayoutMaybeChanged(newLayout: Layout, oldLayout: ?Layout) {
    if (!oldLayout) oldLayout = this.state.layout;
    if (!isEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }

  onResizeStart(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
    const { layout } = this.state;
    var l = getLayoutItem(layout, i);
    const placeholder = this.state.activeDrag;
    if (!l) return;

    this.setState({
      oldResizeItem: cloneLayoutItem(l),
      oldLayout: this.state.layout
    });

    this.props.onResizeStart(layout, l, l, null, e, node);
  }

  onResize(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
    const { layout, oldResizeItem } = this.state;
    const { cols, preventCollision } = this.props;
    var l = getLayoutItem(layout, i);
    if (!l) return;

    // Short circuit if there is a collision in no rearrangement mode.
    if (preventCollision && getFirstCollision(layout, { ...l, w, h })) {
      return;
    }

    // Set new width and height.
    l.w = w;
    l.h = h;

    // Create placeholder element (display only)
    var placeholder = {
      w: w,
      h: h,
      x: l.x,
      y: l.y,
      static: true,
      i: i
    };

    this.props.onResize(layout, oldResizeItem, l, placeholder, e, node);

    // Re-compact the layout and set the drag placeholder.
    this.setState({
      layout: compact(layout, this.compactType(), cols),
      activeDrag: placeholder
    });
  }

  onResizeStop(i: string, w: number, h: number, { e, node }: GridResizeEvent) {
    const { layout, oldResizeItem } = this.state;
    const { cols } = this.props;
    var l = getLayoutItem(layout, i);

    this.props.onResizeStop(layout, oldResizeItem, l, null, e, node);

    // Set state
    const newLayout = compact(layout, this.compactType(), cols);
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldResizeItem: null,
      oldLayout: null
    });

    this.onLayoutMaybeChanged(newLayout, oldLayout);
  }

  /**
   * Create a placeholder object.
   * @return {Element} Placeholder div.
   */
  placeholder(): ?ReactElement<any> {
    const { activeDrag } = this.state;
    if (!activeDrag) return null;
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
      useCSSTransforms
    } = this.props;

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
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        isDraggable={false}
        isResizable={false}
        useCSSTransforms={useCSSTransforms}
      >
        <div />
      </GridItem>
    );
  }

  /**
   * Given a grid item, set its style attributes & surround in a <Draggable>.
   * @param  {Element} child React element.
   * @return {Element}       Element wrapped in draggable and properly placed.
   */
  processGridItem(child: ReactElement<any>): ?ReactElement<any> {
    if (!child || !child.key) return;
    const l = getLayoutItem(this.state.layout, String(child.key));
    if (!l) return null;
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
      isDraggable,
      isResizable,
      useCSSTransforms,
      draggableCancel,
      draggableHandle
    } = this.props;
    const { mounted } = this.state;

    // Parse 'static'. Any properties defined directly on the grid item will take precedence.
    const draggable = Boolean(
      !l.static && isDraggable && (l.isDraggable || l.isDraggable == null)
    );
    const resizable = Boolean(
      !l.static && isResizable && (l.isResizable || l.isResizable == null)
    );

    return (
      <GridItem
        containerWidth={width}
        cols={cols}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
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
    const { className, style } = this.props;

    const mergedClassName = classNames("react-grid-layout", className);
    const mergedStyle = {
      height: this.containerHeight(),
      ...style
    };

    return (
      <div className={mergedClassName} style={mergedStyle}>
        {React.Children.map(this.props.children, child =>
          this.processGridItem(child)
        )}
        {this.placeholder()}
      </div>
    );
  }
}
