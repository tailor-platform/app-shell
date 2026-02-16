import * as React from "react";

const TABLET_MIN_BREAKPOINT = 768;
const TABLET_MAX_BREAKPOINT = 1199;

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${TABLET_MIN_BREAKPOINT}px) and (max-width: ${TABLET_MAX_BREAKPOINT}px)`,
    );
    const onChange = () => {
      setIsTablet(
        window.innerWidth >= TABLET_MIN_BREAKPOINT &&
          window.innerWidth <= TABLET_MAX_BREAKPOINT,
      );
    };
    mql.addEventListener("change", onChange);
    setIsTablet(
      window.innerWidth >= TABLET_MIN_BREAKPOINT &&
        window.innerWidth <= TABLET_MAX_BREAKPOINT,
    );
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isTablet;
}
