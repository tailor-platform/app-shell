import * as React from "react";

/**
 * Whether the primary pointing device can hover — i.e. `(hover: hover)`.
 *
 * True on desktop (a mouse hovers, at any window width), false on touch-only
 * devices. Used to gate hover-only affordances (like the icon-rail flyout) so a
 * narrow desktop window still gets them while touch devices don't.
 */
const QUERY = "(hover: hover)";

export function useHasHover(): boolean {
  // Read the media query on the first render where a window exists, so a touch
  // device never gets a hover-only first paint (a tap in that frame would hit
  // the hover affordance). Without a window, assume hover; the effect corrects it.
  const [hasHover, setHasHover] = React.useState(
    () => typeof window === "undefined" || window.matchMedia(QUERY).matches,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const update = () => setHasHover(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return hasHover;
}
