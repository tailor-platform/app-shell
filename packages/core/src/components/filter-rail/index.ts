import { ClearAll, Header, Provider, Root, Sections } from "./filter-rail";
import { Trigger } from "./responsive";
import { Settings } from "./settings";

/**
 * An always-visible faceted filter rail. Sections are config (`sections`), so
 * any mix of checkbox, radio, boolean, text, date, range and custom sections
 * works; every other feature is an optional part you include or leave out.
 *
 * It writes the same `CollectionControl` a `DataTable` reads, so it can sit in
 * a separate `Layout.Column` beside the table. Below `lg` it turns itself into
 * a left sheet behind a "Filters" button, like the Sidebar does.
 *
 * @example
 * ```tsx
 * <FilterRail.Root control={control} sections={sections} layout={layout}>
 *   <FilterRail.Header>
 *     <FilterRail.ClearAll />
 *     <FilterRail.Settings />
 *   </FilterRail.Header>
 *   <FilterRail.Sections />
 * </FilterRail.Root>
 * ```
 */
export const FilterRail = {
  Provider,
  Root,
  Header,
  ClearAll,
  Sections,
  Settings,
  Trigger,
};

export type { FilterRailRootProps, FilterRailSection } from "./types";
export { useFilterRailLayout } from "./use-filter-rail-layout";
