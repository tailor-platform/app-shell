import type * as React from "react";
import type {
  TreeContentProps,
  TreeFilterContext,
  TreeSelectedItem,
  TreeSelectionBehaviorProps,
} from "@/components/tree";

/** Props for {@link TreePicker}. */
export type TreePickerProps<T> = TreeContentProps<T> &
  TreeSelectionBehaviorProps & {
    /** Controls dialog visibility. */
    open: boolean;
    /**
     * Fires on every user-driven open/close (Esc, backdrop, close button, Cancel,
     * and after a successful commit). The picker closes itself after `onCommit`,
     * so consumers should not also call this from their commit handler.
     */
    onOpenChange(open: boolean): void;
    /**
     * Search predicate. Defaults to a case-insensitive match on the item's
     * `label`. An item is kept when it or any descendant matches. Receives the
     * same `{ label, parents }` as `Tree`'s `filter`.
     */
    matchesSearch?: (item: T, query: string, context: TreeFilterContext<T>) => boolean;
    /** Rendered to the right of the search input (e.g. a category filter button). */
    filterSlot?: React.ReactNode;
    /** Search input placeholder. Default: `"Search"`. */
    searchPlaceholder?: string;
    /** Dialog title. Also labels the tree for assistive tech. Default: `"Select items"`. */
    title?: React.ReactNode;
    /**
     * Receives the value's items in tree order (see `selectionStrategy`). Items
     * ticked before `items` changed are included, even if they're no longer in it.
     */
    onCommit(selected: TreeSelectedItem<T>[]): void;
    /** Primary CTA label. Default: `"Add N items"`, or `"Add items"` when nothing is selected. */
    ctaLabel?(count: number): React.ReactNode;
    /** Merged onto the dialog panel. */
    className?: string;
  };
