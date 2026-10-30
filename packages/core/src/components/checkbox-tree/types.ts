import type * as React from "react";

/**
 * How {@link CheckboxTree} reads one of your items. Mirrors `MappedItem` from
 * `Select` / `Combobox`, plus the tree's `children` and `disabled`.
 */
export type CheckboxTreeMappedItem<T> = {
  /** Identifies the item among its siblings. Only needs to be unique within its parent. */
  key: string;
  /** Plain text: the default row content, the default search text, and the accessible name. */
  label: string;
  /** The item's children. Omitted or empty means a leaf, and only leaves are selectable values. */
  children?: ReadonlyArray<T>;
  /** Locks the item. A disabled parent locks everything beneath it. */
  disabled?: boolean;
};

/**
 * An exact selection: nested by key, from the top level down. `true` selects
 * that leaf, or every leaf beneath that parent. Anything not listed is
 * unselected. `onValueChange` always reports leaves explicitly.
 *
 * @example
 * // Bin A1 in Warehouse X, plus every bin in Warehouse Y
 * { "wh-x": { A1: true }, "wh-y": true }
 */
export type CheckboxTreeSelection = { [key: string]: true | CheckboxTreeSelection };

/** One selected leaf, as reported by `onValueChange` and `CheckboxTreePicker`'s `onCommit`. */
export type CheckboxTreeSelectedItem<T> = {
  /** The leaf's own `key`. */
  key: string;
  /** Keys from the top level down to this leaf. */
  path: string[];
  /** Your original item. */
  item: T;
  /** The leaf's ancestors, top level first. */
  parents: T[];
};

export type CheckboxTreeChangeDetails<T> = {
  /** The selected leaves in tree order. In `"keys"` mode, one entry per key. */
  selected: CheckboxTreeSelectedItem<T>[];
};

/** What `renderItem` and the column `render` functions receive for each row. */
export type CheckboxTreeRowState<T> = {
  item: T;
  key: string;
  path: string[];
  parents: T[];
  /** 0 for top-level rows. */
  depth: number;
  isLeaf: boolean;
  /** For a parent: every enabled leaf beneath it is selected. */
  checked: boolean;
  /** For a parent: some, but not all, enabled leaves beneath it are selected. */
  indeterminate: boolean;
  expanded: boolean;
  disabled: boolean;
};

/** An extra column beside the main one. The tree lines it up across rows and gives it a header cell. */
export type CheckboxTreeColumn<T> = {
  header?: React.ReactNode;
  render: (row: CheckboxTreeRowState<T>) => React.ReactNode;
  /** Defaults to `"start"` for the leading column and `"end"` for the trailing one. */
  align?: "start" | "center" | "end";
  /** Fixed width (px number or CSS length). Set it so cells line up when content varies. */
  width?: number | string;
};

/** What the tree shows and how it is searched — shared by `CheckboxTree` and `CheckboxTreePicker`. */
export interface CheckboxTreeContentProps<T> {
  /** Your top-level items. Children come from `mapItem`. */
  items: ReadonlyArray<T>;
  /** Reads an item's key, label, children and disabled state. */
  mapItem: (item: T) => CheckboxTreeMappedItem<T>;
  /** The main column's content. Defaults to the item's `label`. */
  renderItem?: (row: CheckboxTreeRowState<T>) => React.ReactNode;
  /** Header above the main column. Default: `"Item"`. */
  itemHeader?: React.ReactNode;
  /** A column between the expand caret and the main column (e.g. a thumbnail or status icon). */
  leadingColumn?: CheckboxTreeColumn<T>;
  /** A right-aligned column after the main one (e.g. price, stock or unit). */
  trailingColumn?: CheckboxTreeColumn<T>;
  /**
   * Search predicate. Defaults to a case-insensitive match on the item's
   * `label`. A node is kept when it or any descendant matches.
   */
  matchesSearch?: (item: T, query: string) => boolean;
  /** Slot rendered to the right of the search input (e.g. a category filter button). */
  filterSlot?: React.ReactNode;
  /** Shown when the (filtered) tree is empty. Default: `"No matching items."`. */
  emptyText?: React.ReactNode;
  /** Search input placeholder. Default: `"Search"`. */
  searchPlaceholder?: string;
}

