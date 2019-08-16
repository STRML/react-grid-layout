// @flow
import React, { useState, useEffect, memo } from "react";
import PropTypes from "prop-types";
import isEqual from "lodash.isequal";
import classNames from "classnames";
import {
  bottom,
  childrenEqual,
  cloneLayoutItem,
  compact,
  getLayoutItem,
  moveElement,
  synchronizeLayoutWithChildren,
  validateLayout,
  getAllCollisions,
  noop
} from "./utils";
import GridItem from "./GridItem";
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
  LayoutItem
} from "./utils";

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
const ReactGridLayout = ({
  className,
  style,
  width,
  autoSize,
  cols,
  draggableCancel,
  draggableHandle,
  verticalCompact,
  compactType,
  layout,
  margin,
  containerPadding,
  rowHeight,
  maxRows,
  isDraggable,
  isResizable,
  preventCollision,
  useCSSTransforms,
  onLayoutChange,
  onDrag,
  onDragStart,
  onDragStop,
  onResize,
  onResizeStart,
  onResizeStop,
  children
}: Props) => {
  const compactTypeHandler = (
    verticalCompact: boolean,
    compactType: ?"horizontal" | "vertical"
  ): CompactType => (verticalCompact === false ? null : compactType);

  // State
  const [activeDrag, setActiveDrag]: [?LayoutItem, Function] = useState(
    () => null
  );
  const [localLayout, setLocalLayout]: [Layout, Function] = useState(
    synchronizeLayoutWithChildren(
      layout,
      children,
      cols,
      // Legacy support for verticalCompact: false
      compactTypeHandler(verticalCompact, compactType)
    )
  );
  const [mounted, setMounted]: [boolean, Function] = useState(() => false);
  const [oldDragItem, setOldDragItem]: [?LayoutItem, Function] = useState(
    () => null
  );
  const [oldLayout, setOldLayout]: [?Layout, Function] = useState(() => null);
  const [oldResizeItem, setOldResizeItem]: [?LayoutItem, Function] = useState(
    () => null
  );

  const onLayoutMaybeChanged = (newLayout: Layout, oldLayout: ?Layout) => {
    if (!oldLayout) oldLayout = localLayout;
    if (!isEqual(oldLayout, newLayout)) {
      setLocalLayout(newLayout);
      onLayoutChange(newLayout);
    }
  };

  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  const containerHeight = () => {
    if (!autoSize) return;
    const nbRow = bottom(localLayout);
    const containerPaddingY = containerPadding
      ? containerPadding[1]
      : margin[1];
    return (
      nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + "px"
    );
  };

  /**
   * When dragging starts
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  const onDragStartHandler = (
    i: string,
    x: number,
    y: number,
    { e, node }: GridDragEvent
  ) => {
    const l = getLayoutItem(localLayout, i);
    if (!l) return;

    setOldDragItem(cloneLayoutItem(l));
    setOldLayout(localLayout);

    return onDragStart(localLayout, l, l, null, e, node);
  };

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  const onDragHandler = (
    i: string,
    x: number,
    y: number,
    { e, node }: GridDragEvent
  ) => {
    let layout = localLayout;
    const l = getLayoutItem(layout, i);
    if (!l) return;

    // Create placeholder (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      placeholder: true,
      i: i
    };

    // Move the element to the dragged location.
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      preventCollision,
      compactTypeHandler(verticalCompact, compactType),
      cols
    );

    onDrag(layout, oldDragItem, l, placeholder, e, node);

    setLocalLayout(
      compact(layout, compactTypeHandler(verticalCompact, compactType), cols)
    );
    setActiveDrag(placeholder);
  };

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param  {String} i Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  const onDragStopHandler = (
    i: string,
    x: number,
    y: number,
    { e, node }: GridDragEvent
  ) => {
    let layout = localLayout;
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
      compactTypeHandler(verticalCompact, compactType),
      cols
    );

    onDragStop(layout, oldDragItem, l, null, e, node);

    // Set state
    const newLayout = compact(
      layout,
      compactTypeHandler(verticalCompact, compactType),
      cols
    );
    setActiveDrag(null);
    setLocalLayout(newLayout);
    setOldDragItem(null);
    setOldLayout(null);

    onLayoutMaybeChanged(newLayout, oldLayout);
  };

  const onResizeStartHandler = (
    i: string,
    w: number,
    h: number,
    { e, node }: GridResizeEvent
  ) => {
    const l = getLayoutItem(localLayout, i);
    if (!l) return;

    setOldResizeItem(cloneLayoutItem(l));
    setOldLayout(localLayout);

    onResizeStart(localLayout, l, l, null, e, node);
  };

  const onResizeHandler = (
    i: string,
    w: number,
    h: number,
    { e, node }: GridResizeEvent
  ) => {
    const l: ?LayoutItem = getLayoutItem(localLayout, i);
    if (!l) return;

    // Something like quad tree should be used
    // to find collisions faster
    let hasCollisions;
    if (preventCollision) {
      const collisions = getAllCollisions(localLayout, { ...l, w, h }).filter(
        layoutItem => layoutItem.i !== l.i
      );
      hasCollisions = collisions.length > 0;

      // If we're colliding, we need adjust the placeholder.
      if (hasCollisions) {
        // adjust w && h to maximum allowed space
        let leastX = Infinity,
          leastY = Infinity;
        collisions.forEach(layoutItem => {
          if (layoutItem.x > l.x) leastX = Math.min(leastX, layoutItem.x);
          if (layoutItem.y > l.y) leastY = Math.min(leastY, layoutItem.y);
        });

        if (Number.isFinite(leastX)) l.w = leastX - l.x;
        if (Number.isFinite(leastY)) l.h = leastY - l.y;
      }
    }

    if (!hasCollisions) {
      // Set new width and height.
      l.w = w;
      l.h = h;
    }

    // Create placeholder element (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      static: true,
      i: i
    };

    onResize(localLayout, oldResizeItem, l, placeholder, e, node);

    // Re-compact the layout and set the drag placeholder.
    setLocalLayout(
      compact(
        localLayout,
        compactTypeHandler(verticalCompact, compactType),
        cols
      )
    );
    setActiveDrag(placeholder);
  };

  const onResizeStopHandler = (
    i: string,
    w: number,
    h: number,
    { e, node }: GridResizeEvent
  ) => {
    const l = getLayoutItem(localLayout, i);

    onResizeStop(localLayout, oldResizeItem, l, null, e, node);

    // Set state
    const newLayout = compact(
      localLayout,
      compactTypeHandler(verticalCompact, compactType),
      cols
    );
    setActiveDrag(null);
    setLocalLayout(newLayout);
    setOldResizeItem(null);
    setOldLayout(null);

    onLayoutMaybeChanged(newLayout, oldLayout);
  };

  /**
   * Create a placeholder object.
   * @return {Element} Placeholder div.
   */
  const placeholder = (): ?ReactElement<any> => {
    if (!activeDrag) return null;
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
  };

  /**
   * Given a grid item, set its style attributes & surround in a <Draggable>.
   * @param  {Element} child React element.
   * @return {Element}       Element wrapped in draggable and properly placed.
   */
  const processGridItem = (child: ReactElement<any>): ?ReactElement<any> => {
    if (!child || !child.key) return;

    const l = getLayoutItem(localLayout, String(child.key));
    if (!l) return null;

    // Parse 'static'. Any properties defined directly on the grid item will take precedence.
    const draggable = Boolean(
      !l.static && isDraggable && (l.isDraggable || l.isDraggable == null)
    );
    const resizable = Boolean(
      !l.static && isResizable && (l.isResizable || l.isResizable == null)
    );

    return (
      <GridItem
        key={child.key}
        containerWidth={width}
        cols={cols}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        cancel={draggableCancel}
        handle={draggableHandle}
        onDragStop={onDragStopHandler}
        onDragStart={onDragStartHandler}
        onDrag={onDragHandler}
        onResizeStart={onResizeStartHandler}
        onResize={onResizeHandler}
        onResizeStop={onResizeStopHandler}
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
        isStatic={l.static}
      >
        {child}
      </GridItem>
    );
  };

  const mergedClassName = classNames("react-grid-layout", className);
  const mergedStyle = {
    height: containerHeight(),
    ...style
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Legacy support for compactType
    // Allow parent to set layout directly.
    const newLayout = synchronizeLayoutWithChildren(
      layout,
      children,
      cols,
      compactTypeHandler(verticalCompact, compactType)
    );
    onLayoutMaybeChanged(newLayout, oldLayout);
  }, [layout, compactType]);

  return (
    <div className={mergedClassName} style={mergedStyle}>
      {React.Children.map(children, child => processGridItem(child))}
      {placeholder()}
    </div>
  );
};

ReactGridLayout.defaultProps = {
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
  onLayoutChange: noop,
  onDragStart: noop,
  onDrag: noop,
  onDragStop: noop,
  onResizeStart: noop,
  onResize: noop,
  onResizeStop: noop
};

ReactGridLayout.propTypes = {
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
    const layout = props.layout;
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
    const children = props[propName];

    // Check children keys for duplicates. Throw if found.
    const keys = {};
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

// $FlowFixMe
const arePropsEqual = (prevProps: Props<>, nextProps: Props<>): boolean =>
  isEqual(nextProps.layout, prevProps.layout) &&
  nextProps.compactType === prevProps.compactType &&
  childrenEqual(prevProps.children, nextProps.children) &&
  nextProps.width === prevProps.width;

// $FlowFixMe
export default memo(ReactGridLayout, arePropsEqual);
