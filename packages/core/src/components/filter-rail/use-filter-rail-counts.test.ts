import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Filter } from "@/types/collection";
import { matchesOperator } from "./operators";
import { computeFacetCounts, useFilterRailCounts } from "./use-filter-rail-counts";
import type { FilterRailSection } from "./types";

type Row = {
  id: number;
  category: string;
  color: string;
  price: number;
  inStock: boolean;
  tags?: string[];
  warehouse?: string;
};

// 🧪 Dummy Data: six products
const rows: Row[] = [
  { id: 1, category: "apparel", color: "red", price: 10, inStock: true, warehouse: "tokyo" },
  { id: 2, category: "apparel", color: "blue", price: 20, inStock: false, warehouse: "tokyo" },
  { id: 3, category: "shoes", color: "red", price: 30, inStock: true, warehouse: "osaka" },
  { id: 4, category: "shoes", color: "blue", price: 40, inStock: true, warehouse: "tokyo" },
  { id: 5, category: "bags", color: "red", price: 50, inStock: false, warehouse: "osaka" },
  { id: 6, category: "bags", color: "green", price: 60, inStock: true, warehouse: "tokyo" },
];

const sections: FilterRailSection[] = [
  { id: "category", label: "Category", control: "checkbox", field: "category", options: [] },
  { id: "color", label: "Color", control: "checkbox", field: "color", options: [] },
  { id: "stock", label: "In stock", control: "boolean", field: "inStock" },
];

const inFilter = (field: string, value: string[]): Filter => ({ field, operator: "in", value });

describe("computeFacetCounts", () => {
  it("counts every row with no filters", () => {
    const counts = computeFacetCounts(rows, sections, []);
    expect(counts.total).toBe(6);
    expect(counts.live.category).toEqual({ apparel: 2, shoes: 2, bags: 2 });
    expect(counts.live.color).toEqual({ red: 3, blue: 2, green: 1 });
    // A boolean section has no options, so nothing is tallied for it.
    expect(counts.live.stock).toEqual({});
    expect(counts.withoutSection).toEqual({ category: 6, color: 6, stock: 6 });
    expect(counts.baseline).toBeUndefined();
  });

  it("excludes a section's own filter from its live counts", () => {
    const counts = computeFacetCounts(rows, sections, [inFilter("category", ["apparel"])]);
    // Category counts ignore the category filter — ticking one box does not zero its neighbours.
    expect(counts.live.category).toEqual({ apparel: 2, shoes: 2, bags: 2 });
    // Color counts are within apparel only.
    expect(counts.live.color).toEqual({ red: 1, blue: 1 });
    expect(counts.total).toBe(2);
  });

  it("does not count a row failing two sections anywhere", () => {
    const counts = computeFacetCounts(rows, sections, [
      inFilter("category", ["apparel"]),
      inFilter("color", ["red"]),
    ]);
    // Row 1 passes both; rows 2 (blue apparel) and 3/5 (red non-apparel) fail one;
    // rows 4 (blue shoes) and 6 (green bags) fail both and count nowhere.
    expect(counts.total).toBe(1);
    expect(counts.live.category).toEqual({ apparel: 1, shoes: 1, bags: 1 });
    expect(counts.live.color).toEqual({ red: 1, blue: 1 });
    expect(counts.withoutSection).toEqual({ category: 3, color: 2, stock: 1 });
  });

  it("reports withoutSection for an empty result", () => {
    const counts = computeFacetCounts(rows, sections, [
      inFilter("category", ["bags"]),
      inFilter("color", ["blue"]),
    ]);
    expect(counts.total).toBe(0);
    // Clearing category → blue rows (2, 4); clearing color → bag rows (5, 6).
    expect(counts.withoutSection?.category).toBe(2);
    expect(counts.withoutSection?.color).toBe(2);
  });

  it("computes baseline counts ignoring rail filters", () => {
    const counts = computeFacetCounts(rows, sections, [inFilter("category", ["apparel"])], {
      baseline: true,
    });
    expect(counts.baseline?.color).toEqual({ red: 3, blue: 2, green: 1 });
    expect(counts.baseline?.category).toEqual({ apparel: 2, shoes: 2, bags: 2 });
  });

  it("counts each member of an array-valued cell", () => {
    const tagged = [{ tags: ["new", "sale"] }, { tags: ["sale"] }, { tags: ["clearance"] }];
    const tagSections: FilterRailSection[] = [
      { id: "tags", label: "Tags", control: "checkbox", field: "tags", options: [] },
    ];
    const counts = computeFacetCounts(tagged, tagSections, [inFilter("tags", ["new"])]);
    expect(counts.live.tags).toEqual({ new: 1, sale: 2, clearance: 1 });
    expect(counts.total).toBe(1);
  });

  it("ANDs base filters into every count", () => {
    const base: Filter[] = [{ field: "warehouse", operator: "eq", value: "tokyo" }];
    const counts = computeFacetCounts(rows, sections, [], { base, baseline: true });
    expect(counts.total).toBe(4);
    expect(counts.live.category).toEqual({ apparel: 2, shoes: 1, bags: 1 });
    // Base filters also apply to the baseline.
    expect(counts.baseline?.category).toEqual({ apparel: 2, shoes: 1, bags: 1 });
  });

  it('coerces a string "true" boolean filter (URL round-trip)', () => {
    const counts = computeFacetCounts(rows, sections, [
      { field: "inStock", operator: "eq", value: "true" },
    ]);
    expect(counts.total).toBe(4);
    expect(counts.live.category).toEqual({ apparel: 1, shoes: 2, bags: 1 });
  });

  it("honours a custom getValue", () => {
    const nested = [{ attrs: { category: "a" } }, { attrs: { category: "b" } }];
    const counts = computeFacetCounts(nested, [sections[0]!], [inFilter("category", ["a"])], {
      getValue: (row, field) => (row.attrs as Record<string, unknown>)[field],
    });
    expect(counts.live.category).toEqual({ a: 1, b: 1 });
    expect(counts.total).toBe(1);
  });
});

describe("useFilterRailCounts", () => {
  it("memoises on its inputs", () => {
    const filters: Filter[] = [];
    const { result, rerender } = renderHook(() => useFilterRailCounts(rows, sections, filters));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(first.total).toBe(6);
  });
});

describe("matchesOperator", () => {
  it.each([
    [true, "eq", "true", true],
    [false, "eq", "true", false],
    [true, "ne", "false", true],
    [5, "eq", "5", true],
    [5, "gt", 4, true],
    [5, "gte", 5, true],
    [5, "lt", 5, false],
    [5, "lte", 5, true],
    [10, "gt", 9, true],
    ["2026-01-10", "gte", "2026-01-09", true],
    [5, "between", { min: 1, max: 5 }, true],
    [6, "between", { min: 1, max: 5 }, false],
    [6, "between", { min: 1 }, true],
    ["a", "in", ["a", "b"], true],
    [1, "in", ["1"], true],
    ["c", "nin", ["a", "b"], true],
    [["x", "y"], "in", ["y"], true],
    [["x", "y"], "nin", ["y"], false],
    ["Hello", "contains", "ell", true],
    ["Hello", "notContains", "ELL", false],
    ["Hello", "hasPrefix", "he", true],
    ["Hello", "notHasPrefix", "he", false],
    ["Hello", "hasSuffix", "LO", true],
    ["Hello", "notHasSuffix", "lo", false],
    ["anything", "regex", ".*", true],
  ] as const)("%j %s %j → %s", (value, operator, operand, expected) => {
    expect(matchesOperator(value, operator, operand)).toBe(expected);
  });
});
