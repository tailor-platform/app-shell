import { describe, expect, it } from "vitest";

import { createLineItemHelper, fieldsToColumnDefs } from "./field";
import { buildChangeSet, cloneBaseline, type LineItemsBaseline } from "./internals";
import type { LineItemsOrderingMode } from "./types";

type Line = {
  id?: string;
  sku: string;
  quantity: number;
  note: string;
  total: number;
  memo?: string;
};

const f = createLineItemHelper<Line>();

const fields = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
  }),
  f.field({
    key: "note",
    label: "Note",
    render: (l) => l.note,
    editable: ["edit"],
    type: { kind: "text" },
  }),
  // Computed column — read-only, so it must never reach the change-set.
  f.field({ key: "total", label: "Total", render: (l) => l.total.toFixed(2) }),
];

const columns = fieldsToColumnDefs(fields);

function line(over: Partial<Line> & { id: string }): Line {
  return { sku: "SKU-1", quantity: 1, note: "", total: 0, ...over };
}

function pack(rows: Line[]) {
  const byRef: Record<string, Line> = {};
  const order: string[] = [];
  for (const r of rows) {
    byRef[r.id!] = r;
    order.push(r.id!);
  }
  return { byRef, order };
}

function changeSet(
  baseline: LineItemsBaseline<Line>,
  rows: Line[],
  opts?: {
    inserted?: string[];
    removed?: string[];
    ordering?: LineItemsOrderingMode;
  },
) {
  const { byRef, order } = pack(rows);
  return buildChangeSet(
    columns,
    baseline,
    order,
    byRef,
    new Set(opts?.removed ?? []),
    new Set(opts?.inserted ?? []),
    opts?.ordering ?? "sort",
  );
}

function baselineOf(rows: Line[]): LineItemsBaseline<Line> {
  const { byRef, order } = pack(rows);
  return cloneBaseline<Line>(order, byRef);
}

