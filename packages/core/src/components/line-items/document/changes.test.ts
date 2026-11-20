import { describe, expect, it, vi } from "vitest";
import { createLineItemsDocument } from "./model";
import { createLineItemsDocumentStore } from "./store";
import type { LineItemsColumn } from "./types";

type Row = {
  id?: string | number;
  name: string | null;
  quantity: number;
  note?: string | null;
  hidden?: { reference: string };
};
const columns: LineItemsColumn<Row>[] = [
  { accessorKey: "name" },
  { accessorKey: "quantity", type: "number", typeOptions: { maxDecimals: 2 } },
  { accessorKey: "note" },
  { id: "total", accessor: (row) => row.quantity * 2 },
];
const rows: Row[] = [
  { id: "A", name: "First", quantity: 10, note: "Original", hidden: { reference: "a" } },
  { id: "B", name: "Second", quantity: 20, hidden: { reference: "b" } },
];
const empty = { added: [], updated: [], removed: [], order: null };
const equivalentNumbers = (baseline: number, current: number) =>
  Math.abs(baseline - current) < 0.01;
const document = (config = columns) => createLineItemsDocument({ columns: config, lines: rows });

describe("LineItems net changesets", () => {
  it("reports only final changed fields and cancels updates restored to the baseline", () => {
    const value = document();
    expect(value.getChanges()).toEqual(empty);
    value.updateField("A", "quantity", 20);
    value.updateField("A", "quantity", 30);
    expect(value.getChanges()).toEqual({
      ...empty,
      updated: [{ lineKey: "A", changes: { quantity: 30 } }],
    });
    expect(value.isDirty()).toBe(true);
    value.updateField("A", "quantity", 10);
    expect(value.getChanges()).toEqual(empty);
    expect(value.isDirty()).toBe(false);
  });

  it("returns full creation data and baseline removals, not an operation history", () => {
    const value = document();
    const baseline = value.getRows();
    value.updateField("A", "name", "Updated");
    value.updateField("B", "quantity", 99);
    value.removeLine("B");
    const key = value.addLine({
      id: "discarded-server-id",
      name: "New",
      quantity: 1,
      note: "New note",
      hidden: { reference: "creation" },
    });
    value.updateField(key, "quantity", 2);
    value.reorderLine(key, null);
    const changes = value.getChanges();
    expect(changes).toEqual({
      added: [value.getRows()[0]],
      updated: [{ lineKey: "A", changes: { name: "Updated" } }],
      removed: [baseline[1]],
      order: [key, "A"],
    });
    expect(changes.added[0]).toMatchObject({
      name: "New",
      quantity: 2,
      note: "New note",
      hidden: { reference: "creation" },
    });
    expect(changes.added[0].id).toBeUndefined();
    expect(changes.removed[0].quantity).toBe(20);
    expect(value.getLineKey(changes.removed[0])).toBe("B");
    value.revert();
    expect(value.getChanges()).toEqual(empty);
    expect(value.getRows()).toEqual(baseline);
  });

  it("cancels a creation even if it was edited and moved before removal", () => {
    const value = document();
    const key = value.addLine({ name: "New", quantity: 1 });
    value.updateField(key, "name", "Changed creation");
    value.reorderLine(key, null);
    value.removeLine(key);
    expect(value.getChanges()).toEqual(empty);
    expect(value.isDirty()).toBe(false);
  });

  it("preserves explicit null and undefined clears without including untouched fields", () => {
    const value = document();
    value.updateField("A", "name", null);
    value.updateField("A", "note", undefined);
    const changes = value.getChanges().updated[0].changes;
    expect(changes).toEqual({ name: null, note: undefined });
    expect(Object.hasOwn(changes, "note")).toBe(true);
    expect(Object.hasOwn(changes, "quantity")).toBe(false);
    expect(Object.hasOwn(changes, "id")).toBe(false);
    expect(Object.hasOwn(changes, "hidden")).toBe(false);
    expect(Object.hasOwn(changes, "total")).toBe(false);
  });

  it("reports final ordered membership, including an empty order when all rows are removed", () => {
    const value = document();
    const baseline = value.getRows();
    value.reorderLine("B", null);
    expect(value.getChanges()).toEqual({ ...empty, order: ["B", "A"] });
    value.reorderLine("A", null);
    expect(value.getChanges()).toEqual(empty);
    value.removeLine("A");
    expect(value.getChanges().order).toEqual(["B"]);
    value.removeLine("B");
    expect(value.getChanges()).toEqual({ ...empty, removed: baseline, order: [] });
    expect(value.isDirty()).toBe(true);
  });

  it("includes ID-less initial rows as complete additions", () => {
    const creation: Row = { name: "Unsaved", quantity: 2, hidden: { reference: "initial" } };
    const value = createLineItemsDocument({ columns, lines: [rows[0], creation] });
    const [persisted, added] = value.getRows();
    expect(value.getChanges()).toEqual({
      ...empty,
      added: [added],
      order: ["A", value.getLineKey(added)],
    });
    value.removeLine(value.getLineKey(added));
    expect(value.getChanges()).toEqual(empty);
    expect(value.getRows()).toEqual([persisted]);
  });

  it("uses stored baseline/current values for equality without normalizing adopted values", () => {
    const equals = vi.fn(
      (baseline: number, current: number) => Math.abs(baseline - current) < 0.01,
    );
    const value = document([
      columns[0],
      { accessorKey: "quantity", type: "number", equals },
      columns[2],
    ]);
    value.updateField("A", "quantity", 10.001);
    expect(value.getRows()[0].quantity).toBe(10.001);
    expect(value.getChanges()).toEqual(empty);
    expect(value.isDirty()).toBe(false);
    expect(equals).toHaveBeenCalledWith(10, 10.001);
    value.updateField("A", "quantity", 10.02);
    expect(value.getChanges().updated).toEqual([{ lineKey: "A", changes: { quantity: 10.02 } }]);
    expect(value.isDirty()).toBe(true);

    const exact = document();
    exact.updateField("A", "quantity", 10.001);
    expect(exact.getChanges().updated).toEqual([{ lineKey: "A", changes: { quantity: 10.001 } }]);
    expect(exact.isDirty()).toBe(true);
  });

  it("shares one explicit equality rule across duplicate displays regardless of column order", () => {
    const config: LineItemsColumn<Row>[] = [
      { accessorKey: "quantity", id: "plain" },
      { accessorKey: "quantity", id: "custom", equals: equivalentNumbers },
      { accessorKey: "quantity", id: "same-rule", equals: equivalentNumbers },
    ];
    const value = document(config);
    value.updateField("A", "quantity", 10.001);
    expect(value.getChanges()).toEqual(empty);
    expect(value.getChanges(config.toReversed())).toEqual(empty);
    expect(value.isDirty(config.toReversed())).toBe(false);
    const conflicting: LineItemsColumn<Row>[] = [
      ...config,
      {
        accessorKey: "quantity",
        id: "conflicting",
        equals: (baseline, current) => baseline === current,
      },
    ];
    const snapshot = value.getRows();
    expect(() => value.assertColumns(conflicting)).toThrow(/equal/i);
    expect(value.getRows()).toBe(snapshot);
    expect(value.getChanges()).toEqual(empty);
    expect(() => document(conflicting)).toThrow(/equal/i);
  });

  it.each([null, "same", true])("rejects a non-function equality rule %s", (equals) => {
    const invalid = [{ accessorKey: "quantity", equals }] as unknown as LineItemsColumn<Row>[];
    expect(() => document(invalid)).toThrow(/equal/i);
  });

  it.each([
    { id: "computed", accessor: (row: Row) => row.quantity },
    { id: "display", render: () => null },
  ])("rejects equality on a non-property column $id", (column) => {
    const invalid = [{ ...column, equals: () => true }] as unknown as LineItemsColumn<Row>[];
    expect(() => document(invalid)).toThrow(/equal/i);
  });

  it.each([undefined, 1, Promise.resolve(true)])(
    "rejects a non-boolean equality result %s",
    (result) => {
      const config = [
        { accessorKey: "quantity", equals: () => result },
      ] as unknown as LineItemsColumn<Row>[];
      const value = document(config);
      value.updateField("A", "quantity", 11);
      expect(() => value.getChanges()).toThrow(/boolean/i);
      expect(() => value.isDirty()).toThrow(/boolean/i);
    },
  );

  it("propagates equality failures without changing rows or the baseline", () => {
    const error = new Error("Comparison failed");
    const config: LineItemsColumn<Row>[] = [
      {
        accessorKey: "quantity",
        equals: () => {
          throw error;
        },
      },
    ];
    const value = document(config);
    value.updateField("A", "quantity", 11);
    const snapshot = value.getRows();
    expect(() => value.getChanges()).toThrow(error);
    expect(value.getRows()).toBe(snapshot);
    expect(value.getChanges([{ accessorKey: "quantity" }]).updated).toEqual([
      { lineKey: "A", changes: { quantity: 11 } },
    ]);
  });

  it("reports __proto__ as an own changed field without altering the changes object's prototype", () => {
    type Special = { id?: string; __proto__: string };
    const value = createLineItemsDocument<Special>({
      columns: [{ accessorKey: "__proto__" }],
      lines: [{ id: "A", ["__proto__"]: "Before" }],
    });
    value.updateField("A", "__proto__", "After");
    const changes = value.getChanges().updated[0].changes;
    expect(Object.hasOwn(changes, "__proto__")).toBe(true);
    expect(changes.__proto__).toBe("After");
    expect(Object.getPrototypeOf(changes)).toBe(Object.prototype);
  });

  it("does not publish, replace rows, clear changes, or advance the baseline when inspecting", () => {
    const value = createLineItemsDocumentStore({ columns, lines: rows });
    value.updateField("A", "quantity", 11);
    const snapshot = value.getSnapshot();
    const listener = vi.fn();
    value.subscribe(listener);
    const changes = { ...empty, updated: [{ lineKey: "A", changes: { quantity: 11 } }] };
    expect(value.getChanges()).toEqual(changes);
    expect(value.getChanges()).toEqual(changes);
    expect(value.isDirty()).toBe(true);
    expect(value.getSnapshot()).toBe(snapshot);
    expect(listener).not.toHaveBeenCalled();
    value.revert();
    expect(value.getSnapshot()[0].quantity).toBe(10);
    expect(value.getChanges()).toEqual(empty);
  });
});
