import type {
  TreeMapItemContext,
  TreeMappedItem,
  TreeSelectedItem,
  TreeSelectionPropagation,
  TreeSelectionStrategy,
  TreeValueStrategy,
} from "./types";

/**
 * @internal
 * Pure tree helpers, free of React so they can be unit tested directly.
 *
 * Consumers pass their own items plus `mapItem`; `buildTree` turns those into
 * normalized nodes once. A node's `key` is its identity in the value: the same
 * key in two places is one item. Each rendered row also gets an `id` from its
 * path, since one key can appear in several places on screen.
 */

export type TreeNode<T> = {
  /** The row's identity on screen: its encoded path. Unique even when keys repeat. */
  id: string;
  key: string;
  label: string;
  path: string[];
  item: T;
  parents: T[];
  children: TreeNode<T>[];
  isLeaf: boolean;
  /** The item's own `disabled`, or one inherited from an ancestor. */
  disabled: boolean;
  /**
   * Every leaf beneath is disabled (a leaf: it is). With `"full"` propagation a
   * parent is only a container, so such a parent is locked too.
   */
  noEnabledLeaves: boolean;
};

/** Encodes a path as a string. JSON keeps keys containing `/` or `,` unambiguous. */
export function pathId(path: readonly string[]): string {
  return JSON.stringify(path);
}

export function buildTree<T>(
  items: ReadonlyArray<T>,
  mapItem: (item: T, context: TreeMapItemContext<T>) => TreeMappedItem<T>,
  parentPath: string[] = [],
  parents: T[] = [],
  parentDisabled = false,
): TreeNode<T>[] {
  return items.map((item) => {
    const mapped = mapItem(item, { parents });
    const path = [...parentPath, mapped.key];
    const ownDisabled = parentDisabled || mapped.disabled === true;
    const children = buildTree(
      mapped.children ?? [],
      mapItem,
      path,
      [...parents, item],
      ownDisabled,
    );
    const isLeaf = children.length === 0;
    return {
      noEnabledLeaves: isLeaf ? ownDisabled : children.every((child) => child.noEnabledLeaves),
      id: pathId(path),
      key: mapped.key,
      label: mapped.label,
      path,
      item,
      parents,
      children,
      isLeaf,
      disabled: ownDisabled,
    };
  });
}

/** Every leaf beneath `node` (or `node` itself when it is a leaf), in tree order. */
export function leavesOf<T>(node: TreeNode<T>, into: TreeNode<T>[] = []): TreeNode<T>[] {
  if (node.isLeaf) {
    into.push(node);
    return into;
  }
  for (const child of node.children) leavesOf(child, into);
  return into;
}

/** Every leaf in the forest, in tree order. */
export function allLeaves<T>(nodes: ReadonlyArray<TreeNode<T>>): TreeNode<T>[] {
  const into: TreeNode<T>[] = [];
  for (const node of nodes) leavesOf(node, into);
  return into;
}

/**
 * Filters the forest by `matches`.
 *
 * A leaf survives only if it matches. A parent survives if it matches OR any of
 * its descendants survive — in which case it is returned as a *clone* holding
 * only the surviving children (a parent that matches on its own but has no
 * surviving descendant keeps its full child list, so the user can still drill
 * into it). `autoExpand` collects every parent with a surviving descendant, and
 * `matchKey` names the set of surviving rows, so callers can tell a new set of
 * matches from the same one found again.
 */
export function filterTree<T>(
  nodes: ReadonlyArray<TreeNode<T>>,
  matches: (node: TreeNode<T>) => boolean,
): { kept: TreeNode<T>[]; autoExpand: Set<string>; matchKey: string } {
  const autoExpand = new Set<string>();
  const survivors: string[] = [];

  const walk = (list: ReadonlyArray<TreeNode<T>>): TreeNode<T>[] => {
    const out: TreeNode<T>[] = [];
    for (const node of list) {
      if (node.isLeaf) {
        if (matches(node)) {
          survivors.push(node.id);
          out.push(node);
        }
        continue;
      }
      const keptChildren = walk(node.children);
      if (keptChildren.length > 0) {
        survivors.push(node.id);
        autoExpand.add(node.id);
        out.push({ ...node, children: keptChildren });
      } else if (matches(node)) {
        survivors.push(node.id);
        out.push(node);
      }
    }
    return out;
  };

  const kept = walk(nodes);
  return { kept, autoExpand, matchKey: survivors.join("\n") };
}

