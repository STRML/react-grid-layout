// @flow
import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { DraggableCore } from "react-draggable";
import { Resizable } from "react-resizable";
import { perc, setTopLeft, setTransform } from "./utils";
import classNames from "classnames";
import type { Element as ReactElement, Node as ReactNode } from "react";

import type {
  ReactDraggableCallbackData,
  GridDragEvent,
  GridResizeEvent,
  DroppingPosition,
  Position
} from "./utils";

type PartialPosition = { top: number, left: number };
type GridItemCallback<Data: GridDragEvent | GridResizeEvent> = (
  i: string,
  w: number,
  h: number,
  Data
) => void;

type State = {
  resizing: ?{ width: number, height: number },
  dragging: ?{ top: number, left: number },
  className: string
};

type Props = {
  children: ReactElement<any>,
  cols: number,
  containerWidth: number,
  margin: [number, number],
  containerPadding: [number, number],
  rowHeight: number,
  maxRows: number,
  isDraggable: boolean,
  isResizable: boolean,
  static?: boolean,
  resizableAxis?: "both" | "x" | "y",
  useCSSTransforms?: boolean,
  usePercentages?: boolean,
  transformScale: number,
  droppingPosition?: DroppingPosition,

  className: string,
  style?: Object,
  // Draggability
  cancel: string,
  handle: string,

  x: number,
  y: number,
  w: number,
  h: number,

  minW: number,
  maxW: number,
  minH: number,
  maxH: number,
  i: string,

  onDrag?: GridItemCallback<GridDragEvent>,
  onDragStart?: GridItemCallback<GridDragEvent>,
  onDragStop?: GridItemCallback<GridDragEvent>,
  onResize?: GridItemCallback<GridResizeEvent>,
  onResizeStart?: GridItemCallback<GridResizeEvent>,
  onResizeStop?: GridItemCallback<GridResizeEvent>
};

/**
 * An individual item within a ReactGridLayout.
 */
export default class GridItem extends React.Component<Props, State> {
  static propTypes = {
    // Children must be only a single element
    children: PropTypes.element,

    // General grid attributes
    cols: PropTypes.number.isRequired,
    containerWidth: PropTypes.number.isRequired,
    rowHeight: PropTypes.number.isRequired,
    margin: PropTypes.array.isRequired,
    maxRows: PropTypes.number.isRequired,
    containerPadding: PropTypes.array.isRequired,

    // These are all in grid units
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    w: PropTypes.number.isRequired,
    h: PropTypes.number.isRequired,

    // All optional
    minW: function(props: Props, propName: string) {
      const value = props[propName];
      if (typeof value !== "number") return new Error("minWidth not Number");
      if (value > props.w || value > props.maxW)
        return new Error("minWidth larger than item width/maxWidth");
    },

    maxW: function(props: Props, propName: string) {
      const value = props[propName];
      if (typeof value !== "number") return new Error("maxWidth not Number");
      if (value < props.w || value < props.minW)
        return new Error("maxWidth smaller than item width/minWidth");
    },

    minH: function(props: Props, propName: string) {
      const value = props[propName];
      if (typeof value !== "number") return new Error("minHeight not Number");
      if (value > props.h || value > props.maxH)
        return new Error("minHeight larger than item height/maxHeight");
    },

    maxH: function(props: Props, propName: string) {
      const value = props[propName];
      if (typeof value !== "number") return new Error("maxHeight not Number");
      if (value < props.h || value < props.minH)
        return new Error("maxHeight smaller than item height/minHeight");
    },

    // ID is nice to have for callbacks
    i: PropTypes.string.isRequired,

    // Functions
    onDragStop: PropTypes.func,
    onDragStart: PropTypes.func,
    onDrag: PropTypes.func,
    onResizeStop: PropTypes.func,
    onResizeStart: PropTypes.func,
    onResize: PropTypes.func,

    // Flags
    isDraggable: PropTypes.bool.isRequired,
    isResizable: PropTypes.bool.isRequired,
    static: PropTypes.bool,

    // Use CSS transforms instead of top/left
    useCSSTransforms: PropTypes.bool.isRequired,
    transformScale: PropTypes.number,

    // Others
    className: PropTypes.string,
    // Selector for draggable handle
    handle: PropTypes.string,
    // Selector for draggable cancel (see react-draggable)
    cancel: PropTypes.string,
    // Current position of a dropping element
    droppingPosition: PropTypes.shape({
      e: PropTypes.object.isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    }),
    resizableAxis: PropTypes.oneOf(["both", "x", "y"])
  };