describe("buildChangeSet", () => {
  it("is empty when nothing changed", () => {
    const rows = [line({ id: "1" }), line({ id: "2" })];
    const cs = changeSet(baselineOf(rows), rows);
    expect(cs.isEmpty).toBe(true);
    expect(cs.lineChanges).toEqual([]);
  });

  it("emits an add with a tempId for an inserted line", () => {
    const base = baselineOf([line({ id: "1" })]);
    const cs = changeSet(base, [line({ id: "1" }), line({ id: "tmp", sku: "SKU-9" })], {
      inserted: ["tmp"],
    });

    expect(cs.isEmpty).toBe(false);
    expect(cs.lineChanges).toEqual([
      {
        action: "add",
        tempId: "tmp",
        data: { sku: "SKU-9", quantity: 1, note: "" },
        // The whole line rides along, read-only `total` included.
        line: { id: "tmp", sku: "SKU-9", quantity: 1, note: "", total: 0 },
      },
    ]);
  });

  it("puts metadata fields in an add's data, but never in an update's patch", () => {
    const withMemo = fieldsToColumnDefs<Line>([
      ...fields,
      f.field({
        key: "memo",
        label: "Memo",
        render: () => null,
        editable: ["edit"],
        commit: "metadata",
        type: { kind: "text" },
      }),
    ]);
    const base = baselineOf([line({ id: "1", memo: "old" })]);
    const cs = buildChangeSet(
      withMemo,
      base,
      ["1", "tmp"],
      { "1": line({ id: "1", memo: "changed" }), tmp: line({ id: "tmp", memo: "hello" }) },
      new Set(),
      new Set(["tmp"]),
      "sort",
    );

    expect(cs.lineChanges).toEqual([
      expect.objectContaining({ action: "add", data: expect.objectContaining({ memo: "hello" }) }),
    ]);
  });

  it("emits an update carrying only the changed fields", () => {
    const base = baselineOf([line({ id: "1", sku: "SKU-1", quantity: 1 })]);
    const cs = changeSet(base, [line({ id: "1", sku: "SKU-1", quantity: 5 })]);

    expect(cs.lineChanges).toEqual([{ action: "update", lineId: "1", patch: { quantity: 5 } }]);
  });

  it("emits a remove for a line dropped from the document", () => {
    const base = baselineOf([line({ id: "1" }), line({ id: "2" })]);
    const cs = changeSet(base, [line({ id: "1" })], { removed: ["2"] });

    expect(cs.lineChanges).toEqual([{ action: "remove", lineId: "2" }]);
  });

  it("never includes the id or read-only computed columns in a patch", () => {
    const base = baselineOf([line({ id: "1", total: 0 })]);
    const cs = changeSet(base, [line({ id: "1", total: 999, quantity: 2 })]);

    expect(cs.lineChanges).toEqual([{ action: "update", lineId: "1", patch: { quantity: 2 } }]);
  });

  describe("normalization", () => {
    it("treats cosmetic numeric input as unchanged", () => {
      const base = baselineOf([line({ id: "1", quantity: 1 })]);
      const cs = changeSet(base, [line({ id: "1", quantity: "1.00" as unknown as number })]);
      expect(cs.isEmpty).toBe(true);
    });

    it("rounds numeric values by the field's decimals", () => {
      const base = baselineOf([line({ id: "1", quantity: 1 })]);
      const cs = changeSet(base, [line({ id: "1", quantity: 1.239 })]);
      expect(cs.lineChanges).toEqual([
        { action: "update", lineId: "1", patch: { quantity: 1.24 } },
      ]);
    });

    it("trims strings before comparing", () => {
      const base = baselineOf([line({ id: "1", note: "hello" })]);
      expect(changeSet(base, [line({ id: "1", note: "  hello  " })]).isEmpty).toBe(true);
      expect(changeSet(base, [line({ id: "1", note: "  bye  " })]).lineChanges).toEqual([
        { action: "update", lineId: "1", patch: { note: "bye" } },
      ]);
    });

    it("honors a field-level equals override", () => {
      const custom = fieldsToColumnDefs([
        f.field({
          key: "sku",
          label: "SKU",
          render: (l) => l.sku,
          editable: ["edit"],
          type: { kind: "text" },
          equals: (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
        }),
      ]);
      const rows = [line({ id: "1", sku: "sku-1" })];
      const cs = buildChangeSet(
        custom,
        baselineOf([line({ id: "1", sku: "SKU-1" })]),
        ["1"],
        pack(rows).byRef,
        new Set(),
        new Set(),
        "sort",
      );
      expect(cs.isEmpty).toBe(true);
    });
  });

  describe("reorder", () => {
    const base = baselineOf([line({ id: "1" }), line({ id: "2" }), line({ id: "3" })]);
    const swapped = [line({ id: "2" }), line({ id: "1" }), line({ id: "3" })];

    it("emits reorder ops with final positions under manual ordering", () => {
      const cs = changeSet(base, swapped, { ordering: "manual" });
      expect(cs.lineChanges).toEqual([
        { action: "reorder", lineId: "2", position: 0 },
        { action: "reorder", lineId: "1", position: 1 },
      ]);
    });

    it("stays silent under sort ordering", () => {
      expect(changeSet(base, swapped, { ordering: "sort" }).isEmpty).toBe(true);
    });

    it("emits nothing when a line is dragged back to its original slot", () => {
      const original = [line({ id: "1" }), line({ id: "2" }), line({ id: "3" })];
      expect(changeSet(base, original, { ordering: "manual" }).isEmpty).toBe(true);
    });

    it("does not read an insert as a move of everything below it", () => {
      const withInsert = [
        line({ id: "1" }),
        line({ id: "tmp" }),
        line({ id: "2" }),
        line({ id: "3" }),
      ];
      const cs = changeSet(base, withInsert, { inserted: ["tmp"], ordering: "manual" });
      expect(cs.lineChanges.filter((c) => c.action === "reorder")).toEqual([]);
    });

    it("does not read a removal as a move of everything below it", () => {
      const withRemoval = [line({ id: "1" }), line({ id: "3" })];
      const cs = changeSet(base, withRemoval, { removed: ["2"], ordering: "manual" });
      expect(cs.lineChanges.filter((c) => c.action === "reorder")).toEqual([]);
    });
  });

  it("reports adds, updates, removes and reorders together", () => {
    const base = baselineOf([line({ id: "1" }), line({ id: "2" }), line({ id: "3" })]);
    const cs = changeSet(
      base,
      [line({ id: "3" }), line({ id: "1", quantity: 7 }), line({ id: "tmp" })],
      { inserted: ["tmp"], removed: ["2"], ordering: "manual" },
    );

    expect(cs.lineChanges).toContainEqual({ action: "remove", lineId: "2" });
    expect(cs.lineChanges).toContainEqual({
      action: "update",
      lineId: "1",
      patch: { quantity: 7 },
    });
    expect(cs.lineChanges.some((c) => c.action === "add" && c.tempId === "tmp")).toBe(true);
  });
});

describe("cloneBaseline", () => {
  it("snapshots rows so later mutation of the source does not leak in", () => {
    const rows = [line({ id: "1", note: "before" })];
    const { byRef, order } = pack(rows);
    const baseline = cloneBaseline<Line>(order, byRef);

    rows[0]!.note = "after";

    expect(baseline.rows["1"]?.note).toBe("before");
  });
});
