// @flow
import React, { useState, useEffect, memo } from "react";
import PropTypes from "prop-types";
import isEqual from "lodash.isequal";
import {
  cloneLayout,
  synchronizeLayoutWithChildren,
  validateLayout,
  noop,
  childrenEqual
} from "./utils";
import {
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  findOrGenerateResponsiveLayout
} from "./responsiveUtils";
import ReactGridLayout from "./ReactGridLayout";
import type { Props as RGLProps } from "./ReactGridLayout";
import type { Layout } from "./utils";

const type = obj => Object.prototype.toString.call(obj);

type Props<Breakpoint: string = string> = {
  ...$Exact<RGLProps>,

  // Responsive config
  breakpoint: Breakpoint,
  breakpoints: { [key: Breakpoint]: number },
  cols: { [key: Breakpoint]: number },
  layouts: { [key: Breakpoint]: Layout },
  width: number,

  // Callbacks
  onBreakpointChange: (Breakpoint, cols: number) => void,
  onLayoutChange: (Layout, { [key: Breakpoint]: Layout }) => void,
  onWidthChange: (
    containerWidth: number,
    margin: [number, number],
    cols: number,
    containerPadding: [number, number] | null
  ) => void
};

const ResponsiveReactGridLayout = ({
  breakpoint,
  breakpoints,
  cols,
  layouts,
  width,
  onBreakpointChange,
  onLayoutChange,
  onWidthChange,
  ...rest
}: Props<>) => {
  // State
  const initialBreakpoint = getBreakpointFromWidth(breakpoints, width);
  const initialCols = getColsFromBreakpoint(initialBreakpoint, cols);

  const compactType = rest.verticalCompact === false ? null : rest.compactType;

  const [localLayout, setLocalLayout]: [Layout, Function] = useState(() =>
    findOrGenerateResponsiveLayout(
      layouts,
      breakpoints,
      initialBreakpoint,
      initialBreakpoint,
      initialCols,
      compactType
    )
  );
  const [localBreakpoint, setLocalBreakpoints]: [string, Function] = useState(
    () => initialBreakpoint
  );
  const [localCols, setLocalCols]: [number, Function] = useState(
    () => initialCols
  );

  // wrap layouts so we do not need to pass layouts to child
  const onLayoutChangeHandle = (layout: Layout) => {
    onLayoutChange(layout, {
      ...layouts,
      [localBreakpoint]: layout
    });
  };

  /**
   * When the width changes work through breakpoints and reset state with the new width & breakpoint.
   * Width changes are necessary to figure out the widget widths.
   */
  const onWidthChangeHandle = () => {
    const newBreakpoint =
      breakpoint || getBreakpointFromWidth(breakpoints, width);

    const lastBreakpoint = localBreakpoint;
    const newCols: number = getColsFromBreakpoint(newBreakpoint, cols);

    // Breakpoint change
    if (lastBreakpoint !== newBreakpoint || localCols !== cols) {
      // Preserve the current layout if the current breakpoint is not present in the next layouts.
      if (!(lastBreakpoint in layouts))
        layouts[lastBreakpoint] = cloneLayout(localLayout);

      // Find or generate a new layout.
      let layout = findOrGenerateResponsiveLayout(
        layouts,
        breakpoints,
        newBreakpoint,
        lastBreakpoint,
        newCols,
        compactType
      );

      // This adds missing items.
      layout = synchronizeLayoutWithChildren(
        layout,
        rest.children,
        newCols,
        compactType
      );

      // Store the new layout.
      layouts[newBreakpoint] = layout;

      // callbacks
      onLayoutChange(layout, layouts);
      onBreakpointChange(newBreakpoint, newCols);

      setLocalLayout(layout);
      setLocalBreakpoints(newBreakpoint);
      setLocalCols(newCols);
    }
    //call onWidthChange on every change of width, not only on breakpoint changes
    onWidthChange(width, rest.margin, newCols, rest.containerPadding);
  };

  useEffect(() => {
    // Since we're setting an entirely new layout object, we must generate a new responsive layout
    // if one does not exist.
    const newLayout = findOrGenerateResponsiveLayout(
      layouts,
      breakpoints,
      localBreakpoint,
      localBreakpoint,
      cols[localBreakpoint],
      compactType
    );

    setLocalLayout(newLayout);
  }, [layouts, breakpoint, cols]);

  useEffect(() => {
    onWidthChangeHandle();
  }, [width]);

  return (
    <ReactGridLayout
      {...rest}
      width={width}
      onLayoutChange={onLayoutChangeHandle}
      layout={layouts[localBreakpoint]}
      cols={localCols}
    />
  );
};

ResponsiveReactGridLayout.defaultProps = {
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  layouts: {},
  onBreakpointChange: noop,
  onLayoutChange: noop,
  onWidthChange: noop
};

// This should only include propTypes needed in this code; RGL itself
// will do validation of the rest props passed to it.
ResponsiveReactGridLayout.propTypes = {
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
  layouts(props: Props<>, propName: string) {
    if (type(props[propName]) !== "[object Object]") {
      throw new Error(
        "Layout property must be an object. Received: " + type(props[propName])
      );
    }
    Object.keys(props[propName]).forEach(key => {
      if (!(key in props.breakpoints)) {
        throw new Error(
          "Each key in layouts must align with a key in breakpoints."
        );
      }
      validateLayout(props.layouts[key], "layouts." + key);
    });
  },

  // The width of this component.
  // Required in this propTypes stanza because generateInitialState() will fail without it.
  width: PropTypes.number.isRequired,

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

// $FlowFixMe
const arePropsEqual = (prevProps: Props<>, nextProps: Props<>): boolean =>
  childrenEqual(prevProps.children, nextProps.children) &&
  isEqual(nextProps.breakpoints, prevProps.breakpoints) &&
  isEqual(nextProps.cols, prevProps.cols) &&
  prevProps.width === nextProps.width &&
  isEqual(nextProps.layouts, prevProps.layouts) &&
  prevProps.compactType === nextProps.compactType;

// $FlowFixMe
export default memo(ResponsiveReactGridLayout, arePropsEqual);
