/**
 * How ticking spreads through the tree.
 *
 * - `"full"`: parents are containers. Ticking one ticks every leaf beneath it,
 *   and its checkbox is derived from its leaves (checked or indeterminate).
 * - `"down"`: parents are items in their own right. Ticking one also ticks
 *   everything beneath it, but unticking a child leaves it ticked.
 * - `"none"`: every item is ticked on its own.
 */
export type TreeSelectionPropagation = "full" | "down" | "none";

/**
 * What the value lists.
 *
 * - `"leaves"`: the checked leaves.
 * - `"topmost"`: a parent in place of its leaves once every leaf beneath it is
 *   checked. A parent key then means "everything beneath it".
 * - `"all"`: every checked item, parents included.
 */
export type TreeValueStrategy = "leaves" | "topmost" | "all";

/**
 * How ticking works and what the value lists. Only some combinations make
 * sense: when parents are items in their own right, only `"all"` keeps their
 * state, so it's the one value strategy they allow.
 */
export type TreeSelectionBehaviorProps =
  | {
      /** How ticking spreads through the tree. Default `"full"`. */
      selectionPropagation?: "full";
      /** What the value lists. Default `"leaves"`. */
      valueStrategy?: TreeValueStrategy;
    }
  | {
      /** How ticking spreads through the tree. Default `"full"`. */
      selectionPropagation: "down" | "none";
      /** What the value lists. `"all"` is the only strategy that keeps a parent's own state. */
      valueStrategy?: "all";
    };

/** How the model reads one of your items: its identity, text, children and lock. */
export type TreeNodeInput<T> = {
  key: string;
  label: string;
  children?: ReadonlyArray<T>;
  disabled?: boolean;
};

/** One entry of a value: the key, your item, and its ancestors (top level first). */
export type TreeEntry<T> = {
  key: string;
  item: T;
  parents: T[];
};
