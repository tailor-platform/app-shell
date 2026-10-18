import { createContext, useContext } from "react";
import type { CollectionControl, Filter } from "@/types/collection";
import type { FilterRailSection, RailLayoutBinding } from "./types";

/**
 * Everything the parts share. String-keyed on purpose: `TField` is narrowed at
 * the `Root` boundary, and nothing inside varies on it.
 */
export type FilterRailContextValue = {
  control: CollectionControl;
  /** The authored sections, including ones the user has hidden. */
  sections: readonly FilterRailSection[];
  layout: RailLayoutBinding | undefined;
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
  /** Whether a section is expanded — the user's toggle, else `!defaultCollapsed`. */
  isSectionOpen: (section: FilterRailSection) => boolean;
  setSectionOpen: (id: string, open: boolean) => void;

  // Narrow-screen form
  /** Below `lg`: the rail lives in a sheet behind a button. */
  compact: boolean;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  /** Whether a `FilterRail.Trigger` is mounted, so Root skips its fallback button. */
  hasTrigger: boolean;
  /** Called by `FilterRail.Trigger` on mount; returns the unregister function. */
  registerTrigger: () => () => void;
};

export const FilterRailContext = createContext<FilterRailContextValue | null>(null);

export function useFilterRailContext(part: string): FilterRailContextValue {
  const context = useContext(FilterRailContext);
  if (!context) {
    throw new Error(
      `<FilterRail.${part}> must be rendered inside <FilterRail.Root> or <FilterRail.Provider>.`,
    );
  }
  return context;
}

/** For Root, which provides the context itself when no Provider is above it. */
export const useOptionalFilterRailContext = () => useContext(FilterRailContext);

/** A plain-text name for a section, for aria-labels and messages. */
export const sectionName = (section: FilterRailSection): string =>
  typeof section.label === "string" || typeof section.label === "number"
    ? String(section.label)
    : section.id;
