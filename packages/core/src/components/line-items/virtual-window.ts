/** The slice of rows to mount, plus the spacer heights that stand in for the rest. */
export type VirtualWindow = {
  startIndex: number;
  /** Exclusive. */
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
};

export type VirtualWindowInput = {
  rowCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  /** Rows rendered beyond each edge of the viewport, to cover fast scrolling. */
  overscan: number;
};

/**
 * Windowing math for a uniform row height. Rows outside the window are replaced
 * by a single spacer row above and below, so the scrollbar still reflects the
 * full document while only the visible slice is mounted.
 *
 * A viewport height of 0 (the first render, before layout) yields a small
 * leading slice rather than nothing, so the table paints content immediately
 * instead of flashing empty.
 */
export function computeVirtualWindow({
  rowCount,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscan,
}: VirtualWindowInput): VirtualWindow {
  if (rowCount <= 0 || rowHeight <= 0) {
    return { startIndex: 0, endIndex: 0, paddingTop: 0, paddingBottom: 0 };
  }

  const safeScrollTop = Math.max(0, scrollTop);
  const visibleCount =
    viewportHeight > 0 ? Math.ceil(viewportHeight / rowHeight) + 1 : Math.min(rowCount, overscan);

  const firstVisible = Math.floor(safeScrollTop / rowHeight);
  const startIndex = Math.max(0, Math.min(firstVisible - overscan, rowCount - 1));
  const endIndex = Math.min(rowCount, firstVisible + visibleCount + overscan);

  return {
    startIndex,
    endIndex,
    paddingTop: startIndex * rowHeight,
    paddingBottom: Math.max(0, (rowCount - endIndex) * rowHeight),
  };
}

export function sameVirtualWindow(a: VirtualWindow, b: VirtualWindow): boolean {
  return a.startIndex === b.startIndex && a.endIndex === b.endIndex;
}
