import * as React from "react";

import type { GridCoord } from "./spreadsheet-logic";
import type { LineItemsRowData, UseLineItemsReturn } from "./types";

export type SpreadsheetFillPreview = { from: GridCoord; toLineRef: string };

/**
 * Internal context shared between `<LineItems.Table>` and the cell renderer.
 * Wraps the public `useLineItems` return value and adds always-on cell-selection
 * state (anchor, focus, fill drag, range overlays). Spreadsheet behaviors are
 * always wired — there is no "classic" branch.
 */
export type LineItemsGridContextValue<TRow extends LineItemsRowData> = {
  /**
   * Live ref to the current `useLineItems` return value. `useLineItems` returns
   * a fresh object every render; consumers must always read the latest snapshot
   * via `hookRef.current` rather than capturing it. This lets the grid context
   * stay referentially stable across keystrokes (which is what keeps cell
   * inputs from unmounting and losing focus mid-typing).
   */
  hookRef: React.MutableRefObject<UseLineItemsReturn<TRow>>;
  /** Memoized snapshot of `mode` (changes are rare; cheap to put in deps). */
  mode: UseLineItemsReturn<TRow>["mode"];

  /** Stable column id list for the editable schema (drives keyboard nav + paste). */
  schemaColumnIds: readonly string[];
  /** Currently visible row order (after filter / sort), used as the row axis. */
  orderedLineRefs: readonly string[];

  /* ---- Cell selection state ------------------------------------------- */
  anchor: GridCoord | null;
  focus: GridCoord | null;
  fillPreview: SpreadsheetFillPreview | null;

  /* ---- Cell event handlers -------------------------------------------- */
  onCellPointerDown: (coord: GridCoord, e: React.PointerEvent, opts?: { shift?: boolean }) => void;
  /** Called from a cell input's `onFocus` so the grid stays in sync without intercepting pointer events. */
  onCellFocused: (coord: GridCoord) => void;
  onFillGripPointerDown: (coord: GridCoord, e: React.PointerEvent) => void;

  /** Tab / Shift+Tab / Enter from inside a cell input. */
  navigateFromEdit: (kind: "tab" | "shift-tab" | "enter-down") => void;
  /** Alt+Arrow from inside a cell input. */
  navigateArrowFromInput: (
    arrowKey: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
    shiftExtend: boolean,
  ) => void;

  isPrimaryCell: (coord: GridCoord) => boolean;
  isInSelection: (coord: GridCoord) => boolean;
  isInFillPreview: (coord: GridCoord) => boolean;
};

const LineItemsGridContext =
  React.createContext<LineItemsGridContextValue<LineItemsRowData> | null>(null);

export function LineItemsGridProvider({
  value,
  children,
}: {
  value: LineItemsGridContextValue<LineItemsRowData>;
  children: React.ReactNode;
}) {
  return <LineItemsGridContext.Provider value={value}>{children}</LineItemsGridContext.Provider>;
}

export function useLineItemsGrid<TRow extends LineItemsRowData>() {
  const v = React.useContext(LineItemsGridContext);
  return v as LineItemsGridContextValue<TRow> | null;
}
