// @noflow
// Intentional; Flow can't handle the bind on L20
import React from "react";
import ReactDOM from 'react-dom';

type State = {
  mounted: boolean,
  width: number
};

/*
 * A simple HOC that provides facility for listening to container resizes.
 */
export default (ComposedComponent: ReactClass): ReactClass => class extends React.Component {

  static defaultProps = {
    measureBeforeMount: false
  };

  static propTypes = {
    // If true, will not render children until mounted. Useful for getting the exact width before
    // rendering, to prevent any unsightly resizing.
    measureBeforeMount: React.PropTypes.bool
  };

  state: State = {
    mounted: false,
    width: 1280
  };

  componentDidMount() {
    this.setState({mounted: true});

    window.addEventListener('resize', this.onWindowResize);
    // Call to properly set the breakpoint and resize the elements.
    // Note that if you're doing a full-width element, this can get a little wonky if a scrollbar
    // appears because of the grid. In that case, fire your own resize event, or set `overflow: scroll` on your body.
    this.onWindowResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
  }

  onWindowResize = (_event: Event, cb: ?Function) => {
    const node = ReactDOM.findDOMNode(this);
    
    let padLeft = window.getComputedStyle(node, null).getPropertyValue('padding-left') || 0;
    padLeft = parseInt(padLeft) || 0;

    let padRight = window.getComputedStyle(node, null).getPropertyValue('padding-right') || 0;
    padRight = parseInt(padRight) || 0;
    
    this.setState({width: node.offsetWidth - padLeft - padRight}, cb);
  }

  render() {
    if (this.props.measureBeforeMount && !this.state.mounted) {
      return <div className={this.props.className} style={this.props.style} />;
    }

    return <ComposedComponent {...this.props} {...this.state} />;
  }
};
