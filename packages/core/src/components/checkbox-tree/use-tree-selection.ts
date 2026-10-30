import * as React from "react";

import {
  allLeaves,
  buildTree,
  filterTree,
  idsFromKeys,
  idsFromSelection,
  keysFromIds,
  leavesOf,
  selectionFromIds,
  toSelectedItem,
  unknownSelectionPaths,
  type TreeNode,
} from "./tree-model";
import type {
  CheckboxTreeChangeDetails,
  CheckboxTreeMappedItem,
  CheckboxTreeSelectedItem,
  CheckboxTreeSelection,
  CheckboxTreeValueProps,
} from "./types";

/**
 * @internal
 * Owns everything about *what is shown and what is ticked*: the normalized
 * tree, the search query and filtered forest, auto-expansion, the user's own
 * expand/collapse, and the selection in either value shape. To start over — as
 * CheckboxTreePicker does each time it opens — remount the owner.
 */

type UseTreeSelectionOptions<T> = {
  items: ReadonlyArray<T>;
  mapItem: (item: T) => CheckboxTreeMappedItem<T>;
  matchesSearch?: (item: T, query: string) => boolean;
  /** Ignores every toggle (the whole tree is disabled). */
  disabled?: boolean;
  /**
   * Whether the parent owns the value. Defaults to `value !== undefined`; pass
   * `true` when a `value` prop is present, so a controlled `undefined` (e.g. a
   * form reset) reads as an empty selection instead of stale internal state.
   */
  controlled?: boolean;
} & CheckboxTreeValueProps<T>;

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
  /** Selected leaves in tree order (one per key in the keys shape). */
  selected: CheckboxTreeSelectedItem<T>[];
  /**
   * Selected values that aren't in the tree, kept as they were: keys in the
   * keys shape (`[["key"]]`), leaf paths in the exact shape.
   */
  unknown: string[][];
};

const EMPTY_KEYS: readonly string[] = [];

export function useTreeSelection<T>(
  options: UseTreeSelectionOptions<T>,
): UseTreeSelectionResult<T> {
  const { items, mapItem, matchesSearch, disabled = false } = options;
  const exact = options.valueShape === "exact";

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

  // Each shape keeps its own uncontrolled state; only the active one is read.
  const [keysState, setKeysState] = React.useState<readonly string[]>(() =>
    !exact ? ((options.defaultValue as readonly string[] | undefined) ?? EMPTY_KEYS) : EMPTY_KEYS,
  );
  const [exactState, setExactState] = React.useState<CheckboxTreeSelection | undefined>(() =>
    exact ? (options.defaultValue as CheckboxTreeSelection | undefined) : undefined,
  );

  const controlled = options.controlled ?? options.value !== undefined;
  // A controlled `undefined` is an empty selection, never stale internal state.
  let keysValue: readonly string[] = EMPTY_KEYS;
  let exactValue: CheckboxTreeSelection | undefined;
  if (exact) {
    exactValue = controlled ? (options.value as CheckboxTreeSelection | undefined) : exactState;
  } else {
    keysValue = controlled
      ? ((options.value as readonly string[] | undefined) ?? EMPTY_KEYS)
      : keysState;
  }

  const selectedIds = React.useMemo(
    () => (exact ? idsFromSelection(tree, exactValue) : idsFromKeys(leaves, keysValue)),
    [exact, tree, leaves, exactValue, keysValue],
  );

  const selectedFrom = React.useCallback(
    (ids: ReadonlySet<string>): CheckboxTreeSelectedItem<T>[] => {
      const out: CheckboxTreeSelectedItem<T>[] = [];
      const seenKeys = new Set<string>();
      for (const leaf of leaves) {
        if (!ids.has(leaf.id)) continue;
        if (!exact) {
          if (seenKeys.has(leaf.key)) continue;
          seenKeys.add(leaf.key);
        }
        out.push(toSelectedItem(leaf));
      }
      return out;
    },
    [exact, leaves],
  );

  const selected = React.useMemo(() => selectedFrom(selectedIds), [selectedFrom, selectedIds]);

  const unknown = React.useMemo((): string[][] => {
    if (exact) return unknownSelectionPaths(tree, exactValue);
    const known = new Set(leaves.map((leaf) => leaf.key));
    return keysValue.filter((key) => !known.has(key)).map((key) => [key]);
  }, [exact, tree, exactValue, leaves, keysValue]);

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

  const onValueChange = options.onValueChange as
    | ((value: string[] | CheckboxTreeSelection, details: CheckboxTreeChangeDetails<T>) => void)
    | undefined;
  const toggleNode = React.useCallback(
    (node: TreeNode<T>, next: boolean) => {
      if (disabled) return;
      // Disabled leaves can't be changed, so a parent toggle skips them.
      const affected = leavesOf(node).filter((leaf) => !leaf.disabled);
      if (affected.length === 0) return;

      const updated = new Set(selectedIds);
      // In the keys shape a key is the identity, so every leaf sharing a key
      // follows it.
      const targets = exact
        ? affected
        : (() => {
            const keys = new Set(affected.map((leaf) => leaf.key));
            return leaves.filter((leaf) => keys.has(leaf.key));
          })();
      for (const leaf of targets) {
        if (next) updated.add(leaf.id);
        else updated.delete(leaf.id);
      }

      const details = { selected: selectedFrom(updated) };
      if (exact) {
        const value = selectionFromIds(tree, updated, exactValue);
        if (!controlled) setExactState(value);
        onValueChange?.(value, details);
      } else {
        const value = keysFromIds(leaves, updated, keysValue);
        if (!controlled) setKeysState(value);
        onValueChange?.(value, details);
      }
    },
    [
      controlled,
      disabled,
      exact,
      exactValue,
      keysValue,
      leaves,
      onValueChange,
      selectedFrom,
      selectedIds,
      tree,
    ],
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