/** One row as it appears on screen, flattened for roving-tabindex keyboard nav. */
export type VisibleRow<T> = {
  node: TreeNode<T>;
  depth: number;
  /** `null` for top-level rows. */
  parentId: string | null;
  expanded: boolean;
};

/** The rows actually rendered: a collapsed parent's children are left out. */
export function flattenVisible<T>(
  nodes: ReadonlyArray<TreeNode<T>>,
  isExpanded: (id: string) => boolean,
  depth = 0,
  parentId: string | null = null,
  into: VisibleRow<T>[] = [],
): VisibleRow<T>[] {
  for (const node of nodes) {
    const expanded = !node.isLeaf && isExpanded(node.id);
    into.push({ node, depth, parentId, expanded });
    if (expanded) flattenVisible(node.children, isExpanded, depth + 1, node.id, into);
  }
  return into;
}

/* -------------------------------------------------------------- selection */

/** Lookups the selection helpers share, built once per tree. */
export type TreeIndex<T> = {
  tree: TreeNode<T>[];
  /** Every node, in tree order (a parent before its children). */
  nodes: TreeNode<T>[];
  /** Every row a key appears on. */
  byKey: Map<string, TreeNode<T>[]>;
  /** Every row, by its id. */
  byId: Map<string, TreeNode<T>>;
  /**
   * Keys that are a parent in one place and a leaf in another. One key is one
   * item, and an item can't both have children and not, so these can't be
   * ticked consistently.
   */
  mixedKeys: string[];
};

export function indexTree<T>(tree: TreeNode<T>[]): TreeIndex<T> {
  const nodes: TreeNode<T>[] = [];
  const byKey = new Map<string, TreeNode<T>[]>();
  const byId = new Map<string, TreeNode<T>>();
  const walk = (list: ReadonlyArray<TreeNode<T>>) => {
    for (const node of list) {
      nodes.push(node);
      byId.set(node.id, node);
      const rows = byKey.get(node.key);
      if (rows) rows.push(node);
      else byKey.set(node.key, [node]);
      walk(node.children);
    }
  };
  walk(tree);
  const mixedKeys = [...byKey]
    .filter(([, rows]) => rows.some((row) => row.isLeaf) && rows.some((row) => !row.isLeaf))
    .map(([key]) => key);
  return { tree, nodes, byKey, byId, mixedKeys };
}

/** The checked keys a value stands for, plus the keys that aren't in the tree. */
export type CheckedState = { checked: ReadonlySet<string>; unknown: string[] };

/**
 * Reads a value. With `"full"` propagation only leaves hold state, so a parent
 * key stands for every leaf beneath it. With the others, each key is that item
 * alone. Keys that aren't in the tree (e.g. not loaded yet) are kept as they are.
 */
export function readValue<T>(
  index: TreeIndex<T>,
  value: readonly string[],
  propagation: TreeSelectionPropagation,
): CheckedState {
  const checked = new Set<string>();
  const unknown: string[] = [];
  for (const key of value) {
    const rows = index.byKey.get(key);
    if (rows === undefined) {
      if (!unknown.includes(key)) unknown.push(key);
    } else if (propagation === "full") {
      for (const row of rows) for (const leaf of leavesOf(row)) checked.add(leaf.key);
    } else {
      checked.add(key);
    }
  }
  return { checked, unknown };
}

/** Every leaf beneath `node` is checked, disabled ones included. */
function fullyChecked<T>(node: TreeNode<T>, checked: ReadonlySet<string>): boolean {
  return leavesOf(node).every((leaf) => checked.has(leaf.key));
}

