import type * as React from "react";

/**
 * A single node in the picker's catalog tree.
 *
 * - `id` must be unique across the **entire** tree — it doubles as the
 *   selection key. Duplicate ids silently break selection; prefix them on
 *   construction (e.g. `` `${parentId}-${childId}` ``) when your source data
 *   reuses keys across levels.
 * - `data` is opaque to the picker. It is only handed back to `renderRow`,
 *   `renderMetric`, and `matchesSearch`.
 * - A node whose `children` is `undefined` or empty is a **leaf**. Selection is
 *   leaf-only, so leaves are the units the consumer receives from `onCommit`.
 */
export type TreePickerNode<T = unknown> = {
  id: string;
  data: T;
  children?: TreePickerNode<T>[];
};

/** Props for {@link TreePicker}. */
export interface TreePickerProps<T> {
  /** Controls dialog visibility. */
  open: boolean;
  /**
   * Fires on every user-driven open/close (Esc, backdrop, close button, Cancel,
   * and after a successful commit). The picker closes itself after `onCommit`,
   * so consumers should not also call this from their commit handler.
   */
  onOpenChange(open: boolean): void;
  /** Dialog title. Also labels the `tree` for assistive tech. Default: `"Select items"`. */
  title?: React.ReactNode;
  /** Hierarchical items. Selection is leaf-only (a node with no `children`). */
  items: ReadonlyArray<TreePickerNode<T>>;
  /**
   * Renders the row's own content. The library draws the checkbox, the
   * expand/collapse caret, the indentation, and the metric column — this only
   * needs to return the label/body for the node.
   */
  renderRow(row: { node: TreePickerNode<T>; depth: number }): React.ReactNode;
  /** Optional right-aligned metric column (e.g. "Total available"). */
  renderMetric?(row: { node: TreePickerNode<T>; depth: number }): React.ReactNode;
  /** Header label above the `renderRow` column. Default: `"Item"`. */
  rowLabel?: React.ReactNode;
  /** Header label above the `renderMetric` column. Omitted when absent. */
  metricLabel?: React.ReactNode;
  /**
   * Search predicate. Defaults to a case-insensitive substring match against
   * `String(node.data)`, which is only useful when `data` is a primitive —
   * **override it whenever `data` is an object**, otherwise every node
   * stringifies to `"[object Object]"` and the query matches nothing.
   */
  matchesSearch?(search: { node: TreePickerNode<T>; query: string }): boolean;
  /** Slot rendered to the right of the search input (e.g. a category filter button). */
  filterSlot?: React.ReactNode;
  /** Receives the selected **leaf** nodes in DFS tree order. */
  onCommit(selected: TreePickerNode<T>[]): void;
  /** Primary CTA label. Default: `"Add N items"`, or `"Add items"` when nothing is selected. */
  ctaLabel?(count: number): React.ReactNode;
  /** Shown when the (filtered) tree is empty. Default: `"No matching items."`. */
  emptyText?: React.ReactNode;
  /** Search input placeholder. Default: `"Search"`. */
  searchPlaceholder?: string;
  /** Merged onto the dialog panel. */
  className?: string;
}
