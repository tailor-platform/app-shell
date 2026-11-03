import * as React from "react";

import {
  buildTree,
  checkState,
  filterTree,
  indexTree,
  readValue,
  toggleChecked,
  toSelectedItem,
  writeValue,
  type CheckedState,
  type TreeNode,
} from "./tree-model";
import type {
  TreeFilterContext,
  TreeMapItemContext,
  TreeMappedItem,
  TreeSelectedItem,
  TreeSelectionPropagation,
  TreeValueProps,
  TreeValueStrategy,
} from "./types";

/**
 * @internal
 * Owns everything about *what is shown and what is ticked*: the normalized
 * tree, the filtered forest, auto-expansion, the user's own
 * expand/collapse, and the selection. To start over — as
 * TreePicker does each time it opens — remount the owner.
 */

type UseTreeSelectionOptions<T> = {
  items: ReadonlyArray<T>;
  mapItem: (item: T, context: TreeMapItemContext<T>) => TreeMappedItem<T>;
  filter?: (item: T, context: TreeFilterContext<T>) => boolean;
  /** Ignores every toggle (the whole tree is disabled). */
  disabled?: boolean;
  /**
   * Whether the parent owns the value. Defaults to `value !== undefined`; pass
   * `true` when a `value` prop is present, so a controlled `undefined` (e.g. a
   * form reset) reads as an empty selection instead of stale internal state.
   */
  controlled?: boolean;
  selectionPropagation: TreeSelectionPropagation;
  valueStrategy: TreeValueStrategy;
} & TreeValueProps<T>;

export type UseTreeSelectionResult<T> = {
  tree: TreeNode<T>[];
  /** The forest to render: the whole tree, or the filtered one while `filter` is set. */
  kept: TreeNode<T>[];
  isExpanded(id: string): boolean;
  toggleExpand(id: string): void;
  setExpanded(id: string, next: boolean): void;
  /**
   * A row's checkbox, as `selectionPropagation` derives it. While filtering,
   * `node` holds only the matching children, but the checkbox still reflects
   * the whole group.
   */
  getCheckState(node: TreeNode<T>): { checked: boolean; indeterminate: boolean };
  /**
   * Ticks or clears a row, spreading as `selectionPropagation` says, in one
   * update. While filtering it acts on what's visible: a group whose visible
   * enabled leaves are all ticked clears them, otherwise it ticks them.
   */
  toggleRow(node: TreeNode<T>): void;
  /** The value's items in tree order, one per key. */
  selected: TreeSelectedItem<T>[];
  /** Selected keys that aren't in the tree (e.g. not loaded yet), kept as they were. */
  unknown: string[];
};

const EMPTY_KEYS: readonly string[] = [];

export function useTreeSelection<T>(
  options: UseTreeSelectionOptions<T>,
): UseTreeSelectionResult<T> {
  const { items, mapItem, filter, disabled = false, selectionPropagation, valueStrategy } = options;

  const tree = React.useMemo(() => buildTree(items, mapItem), [items, mapItem]);
  const index = React.useMemo(() => indexTree(tree), [tree]);

  const [userExpanded, setUserExpanded] = React.useState<Set<string>>(() => new Set());
  // Groups the user closed while a filter had them auto-expanded. Cleared when
  // the matches change, so a new search opens its matches again — but not when
  // an inline `filter` is merely recreated with the same matches.
  const [searchCollapsed, setSearchCollapsed] = React.useState<Set<string>>(() => new Set());

  const [keysState, setKeysState] = React.useState<readonly string[]>(
    () => options.defaultValue ?? EMPTY_KEYS,
  );

  const controlled = options.controlled ?? options.value !== undefined;
  // A controlled `undefined` is an empty selection, never stale internal state.
  const keysValue = controlled ? (options.value ?? EMPTY_KEYS) : keysState;

  const state = React.useMemo(
    () => readValue(index, keysValue, selectionPropagation),
    [index, keysValue, selectionPropagation],
  );

  const listed = React.useCallback(
    (next: CheckedState) => writeValue(index, next, selectionPropagation, valueStrategy),
    [index, selectionPropagation, valueStrategy],
  );

  const selected = React.useMemo(() => listed(state).map(toSelectedItem), [listed, state]);
  const { unknown } = state;

  const { kept, autoExpand, matchKey } = React.useMemo(() => {
    if (!filter) return { kept: tree, autoExpand: new Set<string>(), matchKey: null };
    return filterTree(tree, (node) =>
      filter(node.item, { label: node.label, parents: node.parents }),
    );
  }, [tree, filter]);

  React.useEffect(() => {
    setSearchCollapsed((prev) => (prev.size === 0 ? prev : new Set()));
  }, [matchKey]);

  const isExpanded = React.useCallback(
    (id: string) => (autoExpand.has(id) && !searchCollapsed.has(id)) || userExpanded.has(id),
    [autoExpand, searchCollapsed, userExpanded],
  );

  /**
   * Opens or closes a group. While filtering, a group the filter opened can
   * still be closed (and reopened) — it keeps showing only the matching items.
   */
  const setExpanded = React.useCallback(
    (id: string, next: boolean) => {
      setUserExpanded((prev) => {
        if (next === prev.has(id)) return prev;
        const updated = new Set(prev);
        if (next) updated.add(id);
        else updated.delete(id);
        return updated;
      });
      if (!autoExpand.has(id)) return;
      setSearchCollapsed((prev) => {
        if (next !== prev.has(id)) return prev;
        const updated = new Set(prev);
        if (next) updated.delete(id);
        else updated.add(id);
        return updated;
      });
    },
    [autoExpand],
  );

  const toggleExpand = React.useCallback(
    (id: string) => setExpanded(id, !isExpanded(id)),
    [isExpanded, setExpanded],
  );

  React.useEffect(() => {
    if (index.mixedKeys.length === 0) return;
    console.warn(
      `[Tree] These keys are a parent in one place and a leaf in another: ${index.mixedKeys
        .map((key) => JSON.stringify(key))
        .join(
          ", ",
        )}. A key is one item, so give each a unique key (mapItem receives the item's parents).`,
    );
  }, [index]);

  const getCheckState = React.useCallback(
    (node: TreeNode<T>) =>
      checkState(index.byId.get(node.id) ?? node, state.checked, selectionPropagation),
    [index, state, selectionPropagation],
  );

  const { onValueChange } = options;
  const toggleNode = React.useCallback(
    (node: TreeNode<T>, next: boolean) => {
      if (disabled) return;
      const checked = toggleChecked(node, next, state.checked, selectionPropagation);
      if (checked === state.checked) return;

      const nextState = { checked, unknown: state.unknown };
      const nodes = listed(nextState);
      const value = [...nodes.map((entry) => entry.key), ...state.unknown];
      if (!controlled) setKeysState(value);
      onValueChange?.(value, { selected: nodes.map(toSelectedItem) });
    },
    [controlled, disabled, listed, onValueChange, selectionPropagation, state],
  );

  const toggleRow = React.useCallback(
    (node: TreeNode<T>) =>
      toggleNode(node, !checkState(node, state.checked, selectionPropagation).checked),
    [toggleNode, state, selectionPropagation],
  );

  return {
    tree,
    kept,
    isExpanded,
    toggleExpand,
    setExpanded,
    getCheckState,
    toggleRow,
    selected,
    unknown,
  };
}
