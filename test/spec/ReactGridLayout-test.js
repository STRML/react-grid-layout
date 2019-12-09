// @flow
/* eslint-env jest */

/*:: declare function describe(name: string, fn: Function): void; */
/*:: declare function it(name: string, fn: Function): void; */
/*:: declare function expect(any): any; */
/*:: declare function beforeEach(any): any */

import React from "react";
import { mount, configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import ReactGridLayout from "../../lib/ReactGridLayout";

configure({ adapter: new Adapter() });

function isNullOrUndefined(value) {
  return value == null;
}

describe("fix GridItem calcXY", () => {
  // Move first grid item from (0, 0) to (1, 0)
  // The width of the container is 1050, containerPaddingLeft is 0, marginLeft is 50, cols is 12,
  // according to the calculation rule:
  // colWidth = (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
  // x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]))
  // so
  // the length of the drag should be:  92 <= left < 138

  let firstGridItem;

  beforeEach(() => {
    // patch jsdom offsetParent is null(https://github.com/jsdom/jsdom/issues/1261#issuecomment-512217225)
    //$FlowFixMe
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      get() {
        let element = this;
        while (
          !isNullOrUndefined(element) &&
          (isNullOrUndefined(element.style) ||
            isNullOrUndefined(element.style.display) ||
            element.style.display.toLowerCase() !== "none")
        ) {
          element = element.parentNode;
        }

        if (!isNullOrUndefined(element)) {
          return null;
        }

        if (
          !isNullOrUndefined(this.style) &&
          !isNullOrUndefined(this.style.position) &&
          this.style.position.toLowerCase() === "fixed"
        ) {
          return null;
        }

        if (
          this.tagName.toLowerCase() === "html" ||
          this.tagName.toLowerCase() === "body"
        ) {
          return null;
        }

        return this.parentNode;
      }
    });

    const layout = [
      [0, 0, 2, 3],
      [2, 0, 2, 3],
      [4, 0, 2, 2],
      [6, 0, 2, 3],
      [8, 0, 2, 5]
    ].map((item, i) => {
      return {
        x: item[0],
        y: item[1],
        w: item[2],
        h: item[3],
        i: i.toString()
      };
    });

    function onDragStart(layout) {
      expect(layout.map(({ x, y, w, h, i }) => ({ x, y, w, h, i }))).toEqual([
        { x: 0, y: 0, w: 2, h: 3, i: "0" },
        { x: 2, y: 0, w: 2, h: 3, i: "1" },
        { x: 4, y: 0, w: 2, h: 2, i: "2" },
        { x: 6, y: 0, w: 2, h: 3, i: "3" },
        { x: 8, y: 0, w: 2, h: 5, i: "4" }
      ]);
    }

    function onDrag(layout) {
      expect(layout.map(({ x, y, w, h, i }) => ({ x, y, w, h, i }))).toEqual([
        { x: 1, y: 0, w: 2, h: 3, i: "0" },
        { x: 2, y: 1, w: 2, h: 3, i: "1" },
        { x: 4, y: 0, w: 2, h: 2, i: "2" },
        { x: 6, y: 0, w: 2, h: 3, i: "3" },
        { x: 8, y: 0, w: 2, h: 5, i: "4" }
      ]);
    }

    const wrapper = mount(
      <ReactGridLayout
        layout={layout}
        rowHeight={30}
        cols={12}
        containerPadding={[0, 0]}
        margin={[50, 10]}
        width={1050}
        onDragStart={onDragStart}
        onDrag={onDrag}
      >
        {layout.map((l, i) => {
          return (
            <div key={i}>
              <span className="text">{i}</span>
            </div>
          );
        })}
      </ReactGridLayout>
    );

    firstGridItem = wrapper.find(".react-grid-item").first();
  });

  it("drag 92px", () => {
    simulateMovementFromTo(firstGridItem, 10, 10, 102, 10);
  });

  it("drag 110px", () => {
    simulateMovementFromTo(firstGridItem, 10, 10, 120, 10);
  });

  it("drag 137px", () => {
    simulateMovementFromTo(firstGridItem, 10, 10, 137, 10);
  });
});

function mouseMove(node, x, y) {
  const doc = node ? node.ownerDocument : document;
  const evt = new MouseEvent("mousemove", { clientX: x, clientY: y });
  doc.dispatchEvent(evt);
}

function simulateMovementFromTo(drag, fromX, fromY, toX, toY) {
  const node = drag.getDOMNode();

  drag.simulate("mousedown", {
    clientX: fromX,
    clientY: fromY
  });

  mouseMove(node, toX, toY);

  drag.simulate("mouseup");
}
