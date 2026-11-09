import type * as React from "react";

/**
 * How {@link Tree} reads one of your items. Mirrors `MappedItem` from
 * `Select` / `Combobox`, plus the tree's `children` and `disabled`.
 */
export type TreeMappedItem<T> = {
  /**
   * Identifies the item across the whole tree. The same key in two places is
   * one item: ticking one ticks both. When codes repeat with different meanings
   * (bin `A1` in two warehouses), compose a unique key from `parents`.
   */
  key: string;
  /** Plain text: the default row content, the default search text, and the accessible name. */
  label: string;
  /** The item's children. Omitted or empty means a leaf, and only leaves are selectable values. */
  children?: ReadonlyArray<T>;
  /** Locks the item. A disabled parent locks everything beneath it. */
  disabled?: boolean;
};

/** One entry of the value, as reported by `onValueChange` and `TreePicker`'s `onCommit`. */
export type TreeSelectedItem<T> = {
  key: string;
  /** Your original item. */
  item: T;
  /** The item's ancestors, top level first. */
  parents: T[];
};

export type TreeChangeDetails<T> = {
  /** The value's items in tree order, one per key. Keys that aren't in the tree are left out. */
  selected: TreeSelectedItem<T>[];
};

/** What `renderItem` receives for each row. */
export type TreeRowState<T> = {
  item: T;
  key: string;
  parents: T[];
  /** 0 for top-level rows. */
  depth: number;
  isLeaf: boolean;
  /** The row's checkbox is ticked. Under `"leaves"`, `"topmost"` and `"all"`, a parent is ticked when every enabled leaf beneath it is. */
  checked: boolean;
  /** Under `"leaves"`, `"topmost"` and `"all"`, a parent with some, but not all, enabled leaves ticked. */
  indeterminate: boolean;
  /** The row is the selected one, in `"single"` mode. */
  selected: boolean;
  expanded: boolean;
  disabled: boolean;
};

/** What `mapItem` receives alongside each item. */
export type TreeMapItemContext<T> = {
  /** The item's ancestors, top level first. Empty for top-level items. */
  parents: T[];
};

/** What `filter` receives alongside each item. */
export type TreeFilterContext<T> = {
  /** The item's `label` from `mapItem`. */
  label: string;
  /** The item's ancestors, top level first. */
  parents: T[];
};

/** What the tree shows — shared by `Tree` and `TreePicker`. */
export interface TreeContentProps<T> {
  /** Your top-level items. Children come from `mapItem`. */
  items: ReadonlyArray<T>;
  /** Reads an item's key, label, children and disabled state. */
  mapItem: (item: T, context: TreeMapItemContext<T>) => TreeMappedItem<T>;
  /** The row's content. Defaults to the item's `label`. */
  renderItem?: (row: TreeRowState<T>) => React.ReactNode;
  /** Shown when there's nothing to show. Defaults to "No items.", or "No matching items." while filtering. */
  emptyText?: React.ReactNode;
}

/** Props for {@link Tree}'s filtering. */
export type TreeFilterProps<T> = {
  /**
   * Shows only the items that match, plus their ancestors. Groups with a match
   * open on their own, and the user can still close them. A parent that matches
   * with no matching children keeps all its children, so it can still be opened.
   */
  filter?: (item: T, context: TreeFilterContext<T>) => boolean;
};

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

/** Internal: how ticking spreads through the tree. */
export type TreeSelectionPropagation = "full" | "down" | "none";

/** Internal: what the value lists. */
export type TreeValueStrategy = "leaves" | "topmost" | "all";

/** The selection: a list of keys. Which keys depends on `selectionStrategy`. */
export type TreeValueProps<T> = {
  /** Controlled selection: the checked keys. */
  value?: readonly string[];
  /** Initial selection when uncontrolled. */
  defaultValue?: readonly string[];
  onValueChange?: (value: string[], details: TreeChangeDetails<T>) => void;
};

/**
 * What clicking and Space do to a row.
 *
 * - `"none"`: nothing is selected. Clicking a leaf runs `onAction`, and clicking
 *   a parent opens or closes it. For browsing.
 * - `"single"`: one row is selected at a time, parents included (`selectedKey`).
 *   For master–detail views.
 * - `"checkbox"`: rows have checkboxes and the tree is a multi-select form
 *   control (`value`).
 */
