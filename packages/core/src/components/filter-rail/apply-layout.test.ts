import { describe, expect, it } from "vitest";
import {
  applyRailLayout,
  EMPTY_RAIL_LAYOUT,
  findRailProblems,
  orderSections,
  railFields,
} from "./apply-layout";
import type { FilterRailSection } from "./types";

// 🧪 Dummy Data: one section of each shape the layout logic cares about
const sections: FilterRailSection[] = [
  {
    id: "category",
    label: "Category",
    control: "checkbox",
    field: "category",
    options: [],
  },
  { id: "status", label: "Status", control: "radio", field: "status", options: [] },
  { id: "search", label: "Search", control: "text", field: "name", operator: "contains" },
  {
    id: "supplier",
    label: "Supplier",
    control: "custom",
    fields: ["supplierId", "supplierRegion"],
    render: () => null,
  },
];

const ids = (list: readonly { id: string }[]) => list.map((section) => section.id);

describe("applyRailLayout", () => {
  it("returns a copy of the authored sections without a layout", () => {
    const result = applyRailLayout(sections, undefined);
    expect(result).toEqual(sections);
    expect(result).not.toBe(sections);
  });

  it("returns authored order for an empty layout", () => {
    expect(ids(applyRailLayout(sections, EMPTY_RAIL_LAYOUT))).toEqual([
      "category",
      "status",
      "search",
      "supplier",
    ]);
  });

  it("orders ranked sections first, unranked keep authored order after them", () => {
    const result = applyRailLayout(sections, { order: ["search", "status"], hidden: [], sort: {} });
    expect(ids(result)).toEqual(["search", "status", "category", "supplier"]);
  });

  it("ignores unknown ids in order", () => {
    const result = applyRailLayout(sections, {
      order: ["gone", "supplier"],
      hidden: [],
      sort: {},
    });
    expect(ids(result)).toEqual(["supplier", "category", "status", "search"]);
  });

  it("removes hidden sections", () => {
    const result = applyRailLayout(sections, {
      order: ["status"],
      hidden: ["category", "status"],
      sort: {},
    });
    expect(ids(result)).toEqual(["search", "supplier"]);
  });

  it("applies a sort override only to checkbox sections", () => {
    const result = applyRailLayout(sections, {
      order: [],
      hidden: [],
      sort: { category: "label", status: "label", search: "baselineCount" },
    });
    const category = result.find((section) => section.id === "category");
    const status = result.find((section) => section.id === "status");
    const search = result.find((section) => section.id === "search");
    expect(category).toMatchObject({ sort: "label" });
    expect(status).not.toHaveProperty("sort");
    expect(search).not.toHaveProperty("sort");
    // The authored section object is not mutated.
    expect(sections[0]).not.toHaveProperty("sort");
  });
});

describe("orderSections", () => {
  it("is stable for sections sharing the same (missing) rank", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(ids(orderSections(list, ["c"]))).toEqual(["c", "a", "b", "d"]);
  });
});

describe("railFields", () => {
  it("collects every field, including a custom section's declared fields", () => {
    expect(railFields(sections)).toEqual(
      new Set(["category", "status", "name", "supplierId", "supplierRegion"]),
    );
  });
});

describe("findRailProblems", () => {
  it("reports nothing for a clean rail", () => {
    expect(findRailProblems(sections)).toEqual([]);
  });

  it("reports duplicate section ids", () => {
    const problems = findRailProblems([
      sections[0]!,
      { id: "category", label: "Again", control: "radio", field: "other", options: [] },
    ]);
    expect(problems).toEqual(['FilterRail: duplicate section id "category".']);
  });

  it("reports two sections on one field", () => {
    const problems = findRailProblems([
      sections[0]!,
      { id: "category2", label: "Category 2", control: "radio", field: "category", options: [] },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('sections "category" and "category2" both filter "category"');
  });

  it("reports a custom section claiming another section's field", () => {
    const problems = findRailProblems([
      sections[1]!,
      {
        id: "custom",
        label: "Custom",
        control: "custom",
        fields: ["status"],
        render: () => null,
      },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('both filter "status"');
  });
});
