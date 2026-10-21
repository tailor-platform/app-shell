import { describe, expect, it } from "vitest";

import {
  ACTIONS_COLUMN_WIDTH,
  AUTO_COLUMN_MIN_WIDTH,
  FLEX_COLUMN_MIN_WIDTH,
  computeColumnLayout,
  GRIP_COLUMN_WIDTH,
  SELECTION_COLUMN_ID,
  SELECTION_COLUMN_WIDTH,
  pinStyle,
} from "./column-layout";
import { createLineItemHelper } from "./field";

type Line = { id?: string; sku: string; name: string; qty: number; total: number };

const f = createLineItemHelper<Line>();

const fields = [
  f.field({ key: "sku", label: "SKU", render: (l) => l.sku, width: 120, pin: "left" }),
  f.field({ key: "name", label: "Name", render: (l) => l.name, flex: true }),
  f.field({ key: "qty", label: "Qty", render: (l) => l.qty, width: 80, type: { kind: "number" } }),
  f.field({ key: "total", label: "Total", render: (l) => l.total, width: 100, pin: "right" }),
];

const noExtras = { hasGrip: false, hasSelection: false, hasActions: false };

describe("computeColumnLayout", () => {
  it("orders columns left-pinned, unpinned, then right-pinned", () => {
    const layout = computeColumnLayout(fields, { widths: {}, ...noExtras });
    expect(layout.columns.map((c) => c.id)).toEqual(["sku", "name", "qty", "total"]);
    expect(layout.gridColumnIds).toEqual(["sku", "name", "qty", "total"]);
  });

  it("keeps unpinned columns unsticky", () => {
    const layout = computeColumnLayout(fields, { widths: {}, ...noExtras });
    expect(layout.columns.find((c) => c.id === "name")?.placement).toBeUndefined();
    expect(layout.columns.find((c) => c.id === "qty")?.placement).toBeUndefined();
  });

  it("stacks left-pinned offsets after the selection and grip columns", () => {
    const layout = computeColumnLayout(fields, {
      widths: {},
      hasGrip: true,
      hasSelection: true,
      hasActions: false,
    });

    expect(layout.selection).toEqual({ side: "left", offset: 0, isBoundary: false });
    expect(layout.grip).toEqual({
      side: "left",
      offset: SELECTION_COLUMN_WIDTH,
      isBoundary: false,
    });
    expect(layout.columns.find((c) => c.id === "sku")?.placement).toEqual({
      side: "left",
      offset: SELECTION_COLUMN_WIDTH + GRIP_COLUMN_WIDTH,
      isBoundary: true,
    });
  });

  it("prefers measured widths over declared ones for offsets", () => {
    const layout = computeColumnLayout(fields, {
      widths: { [SELECTION_COLUMN_ID]: 60 },
      hasGrip: true,
      hasSelection: true,
      hasActions: false,
    });
    expect(layout.grip?.offset).toBe(60);
  });

  it("lets a pinned column with no declared width still stack correctly once measured", () => {
    const unsized = [
      f.field({ key: "a", label: "A", render: () => null, pin: "left" }),
      f.field({ key: "b", label: "B", render: () => null, pin: "left" }),
    ];
    const layout = computeColumnLayout(unsized, { widths: { a: 90 }, ...noExtras });

    expect(layout.columns[0]?.placement?.offset).toBe(0);
    expect(layout.columns[1]?.placement?.offset).toBe(90);
  });

  it("accumulates right-pinned offsets inward from the actions column", () => {
    const twoRight = [
      ...fields,
      f.field({ key: "extra", label: "Extra", render: () => null, width: 70, pin: "right" }),
    ];
    const layout = computeColumnLayout(twoRight, {
      widths: {},
      hasGrip: false,
      hasSelection: false,
      hasActions: true,
    });

    expect(layout.actions).toEqual({ side: "right", offset: 0, isBoundary: false });
    expect(layout.columns.find((c) => c.id === "extra")?.placement).toEqual({
      side: "right",
      offset: ACTIONS_COLUMN_WIDTH,
      isBoundary: false,
    });
    expect(layout.columns.find((c) => c.id === "total")?.placement).toEqual({
      side: "right",
      offset: ACTIONS_COLUMN_WIDTH + 70,
      isBoundary: true,
    });
  });

  it("marks the outermost pinned column of each side as the boundary", () => {
    const layout = computeColumnLayout(fields, { widths: {}, ...noExtras });
    expect(layout.columns.find((c) => c.id === "sku")?.placement?.isBoundary).toBe(true);
    expect(layout.columns.find((c) => c.id === "total")?.placement?.isBoundary).toBe(true);
  });

  it("derives alignment from the field type when not set", () => {
    const layout = computeColumnLayout(fields, { widths: {}, ...noExtras });
    expect(layout.columns.find((c) => c.id === "qty")?.align).toBe("right");
    expect(layout.columns.find((c) => c.id === "name")?.align).toBe("left");
  });

  describe("spacer", () => {
    it("is not needed when a column claims flex", () => {
      expect(computeColumnLayout(fields, { widths: {}, ...noExtras }).needsSpacer).toBe(false);
    });

    it("is needed when every column has a fixed width and none flexes", () => {
      const fixed = [
        f.field({ key: "sku", label: "SKU", render: () => null, width: 100 }),
        f.field({ key: "qty", label: "Qty", render: () => null, width: 80 }),
      ];
      expect(computeColumnLayout(fixed, { widths: {}, ...noExtras }).needsSpacer).toBe(true);
    });

    it("is not needed when a column sizes naturally", () => {
      const mixed = [
        f.field({ key: "sku", label: "SKU", render: () => null, width: 100 }),
        f.field({ key: "note", label: "Note", render: () => null }),
      ];
      expect(computeColumnLayout(mixed, { widths: {}, ...noExtras }).needsSpacer).toBe(false);
    });

    it("is not needed for an empty schema", () => {
      expect(computeColumnLayout([], { widths: {}, ...noExtras }).needsSpacer).toBe(false);
    });
  });
});

describe("pinStyle", () => {
  it("returns sticky positioning for the placement's side", () => {
    expect(pinStyle({ side: "left", offset: 44, isBoundary: false })).toEqual({
      position: "sticky",
      left: 44,
    });
    expect(pinStyle({ side: "right", offset: 0, isBoundary: true })).toEqual({
      position: "sticky",
      right: 0,
    });
  });

  it("returns nothing for an unpinned column", () => {
    expect(pinStyle(undefined)).toBeUndefined();
  });
});

describe("minTableWidth", () => {
  it("sums declared widths plus the utility columns", () => {
    const layout = computeColumnLayout(fields, {
      widths: {},
      hasGrip: true,
      hasSelection: true,
      hasActions: true,
    });
    // sku 120 + name (flex floor) + qty 80 + total 100, plus grip/selection/actions.
    expect(layout.minTableWidth).toBe(
      120 +
        FLEX_COLUMN_MIN_WIDTH +
        80 +
        100 +
        GRIP_COLUMN_WIDTH +
        SELECTION_COLUMN_WIDTH +
        ACTIONS_COLUMN_WIDTH,
    );
  });

  it("gives an unsized non-flex column a floor so it cannot be crushed", () => {
    const layout = computeColumnLayout(
      [f.field({ key: "note", label: "Note", render: () => null })],
      { widths: {}, ...noExtras },
    );
    expect(layout.minTableWidth).toBe(AUTO_COLUMN_MIN_WIDTH);
  });
});
