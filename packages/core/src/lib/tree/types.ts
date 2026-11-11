/**
 * How ticking works and what the value lists. Take a parent P with leaves A and B:
 *
 * | Strategy               | Tick P       | Tick A and B | P ticked on its own? |
 * | ---------------------- | ------------ | ------------ | -------------------- |
 * | `"leaves"` (default)   | `[A, B]`     | `[A, B]`     | No                   |
 * | `"topmost"`            | `[P]`        | `[P]`        | No                   |
 * | `"all"`                | `[P, A, B]`  | `[P, A, B]`  | No                   |
 * | `"cascade"`            | `[P, A, B]`  | `[A, B]`     | Yes                  |
 * | `"independent"`        | `[P]`        | `[A, B]`     | Yes                  |
 *
 * - `"leaves"`, `"topmost"` and `"all"` treat parents as containers: a parent's
 *   checkbox comes from its leaves, so unticking A after ticking P leaves P
 *   indeterminate. With `"topmost"`, `P` stands for everything beneath it.
 * - `"cascade"` makes parents items in their own right. Ticking one also ticks
 *   everything beneath it, but unticking A leaves `[P, B]`, with P still ticked.
 * - `"independent"` ticks every item on its own.
 */
export type TreeSelectionStrategy = "leaves" | "topmost" | "all" | "cascade" | "independent";

/** How ticking works and what the value lists. */
export type TreeSelectionBehaviorProps = {
  /** How ticking works and what the value lists. Default `"leaves"`. */
  selectionStrategy?: TreeSelectionStrategy;
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