export type TreeSelectionMode = "none" | "single" | "checkbox";

/**
 * Rules out another mode's props, so that (say) `name` without
 * `selectionMode: "checkbox"` is a type error rather than silently ignored.
 */
type Excluding<P> = { [K in Exclude<keyof P, "selectionMode">]?: never };

/** `"single"` mode's own props. */
type SingleSelectionOwnProps<T> = {
  /** What clicking and Space do to a row. Default `"none"`. */
  selectionMode: "single";
  /** Controlled selection: the selected row's key, or `null` for none. */
  selectedKey?: string | null;
  /** Initial selection when uncontrolled. */
  defaultSelectedKey?: string | null;
  /** Fires when the user selects a row, with its key and your item. */
  onSelectedKeyChange?: (key: string, item: T) => void;
  /**
   * Opens the selected row's ancestors when it starts out hidden or
   * `selectedKey` changes from outside, so the selection is always on screen.
   * A group the user closes afterwards stays closed. Default `true`.
   */
  revealSelected?: boolean;
};

/** `"checkbox"` mode's own props. */
type CheckboxSelectionOwnProps<T> = {
  /** What clicking and Space do to a row. Default `"none"`. */
  selectionMode: "checkbox";
  /**
   * Names the hidden inputs that carry the value on native form submission,
   * one per key (read with `formData.getAll(name)`). Inside a `Field.Root`, the
   * field's `name` wins.
   */
  name?: string;
  /** `id` of the form that owns the hidden inputs, when the tree is rendered outside it. */
  form?: string;
  /** The string written into each hidden input. Defaults to the item's key. */
  itemToStringValue?: (item: T, context: TreeMapItemContext<T>) => string;
  /** At least one item must be ticked before the owning form can submit. */
  required?: boolean;
  /**
   * Id for the tree's form control (Field generates one otherwise). A native
   * `<label htmlFor>` focuses the tree but doesn't name it — name it with a
   * `Field.Label`, `aria-label` or `aria-labelledby`.
   */
  id?: string;
  /** Ref to the hidden proxy input that carries `required` and Field validation. */
  inputRef?: React.Ref<HTMLInputElement>;
  /** Fires when focus leaves the tree (not each row). */
  onBlur?: () => void;
} & TreeValueProps<T> &
  TreeSelectionBehaviorProps;

/** Props for {@link Tree} with `selectionMode: "none"` (the default). */
export type TreeNoSelectionProps<T> = {
  /** What clicking and Space do to a row. Default `"none"`. */
  selectionMode?: "none";
} & Excluding<SingleSelectionOwnProps<T>> &
  Excluding<CheckboxSelectionOwnProps<T>>;

/** Props for {@link Tree} with `selectionMode: "single"`. */
export type TreeSingleSelectionProps<T> = SingleSelectionOwnProps<T> &
  Excluding<CheckboxSelectionOwnProps<T>>;

/** Props for {@link Tree} with `selectionMode: "checkbox"`: the value, how ticking works, and forms. */
export type TreeCheckboxSelectionProps<T> = CheckboxSelectionOwnProps<T> &
  Excluding<SingleSelectionOwnProps<T>>;

/** Props for {@link Tree}. */
export type TreeProps<T> = TreeContentProps<T> &
  TreeFilterProps<T> & {
    /**
     * Enter on a row — the row's default action. In `"none"` mode a click on a
     * leaf runs it too. In `"checkbox"` mode without `onAction`, Enter inside a
     * `<form>` submits it (like Enter in a text input).
     */
    onAction?: (item: T, key: string) => void;
    /** Locks the whole tree, and in `"checkbox"` mode leaves it out of form submission. */
    disabled?: boolean;
    /** Accessible name for the tree. Use this, `aria-labelledby`, or a `Field.Label`. */
    "aria-label"?: string;
    /** Id of the element naming the tree (e.g. a card or dialog title). */
    "aria-labelledby"?: string;
    /**
     * Merged onto the root. The list scrolls inside it, so give it a height (or
     * place it in a sized container) for long trees.
     */
    className?: string;
  } & (TreeNoSelectionProps<T> | TreeSingleSelectionProps<T> | TreeCheckboxSelectionProps<T>);
