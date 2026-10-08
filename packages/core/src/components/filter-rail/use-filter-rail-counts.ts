import { useMemo } from "react";
import type { Filter } from "@/types/collection";
import { hasOptions, sectionFields } from "./apply-layout";
import { matchesOperator } from "./operators";
import type { FacetCounts, FilterRailSection } from "./types";

export type UseFilterRailCountsOptions<TRow> = {
  /** Filters the rail does not own (a scope, a search box), ANDed into every count. */
  base?: readonly Filter[];
  /** Also compute unfiltered counts. Needed for `sort: "baselineCount"`. */
  baseline?: boolean;
  /**
   * Read a field off a row. Default `row[field]`. (Not `valueOf` — every object
   * inherits `Object.prototype.valueOf`, so a `?? fallback` would never fire.)
   */
  getValue?: (row: TRow, field: string) => unknown;
};

/**
 * Standard faceting over rows held in memory.
 *
 * An option's count in section X is computed with every **other** section's
 * filter applied but not X's own, so it answers "what would I get if I added
 * this" — checking one box never zeroes out its neighbours.
 *
 * One pass: each row records which sections it fails. Failing two or more, it
 * counts for nothing; failing exactly one, it counts toward that section only;
 * failing none, it counts everywhere and toward the total.
 *
 * For a server-side collection, return the same `FacetCounts` shape from an
 * aggregation query instead.
 */
export function computeFacetCounts<TRow>(
  rows: readonly TRow[],
  sections: readonly FilterRailSection[],
  filters: readonly Filter[],
  options?: UseFilterRailCountsOptions<TRow>,
): FacetCounts {
  const base = options?.base;
  const wantBaseline = options?.baseline ?? false;
  const getValue =
    options?.getValue ?? ((row: TRow, field: string) => (row as Record<string, unknown>)[field]);

  const sectionFilters = sections.map((section) => {
    const fields = new Set<string>(sectionFields(section));
    return filters.filter((filter) => fields.has(filter.field));
  });

  const live: Record<string, Record<string, number>> = {};
  const baseline: Record<string, Record<string, number>> = {};
  const withoutSection: Record<string, number> = {};
  for (const section of sections) {
    live[section.id] = {};
    if (wantBaseline) baseline[section.id] = {};
    withoutSection[section.id] = 0;
  }

  const passes = (row: TRow, list: readonly Filter[]) =>
    list.every((filter) =>
      matchesOperator(getValue(row, filter.field), filter.operator, filter.value),
    );

  let total = 0;
  for (const row of rows) {
    if (base?.length && !passes(row, base)) continue;

    // Only option sections are tallied — a date or range has nothing to count.
    const contributions = sections.map((section) => {
      if (!hasOptions(section)) return [];
      const raw = getValue(row, section.field);
      return Array.isArray(raw) ? raw.map(String) : [String(raw)];
    });

    const add = (index: number, target: Record<string, Record<string, number>>) => {
      const bucket = target[sections[index]!.id]!;
      for (const value of contributions[index]!) bucket[value] = (bucket[value] ?? 0) + 1;
    };

    if (wantBaseline) sections.forEach((_, index) => add(index, baseline));

    const failed: number[] = [];
    for (let index = 0; index < sections.length; index += 1) {
      const list = sectionFilters[index]!;
      if (list.length > 0 && !passes(row, list)) {
        failed.push(index);
        if (failed.length > 1) break;
      }
    }

    if (failed.length > 1) continue;
    if (failed.length === 1) {
      const index = failed[0]!;
      add(index, live);
      withoutSection[sections[index]!.id]! += 1;
      continue;
    }

    total += 1;
    sections.forEach((section, index) => {
      add(index, live);
      withoutSection[section.id]! += 1;
    });
  }

  return { live, ...(wantBaseline ? { baseline } : {}), total, withoutSection };
}

/**
 * Memoised `computeFacetCounts` for `FilterRail.Root`'s `counts` prop.
 *
 * @example
 * ```tsx
 * const counts = useFilterRailCounts(products, sections, control.filters, { baseline: true });
 * <FilterRail.Root control={control} sections={sections} counts={counts}>…</FilterRail.Root>
 * ```
 */
export function useFilterRailCounts<TRow, TField extends string = string>(
  rows: readonly TRow[],
  sections: readonly FilterRailSection<TField>[],
  filters: readonly Filter<TField>[],
  options?: UseFilterRailCountsOptions<TRow>,
): FacetCounts {
  const { base, baseline, getValue } = options ?? {};
  return useMemo(
    () =>
      computeFacetCounts(rows, sections as readonly FilterRailSection[], filters, {
        base,
        baseline,
        getValue,
      }),
    [rows, sections, filters, base, baseline, getValue],
  );
}
