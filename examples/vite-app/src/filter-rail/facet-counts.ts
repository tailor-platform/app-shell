// ✅ Reusable Component: faceted counts for `FilterRail`, computed in memory.
//
// Ships alongside the component rather than inside it. The rail is handed a
// `control` and a section list and never sees a row, so it cannot count — and
// against a real backend these come from an aggregation query anyway. This is
// the local implementation of that contract, for a prototype or a small
// collection that is already fully client-side.

import { useMemo } from "react";
import type { Filter } from "@tailor-platform/app-shell";
import { hasOptions } from "./types";
import type { FacetCounts, FilterRailSection } from "./types";
import { applyOperator } from "./operators";

/**
 * Standard faceting.
 *
 * An option's count within axis X is computed with every **other** axis applied
 * but not X's own, so the number answers "what would I get if I added this".
 * That is why checking one box in a section does not zero out its neighbours —
 * the behaviour people expect from Amazon without being able to name it.
 *
 * ─── Why one pass ────────────────────────────────────────────────────────────
 *
 * The obvious implementation runs one filtered pass per section: S passes over
 * N rows. At this project's largest level that is 25,531 × 9 ≈ 230,000 predicate
 * evaluations on every click.
 *
 * Instead, evaluate each section's predicate once per row and record which
 * sections the row *fails*:
 *
 *   fails ≥ 2 sections  → it can never be rescued by one more choice; skip it
 *   fails exactly 1     → it counts toward that section only
 *   fails 0             → it counts everywhere, and toward the total
 *
 * One iteration, N × S evaluations, and `withoutSection` falls out of the same
 * tally for free.
 */
export function useLocalFacetCounts<TRow>(
  rows: readonly TRow[],
  sections: readonly FilterRailSection[],
  filters: readonly Filter[],
  options?: {
    /** Filters the rail does not own — a level scope, a page search box.
     *  ANDed into every pass, including the baseline. */
    base?: readonly Filter[];
    /** Compute the unfiltered counts too. Needed for `sort: "baselineCount"`. */
    baseline?: boolean;
    /**
     * Read a field off a row. Default `row[field]`.
     *
     * Named `getValue`, not `valueOf`: **every object inherits
     * `Object.prototype.valueOf`**, so `options?.valueOf` is never `undefined`,
     * `?? fallback` never fires, and the built-in gets called with
     * `this === undefined` — "Cannot convert undefined or null to object", from
     * a line that looks obviously correct. The same trap is waiting behind
     * `toString`, `constructor` and `hasOwnProperty`.
     */
    getValue?: (row: TRow, field: string) => unknown;
  },
): FacetCounts {
  const base = options?.base;
  const wantBaseline = options?.baseline ?? false;
  const getValue =
    options?.getValue ?? ((row: TRow, field: string) => (row as Record<string, unknown>)[field]);

  return useMemo(() => {
    const owned = sections.map((section) => ({
      id: section.id,
      field: section.field,
      filter: filters.find((f) => f.field === section.field),
    }));

    const passesBase = (row: TRow) =>
      !base?.length ||
      base.every((f) => applyOperator(getValue(row, f.field), f.operator, f.value));

    const live: Record<string, Record<string, number>> = {};
    const baselineCounts: Record<string, Record<string, number>> = {};
    const withoutSection: Record<string, number> = {};
    for (const section of sections) {
      live[section.id] = {};
      if (wantBaseline) baselineCounts[section.id] = {};
      withoutSection[section.id] = 0;
    }

    let total = 0;

    for (const row of rows) {
      if (!passesBase(row)) continue;

      // Every value this row contributes, per section. An array cell counts
      // once per member, which is how a multi-valued attribute facets.
      //
      // Only sections with an option list. A date or a range has no options to
      // put a number against, and tallying one would build a map keyed by every
      // distinct date in the collection — thousands of entries nothing reads.
      const contributions = sections.map((section) =>
        hasOptions(section)
          ? (() => {
              const raw = getValue(row, section.field);
              return Array.isArray(raw) ? raw.map(String) : [String(raw)];
            })()
          : [],
      );

      if (wantBaseline) {
        sections.forEach((section, index) => {
          for (const value of contributions[index]!) {
            baselineCounts[section.id]![value] = (baselineCounts[section.id]![value] ?? 0) + 1;
          }
        });
      }

      // Which sections does this row fail?
      const failed: number[] = [];
      for (let index = 0; index < owned.length; index += 1) {
        const { filter } = owned[index]!;
        if (!filter) continue;
        if (!applyOperator(getValue(row, filter.field), filter.operator, filter.value)) {
          failed.push(index);
          if (failed.length > 1) break; // two misses and it counts for nothing
        }
      }

      if (failed.length > 1) continue;

      if (failed.length === 1) {
        // Counts only toward the one section it fails — that section's own
        // filter is the thing being excluded.
        const index = failed[0]!;
        const section = sections[index]!;
        for (const value of contributions[index]!) {
          live[section.id]![value] = (live[section.id]![value] ?? 0) + 1;
        }
        withoutSection[section.id]! += 1;
        continue;
      }

      // Passes everything: counts toward every section, and toward the total.
      total += 1;
      sections.forEach((section, index) => {
        for (const value of contributions[index]!) {
          live[section.id]![value] = (live[section.id]![value] ?? 0) + 1;
        }
        withoutSection[section.id]! += 1;
      });
    }

    return {
      live,
      ...(wantBaseline ? { baseline: baselineCounts } : {}),
      total,
      withoutSection,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sections, filters, base, wantBaseline]);
}
