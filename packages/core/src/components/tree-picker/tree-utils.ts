import type { TreePickerNode } from "./types";

/**
 * @internal
 * Pure tree helpers for the picker. Kept free of React so they can be unit
 * tested directly and reused by both the selection and focus hooks.
 */

/** A node is a leaf when it has no children — leaves are the selectable units. */
export function isLeaf<T>(node: TreePickerNode<T>): boolean {
  return !node.children || node.children.length === 0;
}

/**
 * Collect the ids of every leaf in the subtree rooted at `node`, in DFS order.
 * A leaf node yields its own id.
 */
export function leafIds<T>(node: TreePickerNode<T>, into: string[] = []): string[] {
  if (isLeaf(node)) {
    into.push(node.id);
    return into;
  }
  for (const child of node.children ?? []) leafIds(child, into);
  return into;
}

/** Collect every leaf node in the forest, in DFS order. */
export function allLeaves<T>(
  nodes: ReadonlyArray<TreePickerNode<T>>,
  into: TreePickerNode<T>[] = [],
): TreePickerNode<T>[] {
  for (const node of nodes) {
    if (isLeaf(node)) into.push(node);
    else allLeaves(node.children ?? [], into);
  }
  return into;
}

/**
 * Filter the forest by `matches`.
 *
 * A leaf survives only if it matches. A parent survives if it matches OR any of
 * its descendants survive — in which case it is returned as a *clone* holding
 * only the surviving children (a parent that matches on its own but has no
 * surviving descendant keeps its full child list, so the user can still drill
 * into it).
 *
 * `autoExpand` collects every parent that has a surviving descendant, so the
 * matching rows are reachable without manual expansion.
 */
export function filterTree<T>(
  nodes: ReadonlyArray<TreePickerNode<T>>,
  matches: (node: TreePickerNode<T>) => boolean,
): { kept: TreePickerNode<T>[]; autoExpand: Set<string> } {
  const autoExpand = new Set<string>();

  const walk = (list: ReadonlyArray<TreePickerNode<T>>): TreePickerNode<T>[] => {
    const out: TreePickerNode<T>[] = [];
    for (const node of list) {
      if (isLeaf(node)) {
        if (matches(node)) out.push(node);
        continue;
      }
      const keptChildren = walk(node.children ?? []);
      if (keptChildren.length > 0) {
        autoExpand.add(node.id);
        out.push({ ...node, children: keptChildren });
      } else if (matches(node)) {
        out.push(node);
      }
    }
    return out;
  };

  return { kept: walk(nodes), autoExpand };
}

/**
 * Default search predicate: case-insensitive substring match on
 * `String(node.data)`. Only meaningful for primitive payloads — consumers with
 * object payloads must supply their own `matchesSearch`.
 */
export function defaultMatcher<T>(node: TreePickerNode<T>, query: string): boolean {
  return String(node.data ?? "")
    .toLowerCase()
    .includes(query.toLowerCase());
}

/** One row as it appears on screen, flattened for roving-tabindex keyboard nav. */
export type VisibleRow<T> = {
  node: TreePickerNode<T>;
  depth: number;
  /** `null` for top-level rows. */
  parentId: string | null;
  leaf: boolean;
  expanded: boolean;
};

/**
 * Flatten the forest into the rows that are actually rendered: a collapsed
 * parent's children are not visible and therefore not included.
 */
export function flattenVisible<T>(
  nodes: ReadonlyArray<TreePickerNode<T>>,
  isExpanded: (id: string) => boolean,
  depth = 0,
  parentId: string | null = null,
  into: VisibleRow<T>[] = [],
): VisibleRow<T>[] {
  for (const node of nodes) {
    const leaf = isLeaf(node);
    const expanded = !leaf && isExpanded(node.id);
    into.push({ node, depth, parentId, leaf, expanded });
    if (expanded) flattenVisible(node.children ?? [], isExpanded, depth + 1, node.id, into);
  }
  return into;
}
