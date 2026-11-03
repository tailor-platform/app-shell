import * as React from "react";

import {
  allLeaves,
  buildTree,
  filterTree,
  idsFromKeys,
  keysFromIds,
  leavesOf,
  toSelectedItem,
  type TreeNode,
} from "./tree-model";
import type { TreeMapItemContext, TreeMappedItem, TreeSelectedItem, TreeValueProps } from "./types";

/**
 * @internal
 * Owns everything about *what is shown and what is ticked*: the normalized
 * tree, the search query and filtered forest, auto-expansion, the user's own
 * expand/collapse, and the selection. To start over — as
 * TreePicker does each time it opens — remount the owner.
 */

type UseTreeSelectionOptions<T> = {
  items: ReadonlyArray<T>;
  mapItem: (item: T, context: TreeMapItemContext<T>) => TreeMappedItem<T>;
  matchesSearch?: (item: T, query: string) => boolean;
  /** Ignores every toggle (the whole tree is disabled). */
  disabled?: boolean;
  /**
   * Whether the parent owns the value. Defaults to `value !== undefined`; pass
   * `true` when a `value` prop is present, so a controlled `undefined` (e.g. a
   * form reset) reads as an empty selection instead of stale internal state.
   */
  controlled?: boolean;
} & TreeValueProps<T>;

export type UseTreeSelectionResult<T> = {
  tree: TreeNode<T>[];
  query: string;
  setQuery(query: string): void;
  /** The forest to render — the whole tree when the query is empty, filtered otherwise. */
  kept: TreeNode<T>[];
  isExpanded(id: string): boolean;
  toggleExpand(id: string): void;
  setExpanded(id: string, next: boolean): void;
  isSelected(leaf: TreeNode<T>): boolean;
  /** Selects or clears every enabled leaf beneath `node` in one update. */
  toggleNode(node: TreeNode<T>, next: boolean): void;
  /** Selected leaves in tree order, one per key. */
  selected: TreeSelectedItem<T>[];
  /** Selected keys that aren't in the tree (e.g. not loaded yet), kept as they were. */
  unknown: string[];
};

const EMPTY_KEYS: readonly string[] = [];

export function useTreeSelection<T>(
  options: UseTreeSelectionOptions<T>,
): UseTreeSelectionResult<T> {
  const { items, mapItem, matchesSearch, disabled = false } = options;

  const tree = React.useMemo(() => buildTree(items, mapItem), [items, mapItem]);
  const leaves = React.useMemo(() => allLeaves(tree), [tree]);

  const [query, setQuery] = React.useState("");
  const [userExpanded, setUserExpanded] = React.useState<Set<string>>(() => new Set());
  // Groups the user closed while a search had them auto-expanded. Cleared when
  // the query changes, so a new search opens its matches again.
  const [searchCollapsed, setSearchCollapsed] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setSearchCollapsed((prev) => (prev.size === 0 ? prev : new Set()));
  }, [query]);

  const [keysState, setKeysState] = React.useState<readonly string[]>(
    () => options.defaultValue ?? EMPTY_KEYS,
  );

  const controlled = options.controlled ?? options.value !== undefined;
  // A controlled `undefined` is an empty selection, never stale internal state.
  const keysValue = controlled ? (options.value ?? EMPTY_KEYS) : keysState;

  const selectedIds = React.useMemo(() => idsFromKeys(leaves, keysValue), [leaves, keysValue]);

  const selectedFrom = React.useCallback(
    (ids: ReadonlySet<string>): TreeSelectedItem<T>[] => {
      const out: TreeSelectedItem<T>[] = [];
      const seenKeys = new Set<string>();
      for (const leaf of leaves) {
        if (!ids.has(leaf.id) || seenKeys.has(leaf.key)) continue;
        seenKeys.add(leaf.key);
        out.push(toSelectedItem(leaf));
      }
      return out;
    },
    [leaves],
  );

  const selected = React.useMemo(() => selectedFrom(selectedIds), [selectedFrom, selectedIds]);

  const unknown = React.useMemo(() => {
    const known = new Set(leaves.map((leaf) => leaf.key));
    return keysValue.filter((key) => !known.has(key));
  }, [leaves, keysValue]);

  const { kept, autoExpand } = React.useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === "") return { kept: tree, autoExpand: new Set<string>() };
    const needle = trimmed.toLowerCase();
    return filterTree(tree, (node) =>
      matchesSearch ? matchesSearch(node.item, trimmed) : node.label.toLowerCase().includes(needle),
    );
  }, [tree, query, matchesSearch]);

  const isExpanded = React.useCallback(
    (id: string) => (autoExpand.has(id) && !searchCollapsed.has(id)) || userExpanded.has(id),
    [autoExpand, searchCollapsed, userExpanded],
  );

  /**
   * Opens or closes a group. While searching, a group the search opened can
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

  const isSelected = React.useCallback(
    (leaf: TreeNode<T>) => selectedIds.has(leaf.id),
    [selectedIds],
  );

  const { onValueChange } = options;
  const toggleNode = React.useCallback(
    (node: TreeNode<T>, next: boolean) => {
      if (disabled) return;
      // Disabled leaves can't be changed, so a parent toggle skips them.
      const affected = leavesOf(node).filter((leaf) => !leaf.disabled);
      if (affected.length === 0) return;

      const updated = new Set(selectedIds);
      // A key is the identity, so every leaf sharing a key follows it.
      const keys = new Set(affected.map((leaf) => leaf.key));
      for (const leaf of leaves) {
        if (!keys.has(leaf.key)) continue;
        if (next) updated.add(leaf.id);
        else updated.delete(leaf.id);
      }

      const value = keysFromIds(leaves, updated, keysValue);
      if (!controlled) setKeysState(value);
      onValueChange?.(value, { selected: selectedFrom(updated) });
    },
    [controlled, disabled, keysValue, leaves, onValueChange, selectedFrom, selectedIds],
  );

  return {
    tree,
    query,
    setQuery,
    kept,
    isExpanded,
    toggleExpand,
    setExpanded,
    isSelected,
    toggleNode,
    selected,
    unknown,
  };
}
