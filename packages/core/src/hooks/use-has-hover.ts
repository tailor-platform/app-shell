import * as React from "react";

/**
 * Whether the primary pointing device can hover — i.e. `(hover: hover)`.
 *
 * True on desktop (a mouse hovers, at any window width), false on touch-only
 * devices. Used to gate hover-only affordances (like the icon-rail flyout) so a
 * narrow desktop window still gets them while touch devices don't.
 *
 * Read through an external-store snapshot like `useIsMobile`, so a client-only
 * mount sees the media query on its first render (a touch device never gets a
 * hover-only first paint) while a hydrating render matches the server fallback.
 */
const QUERY = "(hover: hover)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(QUERY).matches;
// Without a window, assume a mouse; the client snapshot corrects it.
const getServerSnapshot = () => true;

export function useHasHover(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
