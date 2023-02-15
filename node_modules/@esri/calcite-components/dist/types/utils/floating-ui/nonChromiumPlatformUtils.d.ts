import { Strategy } from "@floating-ui/core";
import type { ElementRects, FloatingElement, ReferenceElement } from "@floating-ui/dom";
declare function getElementRects(_ref: {
  reference: ReferenceElement;
  floating: FloatingElement;
  strategy: Strategy;
}): ElementRects;
export { getClippingRect, getElementRects, getOffsetParent };
declare function getOffsetParent(element: any): any;
declare function getClippingRect(_ref: any): {
  width: number;
  height: number;
  x: any;
  y: any;
};
