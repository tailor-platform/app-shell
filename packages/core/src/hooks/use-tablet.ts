import * as React from "react";

const TABLET_MIN_BREAKPOINT = 768;
const TABLET_MAX_BREAKPOINT = 1199;

const tabletQuery = `(min-width: ${TABLET_MIN_BREAKPOINT}px) and (max-width: ${TABLET_MAX_BREAKPOINT}px)`;

export function useIsTablet() {
  return React.useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(tabletQuery);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.innerWidth >= TABLET_MIN_BREAKPOINT && window.innerWidth <= TABLET_MAX_BREAKPOINT,
    () => false,
  );
}
