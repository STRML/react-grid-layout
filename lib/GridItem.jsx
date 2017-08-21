// @flow
import React from 'react';
import PropTypes from 'prop-types';
import {DraggableCore} from 'react-draggable';
import {Resizable} from 'react-resizable';
import {perc, setTopLeft, setTransform, isUnitRelative, getViewportSize} from './utils';
import classNames from 'classnames';

import type {DragCallbackData, Position} from './utils';

type State = {
  resizing: ?{width: number, height: number},
  dragging: ?{top: number, left: number},
  className: string
};

/**
 * An individual item within a ReactGridLayout.
 */
export default class GridItem extends React.Component {

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

    // Defines the unit to use (using vw, vh will size elements relatively)
    unit: PropTypes.string,

    // These are all in grid units
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    w: PropTypes.number.isRequired,
    h: PropTypes.number.isRequired,

    // All optional
    minW: function (props, propName) {
      const value = props[propName];
      if (typeof value !== 'number') return new Error('minWidth not Number');
      if (value > props.w || value > props.maxW) return new Error('minWidth larger than item width/maxWidth');
    },

    maxW: function (props, propName) {
      const value = props[propName];
      if (typeof value !== 'number') return new Error('maxWidth not Number');
      if (value < props.w || value < props.minW) return new Error('maxWidth smaller than item width/minWidth');
    },

    minH: function (props, propName) {
      const value = props[propName];
      if (typeof value !== 'number') return new Error('minHeight not Number');
      if (value > props.h || value > props.maxH) return new Error('minHeight larger than item height/maxHeight');
    },

    maxH: function (props, propName) {
      const value = props[propName];
      if (typeof value !== 'number') return new Error('maxHeight not Number');
      if (value < props.h || value < props.minH) return new Error('maxHeight smaller than item height/minHeight');
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

    // Others
    className: PropTypes.string,
    // Selector for draggable handle
    handle: PropTypes.string,
    // Selector for draggable cancel (see react-draggable)
    cancel: PropTypes.string
  };

  static defaultProps = {
    className: '',
    unit: 'px',
    cancel: '',
    minH: 1,
    minW: 1,
    maxH: Infinity,
    maxW: Infinity
  };

  state: State = {
    resizing: null,
    dragging: null,
    className: ''
  };

