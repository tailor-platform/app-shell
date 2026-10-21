import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { Column } from "./types";
import type { ColumnWidths } from "./column-layout";

// `useLayoutEffect` warns during SSR; the measurement it drives is client-only,
// so fall back to `useEffect` on the server.
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

/** Shallow equality of two width maps — guards the measure effect against
 *  setting state (and re-rendering) when nothing actually changed. */
function sameWidths(a: ColumnWidths, b: ColumnWidths): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

export function useTableMeasurements<TRow extends Record<string, unknown>>(
  containerRef: RefObject<HTMLDivElement | null>,
  {
    visibleColumns,
    pinnedColumns,
    hasSelection,
    hasExpand,
    hasRowActions,
  }: {
    visibleColumns: Column<TRow>[] | undefined;
    pinnedColumns: Record<string, "left" | "right" | "none"> | undefined;
    hasSelection: boolean;
    hasExpand: boolean;
    hasRowActions: boolean;
  },
): ColumnWidths {
  const [widths, setWidths] = useState<ColumnWidths>({});

  // Measure each column's *rendered* width from the (always-present) header row
  // and publish it via PinMeasureContext, so sticky offsets reflect real
  // geometry rather than declared `width`. This keeps the table on its natural
  // `table-auto` sizing — pinning no longer forces `table-fixed` (which would
  // require every column to set an explicit width or collapse). Runs before
  // paint and re-measures on container/column changes.
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Own table only: an expanded row can contain another DataTable.
    const ownTable = el.querySelector("table");
    const cells = Array.from(
      el.querySelectorAll<HTMLElement>("[data-slot='data-table-header'] [data-col-key]"),
    ).filter((cell) => cell.closest("table") === ownTable);
    let lastWidth = -1;

    const measure = () => {
      const width = el.clientWidth;
      lastWidth = width;
      const next: ColumnWidths = {};
      cells.forEach((cell) => {
        const key = cell.dataset.colKey;
        // Fractional width (not the integer-rounded offsetWidth) so accumulated
        // sticky offsets land exactly on each column's real edge — otherwise the
        // rounding drift opens a sub-pixel gap between adjacent pinned columns
        // where scrolling rows bleed through.
        if (key) next[key] = cell.getBoundingClientRect().width;
      });
      setWidths((prev) => (sameWidths(prev, next) ? prev : next));
      // Publish the scrollport width for an expanded row's sticky panel to cap
      // itself to. Skipping zero keeps a hidden-tab mount from collapsing every
      // panel via `min(100%, 0px)`; writing only on change keeps this mutation
      // from feeding back into the ResizeObserver.
      if (width > 0) {
        const value = `${width}px`;
        if (el.style.getPropertyValue("--data-table-viewport") !== value) {
          el.style.setProperty("--data-table-viewport", value);
        }
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      // Footer content can redistribute columns without changing table width.
      // Ignore container-only height changes while detail rows animate.
      if (el.clientWidth !== lastWidth || entries.some((entry) => entry.target !== el)) measure();
    });
    observer.observe(el);
    cells.forEach((cell) => observer.observe(cell));
    return () => observer.disconnect();
  }, [containerRef, visibleColumns, pinnedColumns, hasSelection, hasExpand, hasRowActions]);

  // Reflect horizontal scroll position onto the container as data attributes so
  // the pinned-column freeze shadows show only while there is content scrolled
  // under that edge (left once scrolled from the start; right while more remains
  // to the right). Re-runs when the column set changes and observes size changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      el.toggleAttribute("data-pin-shadow-left", el.scrollLeft > 0);
      el.toggleAttribute("data-pin-shadow-right", el.scrollLeft < maxScroll - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    if (typeof ResizeObserver === "undefined") {
      return () => el.removeEventListener("scroll", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [containerRef, visibleColumns, pinnedColumns]);

  return widths;
}
