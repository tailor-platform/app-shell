import * as React from "react";

import { allLeaves, defaultMatcher, filterTree, leafIds } from "./tree-utils";
import type { TreePickerNode } from "./types";

/**
 * @internal
 * Owns everything about *what is shown and what is ticked*: the search query,
 * the filtered forest, the auto-expand derivation, the leaf-only selection set,
 * and the user's manual expand/collapse set. All of it resets when the dialog
 * closes so each open starts clean.
 */

type UseTreeSelectionOptions<T> = {
  open: boolean;
  items: ReadonlyArray<TreePickerNode<T>>;
  matchesSearch?: (search: { node: TreePickerNode<T>; query: string }) => boolean;
};

type UseTreeSelectionResult<T> = {
  query: string;
  setQuery(query: string): void;
  /** The forest to render — `items` when the query is empty, filtered otherwise. */
  kept: TreePickerNode<T>[];
  /** `autoExpand.has(id) || userExpanded.has(id)` — manual state survives clearing the query. */
  isExpanded(id: string): boolean;
  toggleExpand(id: string): void;
  setExpanded(id: string, next: boolean): void;
  /** Leaf ids only — parents are never stored, their state is always derived. */
  selectedLeaves: ReadonlySet<string>;
  /** Adds/removes every descendant leaf of `node` in a single set update. */
  toggleNode(node: TreePickerNode<T>, next: boolean): void;
  /** Selected leaf nodes in DFS tree order. */
  selectedNodes: TreePickerNode<T>[];
};

export function useTreeSelection<T>({
  open,
  items,
  matchesSearch,
}: UseTreeSelectionOptions<T>): UseTreeSelectionResult<T> {
  const [query, setQuery] = React.useState("");
  const [selectedLeaves, setSelectedLeaves] = React.useState<Set<string>>(() => new Set());
  const [userExpanded, setUserExpanded] = React.useState<Set<string>>(() => new Set());
  // Groups the user closed while a search had them auto-expanded. Cleared when
  // the query changes, so a new search opens its matches again.
  const [searchCollapsed, setSearchCollapsed] = React.useState<Set<string>>(() => new Set());

  // Reset on close so the next open starts empty.
  React.useEffect(() => {
    if (open) return;
    setQuery("");
    setSelectedLeaves(new Set());
    setUserExpanded(new Set());
    setSearchCollapsed(new Set());
  }, [open]);

  React.useEffect(() => {
    setSearchCollapsed((prev) => (prev.size === 0 ? prev : new Set()));
  }, [query]);

  const { kept, autoExpand } = React.useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === "") return { kept: [...items], autoExpand: new Set<string>() };
    return filterTree(items, (node) =>
      matchesSearch ? matchesSearch({ node, query: trimmed }) : defaultMatcher(node, trimmed),
    );
  }, [items, query, matchesSearch]);

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

  const toggleNode = React.useCallback((node: TreePickerNode<T>, next: boolean) => {
    setSelectedLeaves((prev) => {
      const updated = new Set(prev);
      for (const id of leafIds(node)) {
        if (next) updated.add(id);
        else updated.delete(id);
      }
      return updated;
    });
  }, []);

  // Ordered against the FULL tree, not the filtered one, so the commit order is
  // stable regardless of the query that was active when the user ticked a row.
  const leavesInTreeOrder = React.useMemo(() => allLeaves(items), [items]);
  const selectedNodes = React.useMemo(
    () => leavesInTreeOrder.filter((node) => selectedLeaves.has(node.id)),
    [leavesInTreeOrder, selectedLeaves],
  );

  return {
    query,
    setQuery,
    kept,
    isExpanded,
    toggleExpand,
    setExpanded,
    selectedLeaves,
    toggleNode,
    selectedNodes,
  };
}
