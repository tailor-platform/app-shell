import { useState } from "react";

export type CellEditDirection = "up" | "down" | "next" | "prev";

/**
 * Tracks the editable cells a DataTable page has rendered, so a cell can hand
 * focus to its neighbour on Enter / Tab without querying the DOM.
 *
 * Editors register their focusable element through a callback ref;
 * `DataTableRows` publishes the current row and column order on every render.
 * Moves only ever land on registered cells, so read-only columns and rows are
 * skipped rather than trapping focus.
 *
 * @internal
 */
export interface CellEditNavigation {
  /** Registers a cell's editor; returns the matching cleanup. */
  register: (rowKey: string, colKey: string, element: HTMLElement) => () => void;
  /** The rendered row keys (top to bottom) and column keys (left to right). */
  setOrder: (rowKeys: readonly string[], colKeys: readonly string[]) => void;
  /** Focuses the nearest editable cell in `direction`; `false` when there is none. */
  move: (from: { rowKey: string; colKey: string }, direction: CellEditDirection) => boolean;
}

const cellId = (rowKey: string, colKey: string) => `${rowKey}\u0000${colKey}`;

export function createCellEditNavigation(): CellEditNavigation {
  const cells = new Map<string, HTMLElement>();
  let rowKeys: readonly string[] = [];
  let colKeys: readonly string[] = [];

  // A cell that unmounted without unregistering is skipped, not focused.
  const at = (rowKey: string, colKey: string) => {
    const cell = cells.get(cellId(rowKey, colKey));
    return cell?.isConnected ? cell : undefined;
  };

  const find = (from: { rowKey: string; colKey: string }, direction: CellEditDirection) => {
    const row = rowKeys.indexOf(from.rowKey);
    const col = colKeys.indexOf(from.colKey);
    if (row === -1 || col === -1) return undefined;

    if (direction === "up" || direction === "down") {
      const step = direction === "down" ? 1 : -1;
      for (let r = row + step; r >= 0 && r < rowKeys.length; r += step) {
        const cell = at(rowKeys[r], from.colKey);
        if (cell) return cell;
      }
      return undefined;
    }

    // Row-major order, left to right then top to bottom.
    const step = direction === "next" ? 1 : -1;
    const total = rowKeys.length * colKeys.length;
    for (let i = row * colKeys.length + col + step; i >= 0 && i < total; i += step) {
      const cell = at(rowKeys[Math.floor(i / colKeys.length)], colKeys[i % colKeys.length]);
      if (cell) return cell;
    }
    return undefined;
  };

  return {
    register(rowKey, colKey, element) {
      const id = cellId(rowKey, colKey);
      cells.set(id, element);
      return () => {
        // A re-render can register the replacement element before the previous
        // ref's cleanup runs — only drop the entry if it is still ours.
        if (cells.get(id) === element) cells.delete(id);
      };
    },
    setOrder(nextRowKeys, nextColKeys) {
      rowKeys = nextRowKeys;
      colKeys = nextColKeys;
    },
    move(from, direction) {
      const target = find(from, direction);
      if (!target) return false;
      target.focus();
      return true;
    },
  };
}

/** One navigation registry per rendered table body. */
export function useCellEditNavigation(): CellEditNavigation {
  const [navigation] = useState(createCellEditNavigation);
  return navigation;
}
