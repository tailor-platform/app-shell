import * as React from "react";

const TABLET_MIN_BREAKPOINT = 768;
const TABLET_MAX_BREAKPOINT = 1199;

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(
    `(min-width: ${TABLET_MIN_BREAKPOINT}px) and (max-width: ${TABLET_MAX_BREAKPOINT}px)`,
  );
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getSnapshot = () =>
  window.innerWidth >= TABLET_MIN_BREAKPOINT && window.innerWidth <= TABLET_MAX_BREAKPOINT;
const getServerSnapshot = () => false;

export function useIsTablet() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
