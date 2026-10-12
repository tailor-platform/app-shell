import * as React from "react";

import type { VisibleRow } from "./tree-utils";
import type { TreePickerNode } from "./types";

/**
 * @internal
 * Implements the ARIA tree keyboard contract on top of a flattened list of
 * visible rows:
 *
 * - **roving tabindex** — exactly one visible row is in the tab order
 * - `ArrowDown` / `ArrowUp` — move between *visible* rows (a collapsed parent's
 *   children are not visible, so they are skipped)
 * - `ArrowRight` — expand a collapsed parent, else step into its first child
 * - `ArrowLeft` — collapse an expanded parent, else step out to its parent
 * - `Home` / `End` — first / last visible row
 * - `Space` — toggle the focused row (cascading for parents) without moving focus
 * - `Enter` — commit, but never while focus sits in a text input (so it does not
 *   fight typing in the search box) or on a button (whose own click owns it)
 */

type UseTreeFocusOptions<T> = {
  open: boolean;
  rows: ReadonlyArray<VisibleRow<T>>;
  setExpanded(id: string, next: boolean): void;
  toggleNode(node: TreePickerNode<T>, next: boolean): void;
  isChecked(node: TreePickerNode<T>): boolean;
  commit(): void;
};

type UseTreeFocusResult = {
  /** The single row that carries `tabIndex={0}`; every other row gets `-1`. */
  activeRowId: string | null;
  registerRow(id: string, element: HTMLElement | null): void;
  onRowFocus(id: string): void;
  handleKeyDown(event: React.KeyboardEvent): void;
};

const ROW_SELECTOR = '[role="treeitem"]';
const NODE_ID_ATTRIBUTE = "data-node-id";

export function useTreeFocus<T>({
  open,
  rows,
  setExpanded,
  toggleNode,
  isChecked,
  commit,
}: UseTreeFocusOptions<T>): UseTreeFocusResult {
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const rowElements = React.useRef(new Map<string, HTMLElement>());

  React.useEffect(() => {
    if (!open) setFocusedId(null);
  }, [open]);

  const registerRow = React.useCallback((id: string, element: HTMLElement | null) => {
    if (element) rowElements.current.set(id, element);
    else rowElements.current.delete(id);
  }, []);

  const onRowFocus = React.useCallback((id: string) => setFocusedId(id), []);

  // The remembered row may have been filtered away by the search query; fall
  // back to the first visible row so the tree always has exactly one tab stop.
  const activeRowId =
    focusedId !== null && rows.some((row) => row.node.id === focusedId)
      ? focusedId
      : (rows[0]?.node.id ?? null);

  const focusRow = React.useCallback((id: string | undefined) => {
    if (id === undefined) return;
    setFocusedId(id);
    rowElements.current.get(id)?.focus();
  }, []);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target === null) return;
      const inTextInput = target.tagName === "INPUT";
      const onButton = target.closest("button") !== null;

      if (event.key === "Enter") {
        if (inTextInput || onButton) return;
        event.preventDefault();
        commit();
        return;
      }

      if (inTextInput) return;

      const rowElement = target.closest(ROW_SELECTOR);
      const nodeId = rowElement?.getAttribute(NODE_ID_ATTRIBUTE);
      if (nodeId == null) return;
      const index = rows.findIndex((row) => row.node.id === nodeId);
      const row = rows[index];
      if (row === undefined) return;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          focusRow(rows[index + 1]?.node.id);
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          focusRow(rows[index - 1]?.node.id);
          break;
        }
        case "ArrowRight": {
          if (row.leaf) break;
          event.preventDefault();
          if (row.expanded) focusRow(rows[index + 1]?.node.id);
          else setExpanded(row.node.id, true);
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (!row.leaf && row.expanded) setExpanded(row.node.id, false);
          else if (row.parentId !== null) focusRow(row.parentId);
          break;
        }
        case "Home": {
          event.preventDefault();
          focusRow(rows[0]?.node.id);
          break;
        }
        case "End": {
          event.preventDefault();
          focusRow(rows.at(-1)?.node.id);
          break;
        }
        case " ": {
          if (onButton) break;
          event.preventDefault();
          toggleNode(row.node, !isChecked(row.node));
          break;
        }
        default:
          break;
      }
    },
    [rows, focusRow, setExpanded, toggleNode, isChecked, commit],
  );

  return { activeRowId, registerRow, onRowFocus, handleKeyDown };
}
