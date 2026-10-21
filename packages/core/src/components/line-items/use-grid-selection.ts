import * as React from "react";

import {
  moveSelectionCoord,
  rectangularCells,
  sameCoord,
  type GridCoord,
  type GridDirection,
} from "./spreadsheet-logic";

/** Flattens a coordinate into a Set key so per-cell lookups stay O(1). */
export function coordKey(lineKey: string, columnId: string): string {
  return `${lineKey}::${columnId}`;
}

export type GridSelection = {
  /** The focused cell — the only one that mounts an editor. */
  active: GridCoord | null;
  /** Keys of every cell in the selected rectangle. */
  selected: ReadonlySet<string>;
  /** True while a pointer range-drag is in progress. */
  dragging: boolean;
};

export type UseGridSelectionResult = GridSelection & {
  setActive: (coord: GridCoord | null) => void;
  /** Pointer-down on a cell: starts a new range, or extends it when `shift` is held. */
  beginSelection: (coord: GridCoord, opts?: { shift?: boolean }) => void;
  /** Pointer-enter during a drag: extends the rectangle to `coord`. */
  extendSelection: (coord: GridCoord) => void;
  endSelection: () => void;
  /** Arrow-key navigation. Returns the coord moved to, or `null` at the edge. */
  moveActive: (dir: GridDirection, opts?: { shift?: boolean }) => GridCoord | null;
  clearSelection: () => void;
  isSelected: (lineKey: string, columnId: string) => boolean;
};

/**
 * Owns the editable grid's cell selection.
 *
 * The selection anchor is only ever written by pointer-down and keyboard
 * navigation. A stray native `focus` event must never move it, or a shift-click
 * would collapse the very range it was meant to extend.
 *
 * `orderedLineKeys` and `columnIds` are expected to be memoized by the caller —
 * a new array identity every render would rebuild every handler here and
 * remount the active cell's editor mid-keystroke.
 */
export function useGridSelection(
  orderedLineKeys: readonly string[],
  columnIds: readonly string[],
): UseGridSelectionResult {
  const [active, setActiveState] = React.useState<GridCoord | null>(null);
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set<string>());
  const [dragging, setDragging] = React.useState(false);

  const anchor = React.useRef<GridCoord | null>(null);

  const paintRange = React.useCallback(
    (from: GridCoord, to: GridCoord) => {
      const cells = rectangularCells(orderedLineKeys, columnIds, from, to);
      const next = new Set<string>();
      for (const c of cells) next.add(coordKey(c.lineKey, c.columnId));
      setSelected(next);
    },
    [columnIds, orderedLineKeys],
  );

  const setActive = React.useCallback((coord: GridCoord | null) => {
    setActiveState(coord);
    anchor.current = coord;
    setSelected(coord ? new Set([coordKey(coord.lineKey, coord.columnId)]) : new Set<string>());
  }, []);

  const beginSelection = React.useCallback(
    (coord: GridCoord, opts?: { shift?: boolean }) => {
      if (opts?.shift && anchor.current) {
        // Shift-clicking across cells would otherwise leave the browser's own
        // text selection painted over the range. Drop it before painting ours.
        globalThis.getSelection?.()?.removeAllRanges();
        setActiveState(coord);
        paintRange(anchor.current, coord);
        return;
      }
      setActiveState(coord);
      anchor.current = coord;
      setSelected(new Set([coordKey(coord.lineKey, coord.columnId)]));
      setDragging(true);
    },
    [paintRange],
  );

  const extendSelection = React.useCallback(
    (coord: GridCoord) => {
      if (!dragging || !anchor.current) return;
      if (sameCoord(anchor.current, coord)) return;
      paintRange(anchor.current, coord);
    },
    [dragging, paintRange],
  );

  const endSelection = React.useCallback(() => {
    setDragging(false);
  }, []);

  const moveActive = React.useCallback(
    (dir: GridDirection, opts?: { shift?: boolean }): GridCoord | null => {
      if (!active) return null;
      const next = moveSelectionCoord(dir, active, orderedLineKeys, columnIds);
      if (!next || sameCoord(next, active)) return null;

      setActiveState(next);
      if (opts?.shift && anchor.current) {
        paintRange(anchor.current, next);
      } else {
        anchor.current = next;
        setSelected(new Set([coordKey(next.lineKey, next.columnId)]));
      }
      return next;
    },
    [active, columnIds, orderedLineKeys, paintRange],
  );

  const clearSelection = React.useCallback(() => {
    setActiveState(null);
    anchor.current = null;
    setSelected(new Set<string>());
    setDragging(false);
  }, []);

  // A pointer released outside the grid still has to end the drag, or the next
  // hover over a cell would keep extending a range the user already dropped.
  React.useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    globalThis.addEventListener("pointerup", stop);
    return () => globalThis.removeEventListener("pointerup", stop);
  }, [dragging]);

  const isSelected = React.useCallback(
    (lineKey: string, columnId: string) => selected.has(coordKey(lineKey, columnId)),
    [selected],
  );

  return {
    active,
    selected,
    dragging,
    setActive,
    beginSelection,
    extendSelection,
    endSelection,
    moveActive,
    clearSelection,
    isSelected,
  };
}
