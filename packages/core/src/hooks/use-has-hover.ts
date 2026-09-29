import * as React from "react";

/**
 * Whether the primary pointing device can hover — i.e. `(hover: hover)`.
 *
 * True on desktop (a mouse hovers, at any window width), false on touch-only
 * devices. Used to gate hover-only affordances (like the icon-rail flyout) so a
 * narrow desktop window still gets them while touch devices don't.
 */
export function useHasHover(): boolean {
  // Assume hover until proven otherwise so the first paint favours desktop; the
  // effect corrects it on touch devices.
  const [hasHover, setHasHover] = React.useState(true);

  React.useEffect(() => {
    const mql = window.matchMedia("(hover: hover)");
    const update = () => setHasHover(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return hasHover;
}
