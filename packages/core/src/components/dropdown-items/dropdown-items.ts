import type * as React from "react";

/** Shape returned by `mapItem` to describe how an item appears in the dropdown. */
export interface MappedItem {
  /** Display text — used for filtering, a11y, and fallback display. */
  label: string;
  /** React key for list reconciliation. Defaults to `label`. */
  key?: string;
  /** Custom JSX to render in the dropdown. Defaults to `label`. */
  render?: React.ReactNode;
}

/**
 * A group of items with a label, used by Select, Combobox, and Autocomplete standalone components.
 *
 * Items are identified as groups by the presence of `label: string` and `items: T[]` fields.
 * Avoid item types whose shape coincidentally matches this structure, as they will be
 * silently treated as group containers at both the type level and runtime.
 */
export interface ItemGroup<T> {
  label: string;
  items: T[];
}

/** Extracts the item type from a possibly-grouped items array element. */
export type ExtractItem<I> = I extends ItemGroup<infer T> ? T : I;

export const defaultMapItem = (item: unknown): MappedItem => ({
  label: String(item),
});

export function isGroupedItems<I>(items: I[]): items is (I & ItemGroup<unknown>)[] {
  return (
    items.length > 0 &&
    typeof items[0] === "object" &&
    items[0] !== null &&
    "label" in items[0] &&
    "items" in items[0]
  );
}
