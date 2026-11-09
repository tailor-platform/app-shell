import { describe, expect, it, vi } from "vitest";
import { createLineItemsDocumentStore } from "./store";
import type { LineItemsColumn } from "./types";

type Row = { id?: string; name: string; quantity: number; hidden?: string };
const columns: LineItemsColumn<Row>[] = [
  { accessorKey: "name", type: "text" },
  { accessorKey: "quantity", type: "number" },
];
const store = () =>
  createLineItemsDocumentStore<Row>({
    columns,
    lines: [
      { id: "A", name: "First", quantity: 1 },
      { id: "B", name: "Second", quantity: 1 },
    ],
  });

describe("LineItems document store notifications", () => {
  it("returns a cached snapshot without publishing reads or configuration checks", () => {
    const value = store();
    const initial = value.getSnapshot();
    const listener = vi.fn();
    value.subscribe(listener);
    expect(value.getSnapshot()).toBe(initial);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(initial.every(Object.isFrozen)).toBe(true);
    expect(value.getLineKey(initial[0])).toBe("A");
    expect(value.isDirty()).toBe(false);
    value.setColumns(columns.toReversed());
    expect(value.getSnapshot()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies after adoption for every row command and preserves their return values", () => {
    const value = store();
    const observed: { rows: readonly Row[]; dirty: boolean }[] = [];
    const listener = vi.fn(() =>
      observed.push({ rows: value.getSnapshot(), dirty: value.isDirty() }),
    );
    value.subscribe(listener);
    const key = value.addLine({ name: "Added", quantity: 3 });
    expect(value.getLineKey(observed[0].rows[2])).toBe(key);
    expect(observed[0].dirty).toBe(true);
    value.updateField("A", "quantity", 2);
    expect(observed[1].rows[0].quantity).toBe(2);
    value.reorderLine(key, null);
    expect(value.getLineKey(observed[2].rows[0])).toBe(key);
    value.removeLine(key);
    expect(observed[3].rows.map(value.getLineKey)).toEqual(["A", "B"]);
    value.revert();
    expect(observed[4].rows).toBe(value.getSnapshot());
    expect(observed[4].rows[0].quantity).toBe(1);
    expect(observed[4].dirty).toBe(false);
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it("does not notify or change the snapshot for invalid writes and no-ops", () => {
    const value = store();
    const initial = value.getSnapshot();
    const listener = vi.fn();
    value.subscribe(listener);
    value.updateField("A", "quantity", 1);
    value.reorderLine("A", "A");
    value.reorderLine("A", null);
    value.reorderLine("B", "A");
    expect(() => value.updateField("A", "id", "C")).toThrow("save acknowledgment");
    expect(() => value.updateField("A", "hidden", "hidden change")).toThrow("no document owner");
    expect(() => value.removeLine("missing")).toThrow("Unknown line");
    expect(() => value.reorderLine("A", "missing")).toThrow("Unknown line");
    expect(() => value.setColumns([])).toThrow("change document property ownership");
    expect(value.getSnapshot()).toBe(initial);
    expect(value.isDirty()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it("publishes revert even when already clean and supports idempotent unsubscribe", () => {
    const value = store();
    const initial = value.getSnapshot();
    const listener = vi.fn();
    const detach = value.subscribe(listener);
    value.revert();
    const restored = value.getSnapshot();
    expect(restored).not.toBe(initial);
    expect(restored[0]).toBe(initial[0]);
    value.revert();
    expect(value.getSnapshot()).not.toBe(restored);
    expect(value.getSnapshot()[0]).toBe(initial[0]);
    expect(value.isDirty()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    detach();
    detach();
    value.updateField("A", "quantity", 2);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
