import { describe, expect, it, vi } from "vitest";
import { createLineItemsDocument } from "./model";
import { createLineItemsDocumentStore } from "./store";
import type { LineItemsColumn } from "./types";

type Row = { id?: string | number; name: string; quantity: number; hidden?: { reference: string } };
const columns: LineItemsColumn<Row>[] = [{ accessorKey: "name" }, { accessorKey: "quantity" }];
const initial: Row[] = [
  { id: "A", name: "First", quantity: 1 },
  { id: "B", name: "Second", quantity: 2 },
];
const document = () => createLineItemsDocument({ columns, lines: initial });
const emptyChanges = { added: [], updated: [], removed: [], order: null };

describe("LineItems confirmed collection replacement", () => {
  it("adopts complete readonly input and order as a clean new baseline", () => {
    const value = document();
    value.updateField("A", "quantity", 3);
    value.removeLine("B");
    const hidden = Object.freeze({ reference: "saved" });
    const source = Object.freeze([
      Object.freeze({ id: "B", name: "Confirmed second", quantity: 4, hidden }),
      Object.freeze({ id: "A", name: "Confirmed first", quantity: 3 }),
    ]);
    const replace = value.replaceLines;
    replace(source);
    const confirmed = value.getRows();
    expect(confirmed).toMatchObject(source);
    expect(confirmed).not.toBe(source);
    expect(confirmed[0]).not.toBe(source[0]);
    expect(confirmed[0].hidden).toBe(hidden);
    expect(Object.isFrozen(confirmed)).toBe(true);
    expect(confirmed.every(Object.isFrozen)).toBe(true);
    expect(Object.getOwnPropertySymbols(source[0])).toHaveLength(0);
    expect(confirmed.map(value.getLineKey)).toEqual(["B", "A"]);
    expect(value.getChanges()).toEqual(emptyChanges);
    expect(value.isDirty()).toBe(false);

    value.updateField("B", "quantity", 5);
    value.reorderLine("A", null);
    value.revert();
    expect(value.getRows()).toEqual(confirmed);
    expect(value.getRows()[0]).toBe(confirmed[0]);
    expect(value.getChanges()).toEqual(emptyChanges);
  });

  it("adopts saved creation IDs without aliasing their retired temporary keys", () => {
    const value = document();
    const temporaryKey = value.addLine({ name: "Added", quantity: 3 });
    const creation = value.getRows()[2];
    const confirmed = value.getRows().map((row) => (row === creation ? { ...row, id: "C" } : row));
    value.replaceLines(confirmed);
    expect(value.getRows().map(value.getLineKey)).toEqual(["A", "B", "C"]);
    expect(value.getChanges()).toEqual(emptyChanges);
    const savedCreation = value.getRows()[2];
    expect(value.getLineKey(creation)).toBe(temporaryKey);
    expect(() => value.updateField(temporaryKey, "quantity", 10)).toThrow("Unknown line");

    value.updateField("C", "quantity", 4);
    expect(value.getChanges()).toEqual({
      ...emptyChanges,
      updated: [{ lineKey: "C", changes: { quantity: 4 } }],
    });
    value.removeLine("C");
    expect(value.getChanges()).toEqual({
      added: [],
      updated: [],
      removed: [savedCreation],
      order: ["A", "B"],
    });
  });

  it("uses configured identity keys and accepts finite numeric zero", () => {
    type Custom = { code?: string | number; quantity: number };
    const value = createLineItemsDocument<Custom>({
      columns: [{ accessorKey: "quantity" }],
      idKey: "code",
      lines: [{ code: "old", quantity: 1 }],
    });
    value.replaceLines([{ code: 0, quantity: 2 }]);
    expect(value.getRows().map(value.getLineKey)).toEqual(["0"]);
    expect(value.isDirty()).toBe(false);
    value.updateField("0", "quantity", 3);
    value.revert();
    expect(value.getRows()).toMatchObject([{ code: 0, quantity: 2 }]);
    expect(() => value.replaceLines([{ quantity: 4 }])).toThrow("require persisted IDs");
  });

  it("accepts an empty confirmed collection as the new baseline", () => {
    const value = document();
    value.replaceLines([]);
    expect(value.getRows()).toEqual([]);
    expect(value.getChanges()).toEqual(emptyChanges);
    value.addLine({ name: "Unsaved", quantity: 1 });
    value.revert();
    expect(value.getRows()).toEqual([]);
    expect(value.isDirty()).toBe(false);
  });

  it.each([
    [undefined, "require persisted IDs"],
    [null, "require persisted IDs"],
    ["", "non-empty strings or finite numbers"],
    [Infinity, "non-empty strings or finite numbers"],
    [NaN, "non-empty strings or finite numbers"],
    [{}, "non-empty strings or finite numbers"],
  ])("rejects invalid confirmed ID %s without changing state or baseline", (id, message) => {
    const value = document();
    value.updateField("A", "quantity", 3);
    const before = value.getRows();
    const changes = value.getChanges();
    expect(() =>
      value.replaceLines([{ id: id as Row["id"], name: "Invalid", quantity: 4 }]),
    ).toThrow(message as string);
    expect(value.getRows()).toBe(before);
    expect(value.getChanges()).toEqual(changes);
    value.revert();
    expect(value.getRows()).toMatchObject(initial);
    expect(value.getChanges()).toEqual(emptyChanges);
  });

  it("rejects normalized duplicate IDs without registering candidate identities", () => {
    const value = document();
    const owned = value.getRows()[0];
    const candidate = { ...owned, id: 1 };
    value.updateField("A", "quantity", 3);
    const before = value.getRows();
    expect(() =>
      value.replaceLines([candidate, { id: "1", name: "Duplicate", quantity: 2 }]),
    ).toThrow("Line IDs must be unique");
    expect(value.getRows()).toBe(before);
    expect(value.getLineKey(owned)).toBe("A");
    expect(value.getLineKey(candidate)).toBe("A");
    value.revert();
    expect(value.getRows()).toMatchObject(initial);
    expect(value.getChanges()).toEqual(emptyChanges);
  });

  it("rejects foreign tagged rows while allowing unrelated consumer symbols", () => {
    const value = document();
    const foreign = document().getRows()[0];
    const before = value.getRows();
    expect(() => value.replaceLines([foreign])).toThrow("does not belong to this document");
    expect(value.getRows()).toBe(before);
    const metadata = Symbol("consumer metadata");
    const source = { ...initial[0], [metadata]: "kept" };
    value.replaceLines([source]);
    expect(Reflect.get(value.getRows()[0], metadata)).toBe("kept");
    expect(value.isDirty()).toBe(false);
  });

  it("notifies store subscribers only after both current and baseline adoption", () => {
    const value = createLineItemsDocumentStore({ columns, lines: initial });
    value.updateField("A", "quantity", 3);
    const listener = vi.fn(() => {
      expect(value.getSnapshot()).toMatchObject([{ id: "C", name: "Confirmed", quantity: 4 }]);
      expect(value.isDirty()).toBe(false);
      expect(value.getChanges()).toEqual(emptyChanges);
    });
    value.subscribe(listener);
    const before = value.getSnapshot();
    expect(() => value.replaceLines([{ name: "Invalid", quantity: 1 }])).toThrow();
    expect(value.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    value.replaceLines([{ id: "C", name: "Confirmed", quantity: 4 }]);
    expect(listener).toHaveBeenCalledOnce();
  });
});
