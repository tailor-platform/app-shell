import { ClearAll, Header, Root, Sections } from "./filter-rail";
import { RailSheet, Trigger } from "./responsive";
import { SavedViews } from "./saved-views";
import { Settings } from "./settings";

/**
 * An always-visible faceted filter rail. Sections are config (`sections`), so
 * any mix of checkbox, radio, boolean, text, date, range and custom sections
 * works; every other feature is an optional part you include or leave out.
 *
 * It writes the same `CollectionControl` a `DataTable` reads, so it can sit in
 * a separate `Layout.Column` beside the table.
 *
 * @example
 * ```tsx
 * <FilterRail.Root control={control} sections={sections} counts={counts} layout={layout}>
 *   <FilterRail.Header>
 *     <FilterRail.ClearAll />
 *     <FilterRail.Settings />
 *   </FilterRail.Header>
 *   <FilterRail.SavedViews {...views} />
 *   <FilterRail.Sections />
 * </FilterRail.Root>
 * ```
 */
export const FilterRail = {
  Root,
  Header,
  ClearAll,
  Sections,
  Settings,
  SavedViews,
  Trigger,
  Sheet: RailSheet,
};

export type { FilterRailRootProps, FilterRailSection } from "./types";
export { useFilterRailCounts } from "./use-filter-rail-counts";
export { useFilterRailLayout } from "./use-filter-rail-layout";
export { useSavedViews } from "./use-saved-views";
export { useFilterRailCompact } from "./responsive";
