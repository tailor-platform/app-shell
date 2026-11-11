import * as React from "react";

import {
  buildTree,
  checkState,
  filterTree,
  indexTree,
  readValue,
  resolveSelectionStrategy,
  toggleChecked,
  toSelectedItem,
  writeValue,
  type CheckedState,
  type TreeNode,
} from "@/lib/tree/model";
import { useTreeExpansion } from "@/lib/tree/use-tree-expansion";
import type {
  TreeFilterContext,
  TreeMapItemContext,
  TreeMappedItem,
  TreeSelectedItem,
  TreeValueProps,
} from "./types";
import type { TreeSelectionStrategy } from "@/lib/tree/types";

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
  /** How ticking works and what the value lists. Default `"leaves"`. */
  selectionStrategy?: TreeSelectionStrategy;
} & TreeValueProps<T>;

export type UseTreeSelectionResult<T> = {
  tree: TreeNode<T>[];
  /** The forest to render: the whole tree, or the filtered one while `filter` is set. */
  kept: TreeNode<T>[];
  isExpanded(id: string): boolean;
  toggleExpand(id: string): void;
  setExpanded(id: string, next: boolean): void;
  /**
   * A row's checkbox, as `selectionStrategy` derives it. While filtering,
   * `node` holds only the matching children, but the checkbox still reflects
   * the whole group.
   */
  getCheckState(node: TreeNode<T>): { checked: boolean; indeterminate: boolean };
  /**
   * Ticks or clears a row, spreading as `selectionStrategy` says, in one
   * update. While filtering it acts on what's visible: a group whose visible
   * enabled leaves are all ticked clears them, otherwise it ticks them.
   */
  toggleRow(node: TreeNode<T>): void;
  /** The value's items in tree order, one per key. */
  selected: TreeSelectedItem<T>[];
  /**
   * Whether parents are containers (`"leaves"`, `"topmost"`, `"all"`): their
   * checkbox comes from their leaves, rather than being an item of their own.
   */
  parentsAreContainers: boolean;
  /** Selected keys that aren't in the tree (e.g. not loaded yet), kept as they were. */
  unknown: string[];
};

const EMPTY_KEYS: readonly string[] = [];

export function useTreeSelection<T>(
  options: UseTreeSelectionOptions<T>,
): UseTreeSelectionResult<T> {
  const { items, mapItem, filter, disabled = false } = options;
  const { propagation: selectionPropagation, valueStrategy } = resolveSelectionStrategy(
    options.selectionStrategy,
  );

  const tree = React.useMemo(() => buildTree(items, mapItem), [items, mapItem]);
  const index = React.useMemo(() => indexTree(tree), [tree]);

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

  const { isExpanded, setExpanded, toggleExpand } = useTreeExpansion({ autoExpand, matchKey });

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
    parentsAreContainers: selectionPropagation === "full",
  };
}
