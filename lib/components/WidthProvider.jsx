// @flow
import React from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import type { ComponentType as ReactComponentType } from "react";

type WPProps = {
  className?: string,
  measureBeforeMount: boolean,
  style?: Object,
  breakpointFromViewport: boolean
};

type WPState = {
  width: number,
  viewportWidth: number
};

/*
 * A simple HOC that provides facility for listening to container resizes.
 */
export default function WidthProvider<
  Props,
  ComposedProps: { ...Props, ...WPProps }
>(
  ComposedComponent: ReactComponentType<Props>
): ReactComponentType<ComposedProps> {
  return class WidthProvider extends React.Component<ComposedProps, WPState> {
    static defaultProps = {
      measureBeforeMount: false,
      breakpointFromViewport: false
    };

    static propTypes = {
      // If true, will not render children until mounted. Useful for getting the exact width before
      // rendering, to prevent any unsightly resizing.
      measureBeforeMount: PropTypes.bool,
      breakpointFromViewport: PropTypes.bool
    };

    state = {
      width: 1280,
      viewportWidth: 1280
    };

    mounted: boolean = false;

    componentDidMount() {
      this.mounted = true;

      window.addEventListener("resize", this.onWindowResize);
      // Call to properly set the breakpoint and resize the elements.
      // Note that if you're doing a full-width element, this can get a little wonky if a scrollbar
      // appears because of the grid. In that case, fire your own resize event, or set `overflow: scroll` on your body.
      this.onWindowResize();
    }

    componentWillUnmount() {
      this.mounted = false;
      window.removeEventListener("resize", this.onWindowResize);
    }

    onWindowResize = () => {
      if (!this.mounted) return;
      // eslint-disable-next-line
      const node = ReactDOM.findDOMNode(this); // Flow casts this to Text | Element
      if (node instanceof HTMLElement) {
        this.setState({ width: node.offsetWidth });
      }
      if (this.props.breakpointFromViewport && typeof window !== "undefined") {
        this.setState({ viewportWidth: window.innerWidth });
      }
    };

    render() {
      const { measureBeforeMount, ...rest } = this.props;
      if (measureBeforeMount && !this.mounted) {
        return (
          <div className={this.props.className} style={this.props.style} />
        );
      }

      return <ComposedComponent {...rest} {...this.state} />;
    }
  };
}