  // Helper for generating column width
  calcColWidth(): number {
    const {margin, containerPadding, cols, containerWidth, unit} = this.props;

    let relatedContainerWidth = containerWidth;
    // If relative to viewport, calculate the colWidth based on a relative containerWidth
    if (isUnitRelative(unit)) {
      const viewPortSize = getViewportSize(unit);
      relatedContainerWidth = containerWidth * 100 / viewPortSize;
    }
    return (relatedContainerWidth - (margin[0] * (cols - 1)) - (containerPadding[0] * 2)) / cols;
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
  calcPosition(x: number, y: number, w: number, h: number, state: ?Object): Position {
    const {margin, containerPadding, rowHeight, unit} = this.props;
    const colWidth = this.calcColWidth();
    const viewPortSize = getViewportSize(unit);

    const out = {
      left: (colWidth + margin[0]) * x + containerPadding[0],
      top: (rowHeight + margin[1]) * y + containerPadding[1],
      // 0 * Infinity === NaN, which causes problems with resize constraints;
      // Fix this if it occurs.
      // Note we do it here rather than later because Infinity) causes deopt
      width: w === Infinity ? w : colWidth * w + Math.max(0, w - 1) * margin[0],
      height: h === Infinity ? h : rowHeight * h + Math.max(0, h - 1) * margin[1]
    };

    if (state && state.resizing) {
      out.width = state.resizing.width;
      out.height = state.resizing.height;
    }

    if (state && state.dragging) {
      out.top = state.dragging.top;
      out.left = state.dragging.left;
      // If relative to viewport, calculate from px to its relative value
      if (isUnitRelative(unit)) {
        out.top = (out.top * 100 / viewPortSize);
        out.left = (out.left * 100 / viewPortSize);
      }
    }

    return out;
  }

  /**
   * Translate x and y coordinates from pixels to grid units.
   * @param  {Number} top  Top position (relative to parent) in pixels.
   * @param  {Number} left Left position (relative to parent) in pixels.
   * @return {Object} x and y in grid units.
   */
  calcXY(top: number, left: number): {x: number, y: number} {
    const {margin, cols, rowHeight, w, h, maxRows, unit} = this.props;
    const colWidth = this.calcColWidth();
    const viewPortSize = getViewportSize(unit);

    // If relative to viewport, calculate from px to its relative value
    if (isUnitRelative(unit)) {
      left = (left * 100 / viewPortSize);
      top = (top * 100 / viewPortSize);
    }

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

    return {x, y};
  }

  /**
   * Given a height and width in pixel values, calculate grid units.
   * @param  {Number} height Height in pixels.
   * @param  {Number} width  Width in pixels.
   * @return {Object} w, h as grid units.
   */
  calcWH({height, width}: {height: number, width: number}): {w: number, h: number} {
    const {margin, maxRows, cols, rowHeight, x, y} = this.props;
    const colWidth = this.calcColWidth();

    // width = colWidth * w - (margin * (w - 1))
    // ...
    // w = (width + margin) / (colWidth + margin)
    let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
    let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

    // Capping
    w = Math.max(Math.min(w, cols - x), 0);
    h = Math.max(Math.min(h, maxRows - y), 0);
    return {w, h};
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
  createStyle(pos: Position): {[key: string]: ?string} {
    const {usePercentages, containerWidth, useCSSTransforms} = this.props;

    let style;
    // CSS Transforms support (default)
    if (useCSSTransforms) {
      style = setTransform(pos, this.props.unit);
    }
    // top,left (slow)
    else {
      style = setTopLeft(pos, this.props.unit);

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
  mixinDraggable(child: React.Element<any>): React.Element<any> {
    return (
      <DraggableCore
        onStart={this.onDragHandler('onDragStart')}
        onDrag={this.onDragHandler('onDrag')}
        onStop={this.onDragHandler('onDragStop')}
        handle={this.props.handle}
        cancel={".react-resizable-handle" + (this.props.cancel ? "," + this.props.cancel : "")}>
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
  mixinResizable(child: React.Element<any>, position: Position): React.Element<any> {
    const {cols, x, minW, minH, maxW, maxH, unit} = this.props;
    const viewPortSize = getViewportSize(unit);

    // This is the max possible width - doesn't go to infinity because of the width of the window
    let maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

    // If relative to viewport, calculate from px to its relative value
    if (isUnitRelative(unit)) {
      maxWidth = maxWidth * viewPortSize / 100;
    }

    // Calculate min/max constraints using our min & maxes
    const mins = this.calcPosition(0, 0, minW, minH);
    if (isUnitRelative(unit)) {
      mins.width = mins.width * viewPortSize / 100;
      mins.height = mins.height * viewPortSize / 100;
    }
    const maxes = this.calcPosition(0, 0, maxW, maxH);
    if (isUnitRelative(unit)) {
      maxes.width = maxes.width * viewPortSize / 100;
      maxes.height = maxes.height * viewPortSize / 100;
    }
    const minConstraints = [mins.width, mins.height];
    const maxConstraints = [Math.min(maxes.width, maxWidth), Math.min(maxes.height, Infinity)];

    if (isUnitRelative(unit)) {
      position.width = position.width * viewPortSize / 100;
      position.height = position.height * viewPortSize / 100;
    }

    return (
      <Resizable
        width={position.width}
        height={position.height}
        minConstraints={minConstraints}
        maxConstraints={maxConstraints}
        onResizeStop={this.onResizeHandler('onResizeStop')}
        onResizeStart={this.onResizeHandler('onResizeStart')}
        onResize={this.onResizeHandler('onResize')}>
        {child}
      </Resizable>
    );
  }

  /**
   * Wrapper around drag events to provide more useful data.
   * All drag events call the function with the given handler name,
   * with the signature (index, x, y).
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  onDragHandler(handlerName:string) {
    return (e:Event, {node, deltaX, deltaY}: DragCallbackData) => {
      if (!this.props[handlerName]) return;

      const newPosition: {top: number, left: number} = {top: 0, left: 0};

      // Get new XY
      switch (handlerName) {
        case 'onDragStart': {
          // ToDo this wont work on nested parents
          const parentRect = node.offsetParent.getBoundingClientRect();
          const clientRect = node.getBoundingClientRect();
          newPosition.left = clientRect.left - parentRect.left + node.offsetParent.scrollLeft;
          newPosition.top = clientRect.top - parentRect.top + node.offsetParent.scrollTop;
          this.setState({dragging: newPosition});
          break;
        }
        case 'onDrag':
          if (!this.state.dragging) throw new Error('onDrag called before onDragStart.');
          newPosition.left = this.state.dragging.left + deltaX;
          newPosition.top = this.state.dragging.top + deltaY;
          this.setState({dragging: newPosition});
          break;
        case 'onDragStop':
          if (!this.state.dragging) throw new Error('onDragEnd called before onDragStart.');
          newPosition.left = this.state.dragging.left;
          newPosition.top = this.state.dragging.top;
          this.setState({dragging: null});
          break;
        default:
          throw new Error('onDragHandler called with unrecognized handlerName: ' + handlerName);
      }

      const {x, y} = this.calcXY(newPosition.top, newPosition.left);

      this.props[handlerName](this.props.i, x, y, {e, node, newPosition});
    };
  }

  /**
   * Wrapper around drag events to provide more useful data.
   * All drag events call the function with the given handler name,
   * with the signature (index, x, y).
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  onResizeHandler(handlerName: string) {
    return (e:Event, {node, size}: {node: HTMLElement, size: Position}) => {
      if (!this.props[handlerName]) return;
      const {cols, x, i, maxW, minW, maxH, minH, unit} = this.props;
      const viewPortSize = getViewportSize(unit);

      // If relative to viewport, calculate from px to its relative value
      if (isUnitRelative(unit)) {
        size.width = (size.width * 100 / viewPortSize);
        size.height = (size.height * 100 / viewPortSize);
      }

      // Get new XY
      let {w, h} = this.calcWH(size);

      // Cap w at numCols
      w = Math.min(w, cols - x);
      // Ensure w is at least 1
      w = Math.max(w, 1);

      // Min/max capping
      w = Math.max(Math.min(w, maxW), minW);
      h = Math.max(Math.min(h, maxH), minH);

      this.setState({resizing: handlerName === 'onResizeStop' ? null : size});

      this.props[handlerName](i, w, h, {e, node, size});
    };
  }

  render(): React.Element<any> {
    const {x, y, w, h, isDraggable, isResizable, useCSSTransforms} = this.props;

    const pos = this.calcPosition(x, y, w, h, this.state);
    const child = React.Children.only(this.props.children);

    // Create the child element. We clone the existing element but modify its className and style.
    let newChild = React.cloneElement(child, {
      className: classNames('react-grid-item', child.props.className, this.props.className, {
        static: this.props.static,
        resizing: Boolean(this.state.resizing),
        'react-draggable': isDraggable,
        'react-draggable-dragging': Boolean(this.state.dragging),
        cssTransforms: useCSSTransforms
      }),
      // We can set the width and height on the child, but unfortunately we can't set the position.
      style: {...this.props.style, ...child.props.style, ...this.createStyle(pos)}
    });

    // Resizable support. This is usually on but the user can toggle it off.
    if (isResizable) newChild = this.mixinResizable(newChild, pos);

    // Draggable support. This is always on, except for with placeholders.
    if (isDraggable) newChild = this.mixinDraggable(newChild);

    return newChild;
  }
}