/**
 * A row's checkbox. With `"full"` propagation a parent shows its leaves: checked
 * when every **enabled** leaf is (disabled ones can't be changed, so they don't
 * hold a parent back), and indeterminate when only some are. With the others a
 * row shows its own state.
 */
export function checkState<T>(
  node: TreeNode<T>,
  checked: ReadonlySet<string>,
  propagation: TreeSelectionPropagation,
): { checked: boolean; indeterminate: boolean } {
  if (node.isLeaf || propagation !== "full") {
    return { checked: checked.has(node.key), indeterminate: false };
  }
  const leaves = leavesOf(node);
  const enabled = leaves.filter((leaf) => !leaf.disabled);
  const pool = enabled.length > 0 ? enabled : leaves;
  const isChecked = (leaf: TreeNode<T>) => checked.has(leaf.key);
  const all = pool.length > 0 && pool.every(isChecked);
  return { checked: all, indeterminate: !all && leaves.some(isChecked) };
}

/** The descendants of `node`, in tree order. */
function descendantsOf<T>(node: TreeNode<T>, into: TreeNode<T>[] = []): TreeNode<T>[] {
  for (const child of node.children) {
    into.push(child);
    descendantsOf(child, into);
  }
  return into;
}

/**
 * Ticks or clears `node`. `"full"` changes every enabled leaf beneath it,
 * `"down"` the node and every enabled item beneath it, and `"none"` the node
 * alone. Disabled items never change. Returns the same set when nothing does.
 */
export function toggleChecked<T>(
  node: TreeNode<T>,
  next: boolean,
  checked: ReadonlySet<string>,
  propagation: TreeSelectionPropagation,
): ReadonlySet<string> {
  let targets: TreeNode<T>[];
  if (propagation === "full") targets = leavesOf(node);
  else if (propagation === "down") targets = [node, ...descendantsOf(node)];
  else targets = [node];
  targets = targets.filter((target) => !target.disabled);
  if (targets.length === 0) return checked;

  const updated = new Set(checked);
  for (const target of targets) {
    if (next) updated.add(target.key);
    else updated.delete(target.key);
  }
  return updated;
}

/**
 * The items a checked set's value lists, in tree order and one per key (the
 * value is their keys, then `state.unknown`). `"topmost"` lists a parent once every leaf beneath it is
 * checked (disabled ones included, since the parent key stands for all of them)
 * and skips what's beneath it. `"all"` with `"full"` lists those parents and
 * every checked leaf.
 */
export function writeValue<T>(
  index: TreeIndex<T>,
  state: CheckedState,
  propagation: TreeSelectionPropagation,
  strategy: TreeValueStrategy,
): TreeNode<T>[] {
  const { checked } = state;
  const out: TreeNode<T>[] = [];
  const seen = new Set<string>();
  const push = (node: TreeNode<T>) => {
    if (seen.has(node.key)) return;
    seen.add(node.key);
    out.push(node);
  };

  if (propagation !== "full") {
    for (const node of index.nodes) if (checked.has(node.key)) push(node);
    return out;
  }

  const walk = (list: ReadonlyArray<TreeNode<T>>) => {
    for (const node of list) {
      if (node.isLeaf) {
        if (checked.has(node.key)) push(node);
        continue;
      }
      if (strategy !== "leaves" && fullyChecked(node, checked)) {
        push(node);
        if (strategy === "topmost") continue;
      }
      walk(node.children);
    }
  };
  walk(index.tree);
  return out;
}

export function toSelectedItem<T>(node: TreeNode<T>): TreeSelectedItem<T> {
  return { key: node.key, item: node.item, parents: node.parents };
}

/** Splits a public selection strategy into how ticking spreads and what the value lists. */
export function resolveSelectionStrategy(strategy: TreeSelectionStrategy = "leaves"): {
  propagation: TreeSelectionPropagation;
  valueStrategy: TreeValueStrategy;
} {
  if (strategy === "cascade") return { propagation: "down", valueStrategy: "all" };
  if (strategy === "independent") return { propagation: "none", valueStrategy: "all" };
  return { propagation: "full", valueStrategy: strategy };
}
