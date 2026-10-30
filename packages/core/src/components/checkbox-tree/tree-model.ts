import type {
  CheckboxTreeMappedItem,
  CheckboxTreeSelectedItem,
  CheckboxTreeSelection,
} from "./types";

/**
 * @internal
 * Pure tree helpers, free of React so they can be unit tested directly.
 *
 * Consumers pass their own items plus `mapItem`; `buildTree` turns those into
 * normalized nodes once. Every node is identified by its **path** (the keys
 * from the top level down), so a key only has to be unique among its siblings.
 */

export type TreeNode<T> = {
  /** Internal identity: the encoded path. Unique across the whole tree. */
  id: string;
  key: string;
  label: string;
  path: string[];
  item: T;
  parents: T[];
  children: TreeNode<T>[];
  isLeaf: boolean;
  /** Own, inherited from an ancestor, or a parent whose every leaf is disabled. */
  disabled: boolean;
};

/** Encodes a path as a string. JSON keeps keys containing `/` or `,` unambiguous. */
export function pathId(path: readonly string[]): string {
  return JSON.stringify(path);
}

export function buildTree<T>(
  items: ReadonlyArray<T>,
  mapItem: (item: T) => CheckboxTreeMappedItem<T>,
  parentPath: string[] = [],
  parents: T[] = [],
  parentDisabled = false,
): TreeNode<T>[] {
  return items.map((item) => {
    const mapped = mapItem(item);
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
      id: pathId(path),
      key: mapped.key,
      label: mapped.label,
      path,
      item,
      parents,
      children,
      isLeaf,
      disabled: ownDisabled || (!isLeaf && children.every((child) => child.disabled)),
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
 * into it). `autoExpand` collects every parent with a surviving descendant.
 */
export function filterTree<T>(
  nodes: ReadonlyArray<TreeNode<T>>,
  matches: (node: TreeNode<T>) => boolean,
): { kept: TreeNode<T>[]; autoExpand: Set<string> } {
  const autoExpand = new Set<string>();

  const walk = (list: ReadonlyArray<TreeNode<T>>): TreeNode<T>[] => {
    const out: TreeNode<T>[] = [];
    for (const node of list) {
      if (node.isLeaf) {
        if (matches(node)) out.push(node);
        continue;
      }
      const keptChildren = walk(node.children);
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

/**
 * A parent's checkbox state from its leaves. `checked` needs every **enabled**
 * leaf selected (disabled ones can't be changed, so they don't hold a parent
 * back); `indeterminate` shows when anything beneath is selected but the parent
 * isn't fully checked.
 */
export function checkState<T>(
  node: TreeNode<T>,
  isSelected: (leaf: TreeNode<T>) => boolean,
): { checked: boolean; indeterminate: boolean } {
  if (node.isLeaf) return { checked: isSelected(node), indeterminate: false };
  const leaves = leavesOf(node);
  const enabled = leaves.filter((leaf) => !leaf.disabled);
  const pool = enabled.length > 0 ? enabled : leaves;
  const checked = pool.length > 0 && pool.every(isSelected);
  const indeterminate = !checked && leaves.some(isSelected);
  return { checked, indeterminate };
}

export function toSelectedItem<T>(leaf: TreeNode<T>): CheckboxTreeSelectedItem<T> {
  return { key: leaf.key, path: leaf.path, item: leaf.item, parents: leaf.parents };
}

/* ------------------------------------------------------------- keys shape */

/** Leaf ids selected by a list of keys: every leaf whose key is listed, wherever it sits. */
export function idsFromKeys<T>(leaves: ReadonlyArray<TreeNode<T>>, keys: readonly string[]) {
  const wanted = new Set(keys);
  return new Set(leaves.filter((leaf) => wanted.has(leaf.key)).map((leaf) => leaf.id));
}

/**
 * The keys value after a selection change. Keys present in the tree are listed
 * in tree order; keys that aren't in the tree (e.g. items not loaded yet) are
 * kept as they were, since nothing on screen could have changed them.
 */
export function keysFromIds<T>(
  leaves: ReadonlyArray<TreeNode<T>>,
  ids: ReadonlySet<string>,
  previous: readonly string[],
): string[] {
  const known = new Set(leaves.map((leaf) => leaf.key));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const leaf of leaves) {
    if (!ids.has(leaf.id) || seen.has(leaf.key)) continue;
    seen.add(leaf.key);
    out.push(leaf.key);
  }
  for (const key of previous) {
    if (!known.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/* ------------------------------------------------------------ exact shape */

/** Leaf ids selected by an exact selection. `true` on a parent selects every leaf beneath it. */
export function idsFromSelection<T>(
  nodes: ReadonlyArray<TreeNode<T>>,
  selection: CheckboxTreeSelection | undefined,
): Set<string> {
  const ids = new Set<string>();
  const walk = (list: ReadonlyArray<TreeNode<T>>, level: CheckboxTreeSelection) => {
    for (const node of list) {
      const entry = level[node.key];
      if (entry === undefined) continue;
      if (entry === true) {
        for (const leaf of leavesOf(node)) ids.add(leaf.id);
      } else if (!node.isLeaf) {
        walk(node.children, entry);
      }
    }
  };
  if (selection) walk(nodes, selection);
  return ids;
}

/**
 * The exact value after a selection change: every selected leaf listed
 * explicitly, plus any branches of the previous value that don't exist in the
 * tree (kept as they were, like unknown keys in the keys shape).
 */
export function selectionFromIds<T>(
  nodes: ReadonlyArray<TreeNode<T>>,
  ids: ReadonlySet<string>,
  previous: CheckboxTreeSelection | undefined,
): CheckboxTreeSelection {
  const out: CheckboxTreeSelection = {};
  for (const leaf of allLeaves(nodes)) {
    if (!ids.has(leaf.id)) continue;
    let level = out;
    leaf.path.forEach((key, index) => {
      if (index === leaf.path.length - 1) {
        level[key] = true;
        return;
      }
      const next = level[key];
      if (next === undefined || next === true) level[key] = {};
      level = level[key] as CheckboxTreeSelection;
    });
  }
  if (previous) mergeUnknown(out, previous, nodes);
  return out;
}

/**
 * The leaf paths an exact selection lists that don't exist in the tree (e.g.
 * items not loaded yet). They're kept in the value, so they're submitted too.
 */
export function unknownSelectionPaths<T>(
  nodes: ReadonlyArray<TreeNode<T>>,
  selection: CheckboxTreeSelection | undefined,
  prefix: string[] = [],
): string[][] {
  if (!selection) return [];
  const out: string[][] = [];
  for (const [key, entry] of Object.entries(selection)) {
    const path = [...prefix, key];
    const matching = nodes.filter((node) => node.key === key);
    if (matching.length === 0) {
      out.push(...selectionLeafPaths(entry, path));
      continue;
    }
    if (entry === true) continue;
    const children = matching.flatMap((node) => node.children);
    if (children.length > 0) out.push(...unknownSelectionPaths(children, entry, path));
  }
  return out;
}

function selectionLeafPaths(entry: true | CheckboxTreeSelection, path: string[]): string[][] {
  if (entry === true) return [path];
  return Object.entries(entry).flatMap(([key, child]) => selectionLeafPaths(child, [...path, key]));
}

function mergeUnknown<T>(
  out: CheckboxTreeSelection,
  previous: CheckboxTreeSelection,
  nodes: ReadonlyArray<TreeNode<T>>,
) {
  for (const [key, entry] of Object.entries(previous)) {
    const matching = nodes.filter((node) => node.key === key);
    if (matching.length === 0) {
      out[key] = entry;
      continue;
    }
    if (entry === true) continue;
    const children = matching.flatMap((node) => node.children);
    if (children.length === 0) continue;
    const target = out[key];
    const level: CheckboxTreeSelection = target && target !== true ? target : {};
    mergeUnknown(level, entry, children);
    if (Object.keys(level).length > 0 && target !== true) out[key] = level;
  }
}