  static defaultProps = {
    className: "",
    cancel: "",
    handle: "",
    minH: 1,
    minW: 1,
    maxH: Infinity,
    maxW: Infinity,
    transformScale: 1,
    resizableAxis: "both"
  };

  state: State = {
    resizing: null,
    dragging: null,
    className: ""
  };

  currentNode: HTMLElement;

  componentDidUpdate(prevProps: Props) {
    if (this.props.droppingPosition && prevProps.droppingPosition) {
      this.moveDroppingItem(prevProps);
    }
  }

  moveDroppingItem(prevProps: Props) {
    const { droppingPosition } = this.props;
    const { dragging } = this.state;

    if (!droppingPosition || !prevProps.droppingPosition) {
      return;
    }

    if (!this.currentNode) {
      // eslint-disable-next-line react/no-find-dom-node
      this.currentNode = ((ReactDOM.findDOMNode(this): any): HTMLElement);
    }

    const shouldDrag =
      (dragging && droppingPosition.x !== prevProps.droppingPosition.x) ||
      droppingPosition.y !== prevProps.droppingPosition.y;

    if (!dragging) {
      this.onDragStart(droppingPosition.e, {
        node: this.currentNode,
        deltaX: droppingPosition.x,
        deltaY: droppingPosition.y
      });
    } else if (shouldDrag) {
      const deltaX = droppingPosition.x - dragging.left;
      const deltaY = droppingPosition.y - dragging.top;

      this.onDrag(droppingPosition.e, {
        node: this.currentNode,
        deltaX,
        deltaY
      });
    }
  }

