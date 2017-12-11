// @flow
import React from "react";
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import type {ComponentType as ReactComponentType} from 'react';

type Props = {
  className?: string,
  measureBeforeMount: boolean,
  style?: Object,
};

type State = {
  width: number
};

/*
 * A simple HOC that provides facility for listening to container resizes.
 */
type ProviderT = (ComposedComponent: ReactComponentType<any>) => ReactComponentType<any>;
const WidthProvider: ProviderT = (ComposedComponent) => class extends React.Component<Props, State> {
  static defaultProps = {
    measureBeforeMount: false
  };

  static propTypes = {
    // If true, will not render children until mounted. Useful for getting the exact width before
    // rendering, to prevent any unsightly resizing.
    measureBeforeMount: PropTypes.bool
  };

  state: State = {
    width: 1280
  };

  mounted: boolean = false;
  iframe: ?HTMLIFrameElement = null;

  componentDidMount() {
    this.mounted = true;

    this.iframe.contentWindow.addEventListener('resize', this.onIframeResize);
    // Call to properly set the breakpoint and resize the elements.
    // Note that if you're doing a full-width element, this can get a little wonky if a scrollbar
    // appears because of the grid. In that case, fire your own resize event, or set `overflow: scroll` on your body.
    this.onIframeResize();
  }

  componentWillUnmount() {
    this.mounted = false;
    this.iframe.contentWindow.removeEventListener('resize', this.onIframeResize);
  }

  onIframeResize = (_event: ?Event) => {
    if (!this.mounted) return;
    const node = ReactDOM.findDOMNode(this); // Flow casts this to Text | Element
    if (node instanceof HTMLElement) {
      this.setState({width: this.iframe.offsetWidth});
    }
  }

  saveIframe = (iframe: HTMLIFrameElement) => {
    this.iframe = iframe;
  }

  render() {
    if (this.props.measureBeforeMount && !this.mounted) {
      return <div className={this.props.className} style={this.props.style} />;
    }

    return (
      <span>
        <iframe ref={this.saveIframe} style={{  
          height: 0,
          margin: 0,
          padding: 0,
          opacity: 0,
          overflow: 'hidden',
          borderWidth: 0,
          position: 'absolute',
          backgroundColor: 'transparent',
          width: '100%'
        }} />
        <ComposedComponent {...this.props} {...this.state} />
      </span>
    );
  }
};

export default WidthProvider;
