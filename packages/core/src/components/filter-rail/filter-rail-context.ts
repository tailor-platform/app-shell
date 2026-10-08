import { createContext, useContext } from "react";
import type { CollectionControl, Filter } from "@/types/collection";
import type { FacetCounts, FilterRailSection, RailLayoutBinding } from "./types";

/**
 * Everything the parts share. String-keyed on purpose: `TField` is narrowed at
 * the `Root` boundary, and nothing inside varies on it.
 */
export type FilterRailContextValue = {
  control: CollectionControl;
  /** The authored sections, including ones the user has hidden. */
  sections: readonly FilterRailSection[];
  counts: FacetCounts | undefined;
  layout: RailLayoutBinding | undefined;
  zeroBehavior: "disable" | "show";
  density: "compact" | "comfortable";
  /** Fields the rail owns. */
  owned: ReadonlySet<string>;
  /** Active filters on owned fields. */
  activeCount: number;
  /** Section ids that currently carry a filter. */
  filteredSections: ReadonlySet<string>;
  /** Replace (or remove) the filter on one field — the rail's single mutation path. */
  commit: (field: string, next: Filter | null) => void;
  /** Remove the filters on these fields in one `setFilters`. */
  clearFields: (fields: readonly string[]) => void;
  clearAll: () => void;
};

export const FilterRailContext = createContext<FilterRailContextValue | null>(null);

export function useFilterRailContext(part: string): FilterRailContextValue {
  const context = useContext(FilterRailContext);
  if (!context) {
    throw new Error(`<FilterRail.${part}> must be rendered inside <FilterRail.Root>.`);
  }
  return context;
}

/** A plain-text name for a section, for aria-labels and messages. */
export const sectionName = (section: FilterRailSection): string =>
  typeof section.label === "string" || typeof section.label === "number"
    ? String(section.label)
    : section.id;
