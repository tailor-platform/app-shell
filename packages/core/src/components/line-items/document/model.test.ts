import { describe, expect, it } from "vitest";
import { createLineItemsDocument } from "./model";
import type { LineItemsColumn } from "./types";

type Row = {
  id?: string | number;
  name: string;
  quantity: number;
  detail?: { count: number };
  hidden?: string;
};
const columns: LineItemsColumn<Row>[] = [
  { accessorKey: "name", type: "text" },
  { accessorKey: "quantity", type: "number" },
  { accessorKey: "detail" },
];
const row = (id?: string | number, quantity = 1): Row => ({ id, name: "Item", quantity });
const document = (lines: readonly Row[] = [row("A"), row("B")]) =>
  createLineItemsDocument({ columns, lines });

describe("LineItems document rows and identity", () => {
  it("starts clean for persisted rows and retains immutable object-valued leaves", () => {
    const detail = Object.freeze({ count: 1 });
    const source = Object.freeze({ ...row(0), detail });
    const doc = document([source]);
    expect(doc.isDirty()).toBe(false);
    expect(doc.getRows()[0]).not.toBe(source);
    expect(doc.getRows()[0].detail).toBe(detail);
    expect(Object.isFrozen(doc.getRows())).toBe(true);
    expect(Object.isFrozen(doc.getRows()[0])).toBe(true);
    expect(Object.getOwnPropertySymbols(source)).toHaveLength(0);
    expect(doc.getLineKey(doc.getRows()[0])).toBe("0");
  });

  it("uses the configured identity property for creation, updates and revert", () => {
    type Custom = { code?: number; quantity: number };
    const doc = createLineItemsDocument<Custom>({
      columns: [{ accessorKey: "quantity" }],
      idKey: "code",
      lines: [{ code: 0, quantity: 1 }],
    });
    const source = Object.freeze({ code: 99, quantity: 2 });
    const key = doc.addLine(source);
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["0", key]);
    expect(doc.getRows()[1].code).toBeUndefined();
    expect(source.code).toBe(99);
    expect(() => doc.updateField("0", "code", 1)).toThrow("save acknowledgment");
    doc.updateField(key, "quantity", 3);
    doc.revert();
    expect(doc.getRows()).toMatchObject([{ code: 0, quantity: 1 }]);
    expect(doc.isDirty()).toBe(false);
  });

  it("treats ID-less initial rows as unsaved creations and discards them on revert", () => {
    const doc = document([row("A"), row(), row()]);
    const initial = doc.getRows();
    const keys = initial.map(doc.getLineKey);
    expect(new Set(keys).size).toBe(3);
    expect(doc.isDirty()).toBe(true);
    doc.updateField(keys[1], "quantity", 2);
    expect(doc.getLineKey(doc.getRows()[1])).toBe(keys[1]);
    doc.removeLine("A");
    doc.revert();
    expect(doc.getRows()).toEqual([initial[0]]);
    expect(doc.getLineKey(doc.getRows()[0])).toBe("A");
    expect(doc.isDirty()).toBe(false);
    expect(() => doc.updateField(keys[1], "quantity", 3)).toThrow("Unknown line");
  });

  it("retains line keys across row copies and sequential updates", () => {
    const doc = document([row("A"), row()]);
    const [oldPersisted, oldCreation] = doc.getRows();
    const lineKey = doc.getLineKey(oldCreation);
    const update = doc.updateField;
    update("A", "name", "Updated");
    update("A", "quantity", 2);
    update(lineKey, "quantity", 3);
    expect(doc.getRows()[0]).toMatchObject({ id: "A", name: "Updated", quantity: 2 });
    expect(doc.getRows()[0]).not.toBe(oldPersisted);
    expect(doc.getLineKey(oldPersisted)).toBe("A");
    expect(doc.getLineKey(doc.getRows()[1])).toBe(lineKey);
    expect(doc.getLineKey({ ...doc.getRows()[1] })).toBe(lineKey);
    expect(oldPersisted.quantity).toBe(1);
    expect(oldCreation.quantity).toBe(1);
    const foreign = document([row("A")]);
    expect(() => doc.getLineKey(foreign.getRows()[0])).toThrow("does not belong");
    expect(() => doc.getLineKey(row("A"))).toThrow("does not belong");
  });

  it("tracks exact field values rather than row reference changes or display precision", () => {
    const doc = document([row("A", 0.3)]);
    const initial = doc.getRows();
    doc.updateField("A", "quantity", 0.3);
    expect(doc.getRows()).toBe(initial);
    doc.updateField("A", "quantity", 0.1 + 0.2);
    expect(doc.isDirty()).toBe(true);
    doc.updateField("A", "quantity", 0.3);
    expect(doc.getRows()).not.toBe(initial);
    expect(doc.isDirty()).toBe(false);
    doc.updateField("A", "detail", { count: 1 });
    expect(doc.isDirty()).toBe(true);
    doc.updateField("A", "detail", undefined);
    expect(doc.isDirty()).toBe(false);
  });

  it("appends fresh creations without copied persisted IDs and cancels add/remove pairs", () => {
    const source = Object.freeze(row("A"));
    const doc = document([source]);
    const added = doc.addLine(source);
    expect(added).not.toBe("A");
    expect(doc.getRows()[1].id).toBeUndefined();
    expect(JSON.stringify(doc.getRows()[1])).not.toContain(added);
    expect(source.id).toBe("A");
    expect(doc.isDirty()).toBe(true);
    doc.removeLine(added);
    expect(doc.isDirty()).toBe(false);
    expect(doc.addLine(source)).not.toBe(added);
  });

  it("moves lines after an anchor or to the front without changing row identity", () => {
    const doc = document([row("A"), row("B"), row("C")]);
    const initial = doc.getRows();
    doc.reorderLine("A", "C");
    expect(doc.getRows()).toEqual([initial[1], initial[2], initial[0]]);
    expect(doc.getRows()[2]).toBe(initial[0]);
    expect(doc.isDirty()).toBe(true);
    doc.reorderLine("A", null);
    expect(doc.getRows()).toEqual(initial);
    expect(doc.isDirty()).toBe(false);
    doc.reorderLine("C", null);
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["C", "A", "B"]);
    doc.revert();
    expect(doc.getRows()).toEqual(initial);
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects invalid moves and preserves the row view for no-op moves", () => {
    const doc = document();
    const initial = doc.getRows();
    doc.reorderLine("A", "A");
    doc.reorderLine("A", null);
    doc.reorderLine("B", "A");
    expect(() => doc.reorderLine("missing", "A")).toThrow("Unknown line");
    expect(() => doc.reorderLine("A", "missing")).toThrow("Unknown line");
    expect(doc.getRows()).toBe(initial);
    expect(doc.isDirty()).toBe(false);
  });

  it("restores persisted values, membership and order on revert", () => {
    const doc = document();
    const initial = doc.getRows();
    doc.updateField("A", "name", "Changed");
    doc.removeLine("A");
    const added = doc.addLine(row("C"));
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["B", added]);
    doc.revert();
    expect(doc.getRows()).toEqual(initial);
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["A", "B"]);
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects unknown rows, unowned properties and identity changes before adoption", () => {
    const doc = document();
    const initial = doc.getRows();
    expect(() => doc.updateField("A", "id", "C")).toThrow("save acknowledgment");
    expect(() => doc.updateField("A", "hidden", "hidden change")).toThrow("no document owner");
    expect(() => doc.updateField("missing", "quantity", 2)).toThrow("Unknown line");
    expect(() => doc.removeLine("missing")).toThrow("Unknown line");
    doc.updateField("A", "id", "A");
    expect(doc.getRows()).toBe(initial);
    expect(doc.isDirty()).toBe(false);
  });

  it("accepts display-only reconfiguration but rejects changing property ownership", () => {
    const doc = document();
    doc.setColumns([
      ...columns.toReversed(),
      { accessorKey: "quantity", id: "duplicate-display", label: "Also quantity" },
      { id: "computed", accessor: (line) => line.quantity * 2 },
    ]);
    expect(() => doc.setColumns([{ accessorKey: "name" }])).toThrow(
      "change document property ownership",
    );
    doc.updateField("A", "quantity", 2);
    expect(doc.getRows()[0].quantity).toBe(2);
    expect(doc.isDirty()).toBe(true);
  });
});
