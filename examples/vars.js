'use strict';

module.exports = [
  {
    title: 'Showcase',
    source: 'showcase',
    paragraphs: [
      'React-Grid-Layout is the only grid layout system for React. It features auto-packing, draggable and resizable ' +
        'widgets, static widgets, a fluid layout, and separate layouts per responsive breakpoint.',
      'Try it out! Drag some boxes around, resize them, and resize the window to see the responsive breakpoints.'
    ]
  },
  {
    title: 'Basic',
    source: 'basic',
    paragraphs: [
      'Try dragging the elements around.',
      'This is a basic, non-responsive layout with dragging and resizing. Usage is very simple.'
    ]
  },
  {
    title: 'No Dragging',
    source: 'no-dragging',
    paragraphs: [
      'This particular example has dragging and resizing turned off.'
    ]
  },
  {
    title: 'Messy',
    source: 'messy',
    paragraphs: [
      'This demo shows what happens when elements are placed randomly all over the layout.',
      'RGL does not auto-pack in the same fashion as other projects, such as jQuery Masonry. Packing is only done ' +
        'in the vertical dimension. If objects all have the same width, they will be packed efficiently.',
      'If a layout is fed to RGL that has items with incorrect dimensions (width too big, overlapping other elements, ' +
        'out of bounds, etc), they will be automatically corrected on startup. See the ' +
        'source of this demo, where elements are placed randomly in the layout.'
    ]
  },
  {
    title: 'Grid Item Properties',
    source: 'grid-property',
    paragraphs: [
      'This demo uses a layout assigned on the grid items themselves as the <code>data-grid</code> property.',
    ]
  },
  {
    title: 'Static Elements',
    source: 'static-elements',
    paragraphs: [
      'This demo sets an item to <code>static</code>. Static elements cannot be moved or resized. Other elements ' +
        'move themselves around a static element.'
    ]
  },
  {
    title: 'Dynamic Add/Remove',
    source: 'dynamic-add-remove',
    paragraphs: [
      'This demo shows what happens when items are dynamically added and removed.',
      'You can remove an item by clicking its "x", and add a new one with the button.',
      'To further illustration RGL\'s capacities, this particular example is responsive. Trying resizing the window.'
    ]
  },
  {
    title: 'LocalStorage',
    source: 'localstorage',
    paragraphs: [
      'This simple demo synchronizes to localStorage.',
      'Try moving and resizing elements, then reloading.'
    ]
  },
  {
    title: 'Responsive with LocalStorage',
    source: 'localstorage-responsive',
    paragraphs: [
      'This simple demo synchronizes to localStorage for each responsive breakpoint.',
      'Try moving and resizing elements, changing window width, moving some more, and refreshing.',
      'Each breakpoint has a separate layout. The <code>onLayoutChange</code> callback calls back with ' +
        'a hash of breakpoints to layouts, which is then synchronized to localStorage.'
    ]
  },
  {
    title: 'Minimum and Maximum Width/Height',
    source: 'min-max-wh',
    paragraphs: [
      'You can set min and max dimensions on a grid item by using the `minW`, `maxW`, `minH`, and `maxH` properties.',
      'In this demo, the min and max dimensions are generated automatically. Try resizing the items below.',
      'If your mins and maxes collide: for example min > max, or the initial dimensions are out of range, ' +
        'an error will be thrown.'
    ]
  },
  {
    title: 'Dynamic Minimum and Maximum Width/Height',
    source: 'dynamic-min-max-wh',
    paragraphs: [
      'Your application may have more complex rules for determining an element\'s mins and maxes. This demo ' +
      'demonstrates how to use the `onResize` handler to accomplish this.',
      'In this grid, all elements are allowed a max width of 2 if the height < 3, ' +
      'and a min width of 2 if the height >= 3.'
    ]
  },
  {
    title: 'No Vertical Compacting (Free Movement)',
    source: 'no-vertical-compact',
    paragraphs: [
      'You may want to turn off vertical compacting so items can be placed anywhere in the grid. Set the ' +
      'property `verticalCompact` to `false` to achieve this effect.'
    ]
  },
  {
    title: 'Viewport related sizing',
    source: 'viewport-related',
    paragraphs: [
      'This demo shows that the size of grid elements is related to the viewport width.',
      'Resize the browser window and the sizes of elements are resized in in relation to it!'
    ]
  },
  {
    title: 'Responsive viewport related sizing',
    source: 'viewport-related-responsive',
    paragraphs: [
      'This demo shows that the size of grid elements is related to the viewport width in a responsive way',
      'Resize the browser window and the sizes of elements are resized in in relation to it along with relayouting when repsonsive breakpoints are changing!'
    ]
  }
];
