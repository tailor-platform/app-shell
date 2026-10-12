import * as React from "react";

import { computeVirtualWindow, sameVirtualWindow, type VirtualWindow } from "./virtual-window";

export type UseRowVirtualizerOptions = {
  rowCount: number;
  rowHeight: number;
  overscan?: number;
  /** Set `false` to mount every row — used by tests and by short tables. */
  enabled?: boolean;
};

const EMPTY_WINDOW: VirtualWindow = {
  startIndex: 0,
  endIndex: 0,
  paddingTop: 0,
  paddingBottom: 0,
};

/**
 * Tracks the scroll container and reports which row range to mount.
 *
 * Scroll events are coalesced into one animation frame, and state is only
 * written when the row range actually changes — scrolling within a single row's
 * height must not re-render the grid, or typing in a cell would drop focus
 * whenever the container scrolls.
 */
export function useRowVirtualizer(
  containerRef: React.RefObject<HTMLElement | null>,
  { rowCount, rowHeight, overscan = 8, enabled = true }: UseRowVirtualizerOptions,
): VirtualWindow {
  const [window_, setWindow] = React.useState<VirtualWindow>(EMPTY_WINDOW);

  const measure = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const next = computeVirtualWindow({
      rowCount,
      rowHeight,
      scrollTop: el.scrollTop,
      viewportHeight: el.clientHeight,
      overscan,
    });
    setWindow((prev) =>
      sameVirtualWindow(prev, next) && prev.paddingTop === next.paddingTop ? prev : next,
    );
  }, [containerRef, overscan, rowCount, rowHeight]);

  React.useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    measure();

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [containerRef, enabled, measure]);

  if (!enabled) {
    return { startIndex: 0, endIndex: rowCount, paddingTop: 0, paddingBottom: 0 };
  }

  return window_;
}