  // Helper for generating column width
  calcColWidth(): number {
    const { margin, containerPadding, containerWidth, cols } = this.props;
    return (
      (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
    );
  }

  /**
   * Return position on the page given an x, y, w, h.
   * left, top, width, height are all in pixels.
   * @param  {Number}  x             X coordinate in grid units.
   * @param  {Number}  y             Y coordinate in grid units.
   * @param  {Number}  w             W coordinate in grid units.
   * @param  {Number}  h             H coordinate in grid units.
   * @return {Object}                Object containing coords.
   */
  calcPosition(
    x: number,
    y: number,
    w: number,
    h: number,
    state: ?Object
  ): Position {
    const { margin, containerPadding, rowHeight } = this.props;
    const colWidth = this.calcColWidth();
    const out = {};

    // If resizing, use the exact width and height as returned from resizing callbacks.
    if (state && state.resizing) {
      out.width = Math.round(state.resizing.width);
      out.height = Math.round(state.resizing.height);
    }
    // Otherwise, calculate from grid units.
    else {
      // 0 * Infinity === NaN, which causes problems with resize constraints;
      // Fix this if it occurs.
      // Note we do it here rather than later because Math.round(Infinity) causes deopt
      out.width =
        w === Infinity
          ? w
          : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]);
      out.height =
        h === Infinity
          ? h
          : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1]);
    }

    // If dragging, use the exact width and height as returned from dragging callbacks.
    if (state && state.dragging) {
      out.top = Math.round(state.dragging.top);
      out.left = Math.round(state.dragging.left);
    }
    // Otherwise, calculate from grid units.
    else {
      out.top = Math.round((rowHeight + margin[1]) * y + containerPadding[1]);
      out.left = Math.round((colWidth + margin[0]) * x + containerPadding[0]);
    }

    return out;
  }

  /**
   * Translate x and y coordinates from pixels to grid units.
   * @param  {Number} top  Top position (relative to parent) in pixels.
   * @param  {Number} left Left position (relative to parent) in pixels.
   * @return {Object} x and y in grid units.
   */
  calcXY(top: number, left: number): { x: number, y: number } {
    const { margin, cols, rowHeight, w, h, maxRows } = this.props;
    const colWidth = this.calcColWidth();

    // left = colWidth * x + margin * (x + 1)
    // l = cx + m(x+1)
    // l = cx + mx + m
    // l - m = cx + mx
    // l - m = x(c + m)
    // (l - m) / (c + m) = x
    // x = (left - margin) / (coldWidth + margin)
    let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
    let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

    // Capping
    x = Math.max(Math.min(x, cols - w), 0);
    y = Math.max(Math.min(y, maxRows - h), 0);

    return { x, y };
  }

  /**
   * Given a height and width in pixel values, calculate grid units.
   * @param  {Number} height Height in pixels.
   * @param  {Number} width  Width in pixels.
   * @return {Object} w, h as grid units.
   */
  calcWH({
    height,
    width
  }: {
    height: number,
    width: number
  }): { w: number, h: number } {
    const { margin, maxRows, cols, rowHeight, x, y } = this.props;
    const colWidth = this.calcColWidth();

    // width = colWidth * w - (margin * (w - 1))
    // ...
    // w = (width + margin) / (colWidth + margin)
    let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
    let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

    // Capping
    w = Math.max(Math.min(w, cols - x), 0);
    h = Math.max(Math.min(h, maxRows - y), 0);
    return { w, h };
  }

  /**
   * This is where we set the grid item's absolute placement. It gets a little tricky because we want to do it
   * well when server rendering, and the only way to do that properly is to use percentage width/left because
   * we don't know exactly what the browser viewport is.
   * Unfortunately, CSS Transforms, which are great for performance, break in this instance because a percentage
   * left is relative to the item itself, not its container! So we cannot use them on the server rendering pass.
   *
   * @param  {Object} pos Position object with width, height, left, top.
   * @return {Object}     Style object.
   */
  createStyle(pos: Position): { [key: string]: ?string } {
    const { usePercentages, containerWidth, useCSSTransforms } = this.props;

    let style;
    // CSS Transforms support (default)
    if (useCSSTransforms) {
      style = setTransform(pos);
    } else {
      // top,left (slow)
      style = setTopLeft(pos);

      // This is used for server rendering.
      if (usePercentages) {
        style.left = perc(pos.left / containerWidth);
        style.width = perc(pos.width / containerWidth);
      }
    }

    return style;
  }

  /**
   * Mix a Draggable instance into a child.
   * @param  {Element} child    Child element.
   * @return {Element}          Child wrapped in Draggable.
   */
  mixinDraggable(child: ReactElement<any>): ReactElement<any> {
    return (
      <DraggableCore
        onStart={this.onDragStart}
        onDrag={this.onDrag}
        onStop={this.onDragStop}
        handle={this.props.handle}
        cancel={
          ".react-resizable-handle" +
          (this.props.cancel ? "," + this.props.cancel : "")
        }
        scale={this.props.transformScale}
      >
        {child}
      </DraggableCore>
    );
  }

  /**
   * Mix a Resizable instance into a child.
   * @param  {Element} child    Child element.
   * @param  {Object} position  Position object (pixel values)
   * @return {Element}          Child wrapped in Resizable.
   */
  mixinResizable(
    child: ReactElement<any>,
    position: Position
  ): ReactElement<any> {
    const {
      cols,
      x,
      minW,
      minH,
      maxW,
      maxH,
      transformScale,
      resizableAxis
    } = this.props;

    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

    // Calculate min/max constraints using our min & maxes
    const mins = this.calcPosition(0, 0, minW, minH);
    const maxes = this.calcPosition(0, 0, maxW, maxH);
    const minConstraints = [mins.width, mins.height];
    const maxConstraints = [
      Math.min(maxes.width, maxWidth),
      Math.min(maxes.height, Infinity)
    ];
    return (
      <Resizable
        width={position.width}
        height={position.height}
        minConstraints={minConstraints}
        maxConstraints={maxConstraints}
        onResizeStop={this.onResizeStop}
        onResizeStart={this.onResizeStart}
        onResize={this.onResize}
        transformScale={transformScale}
        axis={resizableAxis}
      >
        {child}
      </Resizable>
    );
  }

  /**
   * onDragStart event handler
   * @param  {Event}  e             event data
   * @param  {Object} callbackData  an object with node, delta and position information
   */
  onDragStart = (e: Event, { node }: ReactDraggableCallbackData) => {
    if (!this.props.onDragStart) return;

    const newPosition: PartialPosition = { top: 0, left: 0 };

    // TODO: this wont work on nested parents
    const { offsetParent } = node;
    if (!offsetParent) return;
    const parentRect = offsetParent.getBoundingClientRect();
    const clientRect = node.getBoundingClientRect();
    const cLeft = clientRect.left / this.props.transformScale;
    const pLeft = parentRect.left / this.props.transformScale;
    const cTop = clientRect.top / this.props.transformScale;
    const pTop = parentRect.top / this.props.transformScale;
    newPosition.left = cLeft - pLeft + offsetParent.scrollLeft;
    newPosition.top = cTop - pTop + offsetParent.scrollTop;
    this.setState({ dragging: newPosition });

    const { x, y } = this.calcXY(newPosition.top, newPosition.left);

    return (
      this.props.onDragStart &&
      this.props.onDragStart.call(this, this.props.i, x, y, {
        e,
        node,
        newPosition
      })
    );
  };

  /**
   * onDrag event handler
   * @param  {Event}  e             event data
   * @param  {Object} callbackData  an object with node, delta and position information
   */
  onDrag = (e: Event, { node, deltaX, deltaY }: ReactDraggableCallbackData) => {
    if (!this.props.onDrag) return;
    deltaX /= this.props.transformScale;
    deltaY /= this.props.transformScale;

    const newPosition: PartialPosition = { top: 0, left: 0 };

    if (!this.state.dragging)
      throw new Error("onDrag called before onDragStart.");
    newPosition.left = this.state.dragging.left + deltaX;
    newPosition.top = this.state.dragging.top + deltaY;
    this.setState({ dragging: newPosition });

    const { x, y } = this.calcXY(newPosition.top, newPosition.left);

    return (
      this.props.onDrag &&
      this.props.onDrag.call(this, this.props.i, x, y, {
        e,
        node,
        newPosition
      })
    );
  };

  /**
   * onDragStop event handler
   * @param  {Event}  e             event data
   * @param  {Object} callbackData  an object with node, delta and position information
   */
  onDragStop = (e: Event, { node }: ReactDraggableCallbackData) => {
    if (!this.props.onDragStop) return;

    const newPosition: PartialPosition = { top: 0, left: 0 };

    if (!this.state.dragging)
      throw new Error("onDragEnd called before onDragStart.");
    newPosition.left = this.state.dragging.left;
    newPosition.top = this.state.dragging.top;
    this.setState({ dragging: null });

    const { x, y } = this.calcXY(newPosition.top, newPosition.left);

    return (
      this.props.onDragStop &&
      this.props.onDragStop.call(this, this.props.i, x, y, {
        e,
        node,
        newPosition
      })
    );
  };

  /**
   * onResizeStop event handler
   * @param  {Event}  e             event data
   * @param  {Object} callbackData  an object with node and size information
   */
  onResizeStop = (
    e: Event,
    callbackData: { node: HTMLElement, size: Position }
  ) => {
    this.onResizeHandler(e, callbackData, "onResizeStop");
  };

  /**
   * onResizeStart event handler
   * @param  {Event}  e             event data
   * @param  {Object} callbackData  an object with node and size information
   */
  onResizeStart = (
    e: Event,
    callbackData: { node: HTMLElement, size: Position }
  ) => {
    this.onResizeHandler(e, callbackData, "onResizeStart");
  };

  /**
   * onResize event handler
   * @param  {Event}  e             event data
   * @param  {Object} callbackData  an object with node and size information
   */
  onResize = (
    e: Event,
    callbackData: { node: HTMLElement, size: Position }
  ) => {
    this.onResizeHandler(e, callbackData, "onResize");
  };

  /**
   * Wrapper around drag events to provide more useful data.
   * All drag events call the function with the given handler name,
   * with the signature (index, x, y).
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  onResizeHandler(
    e: Event,
    { node, size }: { node: HTMLElement, size: Position },
    handlerName: string
  ) {
    const handler = this.props[handlerName];
    if (!handler) return;
    const { cols, x, i, maxW, minW, maxH, minH } = this.props;

    // Get new XY
    let { w, h } = this.calcWH(size);

    // Cap w at numCols
    w = Math.min(w, cols - x);
    // Ensure w is at least 1
    w = Math.max(w, 1);

    // Min/max capping
    w = Math.max(Math.min(w, maxW), minW);
    h = Math.max(Math.min(h, maxH), minH);

    this.setState({ resizing: handlerName === "onResizeStop" ? null : size });

    handler.call(this, i, w, h, { e, node, size });
  }

  render(): ReactNode {
    const {
      x,
      y,
      w,
      h,
      isDraggable,
      isResizable,
      droppingPosition,
      useCSSTransforms
    } = this.props;

    const pos = this.calcPosition(x, y, w, h, this.state);
    const child = React.Children.only(this.props.children);

    // Create the child element. We clone the existing element but modify its className and style.
    let newChild = React.cloneElement(child, {
      className: classNames(
        "react-grid-item",
        child.props.className,
        this.props.className,
        {
          static: this.props.static,
          resizing: Boolean(this.state.resizing),
          "react-draggable": isDraggable,
          "react-draggable-dragging": Boolean(this.state.dragging),
          dropping: Boolean(droppingPosition),
          cssTransforms: useCSSTransforms
        }
      ),
      // We can set the width and height on the child, but unfortunately we can't set the position.
      style: {
        ...this.props.style,
        ...child.props.style,
        ...this.createStyle(pos)
      }
    });

    // Resizable support. This is usually on but the user can toggle it off.
    if (isResizable) newChild = this.mixinResizable(newChild, pos);

    // Draggable support. This is always on, except for with placeholders.
    if (isDraggable) newChild = this.mixinDraggable(newChild);

    return newChild;
  }
}