/**
 * Selection by leaf key: a leaf is selected wherever its key appears, so the
 * same product under two categories is one selection. Use it when leaf keys
 * are unique, or when repeats really are the same item.
 */
export type CheckboxTreeKeysValueProps<T> = {
  valueShape?: "keys";
  /** Controlled selection: the selected leaf keys. */
  value?: readonly string[];
  /** Initial selection when uncontrolled. */
  defaultValue?: readonly string[];
  onValueChange?: (value: string[], details: CheckboxTreeChangeDetails<T>) => void;
};

/**
 * Selection by position: each leaf is selected on its own, so `A1` in two
 * warehouses are two separate selections. Use it when leaf keys repeat with
 * different meanings.
 */
export type CheckboxTreeExactValueProps<T> = {
  valueShape: "exact";
  /** Controlled selection. */
  value?: CheckboxTreeSelection;
  /** Initial selection when uncontrolled. */
  defaultValue?: CheckboxTreeSelection;
  onValueChange?: (value: CheckboxTreeSelection, details: CheckboxTreeChangeDetails<T>) => void;
};

export type CheckboxTreeValueProps<T> =
  | CheckboxTreeKeysValueProps<T>
  | CheckboxTreeExactValueProps<T>;

/** Props for {@link CheckboxTree}. */
export type CheckboxTreeProps<T> = CheckboxTreeContentProps<T> &
  CheckboxTreeValueProps<T> & {
    /**
     * Enter on a row — the row's default action. When omitted and the tree is
     * inside a `<form>`, Enter submits the form (like Enter in a text input).
     */
    onAction?: () => void;
    /**
     * Names the hidden inputs that carry the selection on native form
     * submission, one per selected leaf (read with `formData.getAll(name)`).
     * Inside a `Field.Root`, the field's `name` wins.
     */
    name?: string;
    /** `id` of the form that owns the hidden inputs, when the tree is rendered outside it. */
    form?: string;
    /**
     * The string written into each hidden input. Defaults to the leaf's key in
     * `"keys"` mode and `path.join("/")` in `"exact"` mode.
     */
    itemToStringValue?: (item: T, context: { path: string[]; parents: T[] }) => string;
    /** At least one leaf must be selected before the owning form can submit. */
    required?: boolean;
    /** Locks the whole tree and leaves it out of form submission. */
    disabled?: boolean;
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
    /** Accessible name for the tree. Use this, `aria-labelledby`, or a `Field.Label`. */
    "aria-label"?: string;
    /** Id of the element naming the tree (e.g. a card or dialog title). */
    "aria-labelledby"?: string;
    /**
     * Merged onto the root. The list scrolls inside it, so give it a height (or
     * place it in a sized container) for long trees.
     */
    className?: string;
  };

/** Props for {@link CheckboxTreePicker}. */
export type CheckboxTreePickerProps<T> = CheckboxTreeContentProps<T> & {
  /** Controls dialog visibility. */
  open: boolean;
  /**
   * Fires on every user-driven open/close (Esc, backdrop, close button, Cancel,
   * and after a successful commit). The picker closes itself after `onCommit`,
   * so consumers should not also call this from their commit handler.
   */
  onOpenChange(open: boolean): void;
  /** Dialog title. Also labels the tree for assistive tech. Default: `"Select items"`. */
  title?: React.ReactNode;
  /** How selection works while picking. See `CheckboxTree`'s `valueShape`. Default `"keys"`. */
  valueShape?: "keys" | "exact";
  /** Receives the selected leaves in tree order. */
  onCommit(selected: CheckboxTreeSelectedItem<T>[]): void;
  /** Primary CTA label. Default: `"Add N items"`, or `"Add items"` when nothing is selected. */
  ctaLabel?(count: number): React.ReactNode;
  /** Merged onto the dialog panel. */
  className?: string;
};
