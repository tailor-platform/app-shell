import { describe, expect, it, vi } from "vitest";
import { createLineItemHelper } from "./column-helper";
import { createLineItemsDocument } from "./document";
import type { LineItemsChangeSet } from "./types";

type Row = {
  id?: string | number;
  productId: string;
  quantity: number | null;
  price: number;
  memo: string | null;
  detail: { count: number } | null;
};
const { column } = createLineItemHelper<Row>();
const columns = [
  column({ accessorKey: "productId", type: "text" }),
  column({ accessorKey: "quantity", type: "number", edit: { editorType: "number" } }),
  column({ accessorKey: "price", type: "money" }),
  column({ accessorKey: "memo", commit: "metadata", edit: { editorType: "text" } }),
  column({ accessorKey: "detail" }),
];
const row = (id?: string | number, quantity = 1): Row => ({
  id,
  productId: "SKU",
  quantity,
  price: 10,
  memo: "memo",
  detail: null,
});
const document = (
  lines: readonly Row[] = [row("A"), row("B")],
  ordering: "sort" | "manual" = "sort",
) => createLineItemsDocument({ columns, lines, ordering });
function added(sent: LineItemsChangeSet<Row>) {
  return sent.lineChanges.filter((change) => change.action === "add");
}
function ordinary(rows: readonly Row[]) {
  return rows.map((value) => ({
    id: value.id,
    productId: value.productId,
    quantity: value.quantity,
    price: value.price,
    memo: value.memo,
    detail: value.detail,
  }));
}

describe("LineItems document adoption and identity", () => {
  it("starts clean without cloning unchanged object-valued leaves", () => {
    const detail = Object.freeze({ count: 1 });
    const source = Object.freeze({ ...row("A"), detail });
    const doc = document(Object.freeze([source]));
    expect(doc.getRows()[0]).not.toBe(source);
    expect(doc.getRows()[0]!.detail).toBe(detail);
    expect(doc.getChangeSet().isEmpty).toBe(true);
    expect(doc.getLineKey(doc.getRows()[0]!)).toBe("A");
    expect(doc.isNewLine(doc.getRows()[0]!)).toBe(false);
    expect(Object.getOwnPropertySymbols(source)).toHaveLength(0);
  });

  it("normalizes all boundaries once and never during validation or diff", () => {
    const normalize = vi.fn((value: number | null) => (value === null ? null : Math.round(value)));
    const doc = createLineItemsDocument({
      columns: [column({ accessorKey: "quantity", normalize }), column({ accessorKey: "price" })],
      lines: [row("A", 1.4)],
    });
    expect(doc.getRows()[0]!.quantity).toBe(1);
    expect(doc.isDirty()).toBe(false);
    expect(normalize).toHaveBeenCalledTimes(1);
    doc.getChangeSet();
    doc.getErrors();
    doc.getChangeSet();
    expect(normalize).toHaveBeenCalledTimes(1);
    doc.updateLines([
      { lineKey: "A", patch: { quantity: 2.4 } },
      { lineKey: "A", patch: { price: 20 } },
    ]);
    expect(normalize).toHaveBeenCalledTimes(2);
    doc.adoptExternal([{ ...doc.getRows()[0]!, quantity: 3.4 }]);
    expect(normalize).toHaveBeenCalledTimes(3);
    expect(doc.getRows()[0]!.quantity).toBe(3);
    const sent = doc.getChangeSet();
    doc.reset([row("A", 3.2)], { sent });
    expect(normalize).toHaveBeenCalledTimes(4);
    expect(doc.getRows()[0]!.quantity).toBe(3);
    expect(doc.isDirty()).toBe(false);
    doc.addLines([row(undefined, 4.3)]);
    expect(normalize).toHaveBeenCalledTimes(5);
  });

  it("retains business values for hook-owned document validation", () => {
    const doc = createLineItemsDocument({
      columns: [
        column({
          accessorKey: "quantity",
        }),
      ],
      lines: [row("A", -1), row("B")],
    });
    expect(doc.isDirty()).toBe(false);
    expect(doc.getRows()[0]!.quantity).toBe(-1);
    expect(doc.getErrors()).toEqual([]);
    doc.updateLines([{ lineKey: "B", patch: { quantity: -2 } }]);
    expect(doc.getRows()[1]!.quantity).toBe(-2);
    expect(doc.getErrors()).toEqual([]);
  });

  it("does not trim text or apply an epsilon implicitly", () => {
    const doc = document([{ ...row("A"), productId: " SKU ", price: 0.3 }]);
    expect(doc.getRows()[0]!.productId).toBe(" SKU ");
    doc.updateLines([{ lineKey: "A", patch: { price: 0.1 + 0.2 } }]);
    expect(doc.isDirty()).toBe(true);
    doc.updateLines([{ lineKey: "A", patch: { price: 0.3 } }]);
    expect(doc.isDirty()).toBe(false);
  });

  it("uses custom equality for dirty tracking", () => {
    const doc = createLineItemsDocument({
      columns: [column({ accessorKey: "price", equals: (a, b) => Math.abs(a - b) < 0.01 })],
      lines: [row("A")],
    });
    doc.updateLines([{ lineKey: "A", patch: { price: 10.001 } }]);
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects duplicate/invalid IDs, including numeric/string aliases, and preserves zero", () => {
    expect(() => document([row(1), row("1")])).toThrow(/unique/);
    expect(() => document([row("")])).toThrow(/non-empty/);
    expect(() => document([row(Infinity)])).toThrow(/finite/);
    const doc = document([row(0)]);
    expect(doc.getLineKey(doc.getRows()[0]!)).toBe("0");
  });

  it("new rows drop copied IDs, carry only private identity, and survive object spread", () => {
    const source = Object.freeze(row("existing"));
    const doc = document([]);
    const [key] = doc.addLines([source]);
    const line = doc.getRows()[0]!;
    expect(line.id).toBeUndefined();
    expect(doc.getLineKey({ ...line })).toBe(key);
    expect(doc.isNewLine(line)).toBe(true);
    expect(JSON.stringify(line)).not.toContain(key);
    expect(source.id).toBe("existing");
    const change = added(doc.getChangeSet())[0]!;
    expect(change.data.productId).toBe("SKU");
    expect(change.data).not.toHaveProperty("id");
    expect(Object.getOwnPropertySymbols(change.data)).toHaveLength(0);
  });

  it("keeps external adoption separate from baseline replacement", () => {
    const doc = document([row("A")]);
    doc.adoptExternal([row("A", 2), row("B")]);
    expect(doc.isDirty()).toBe(true);
    doc.revert();
    expect(ordinary(doc.getRows())).toEqual([row("A")]);
    doc.reset([row("A", 3)]);
    expect(doc.isDirty()).toBe(false);
    expect(doc.getRows()[0]!.quantity).toBe(3);
  });

  it("supports a custom server-ID property without leaking it into creation data", () => {
    type CustomRow = { key?: number; quantity: number };
    const custom = createLineItemHelper<CustomRow>().column;
    const doc = createLineItemsDocument({
      columns: [custom({ accessorKey: "quantity" })],
      idKey: "key",
      lines: [{ key: 0, quantity: 1 }],
    });
    const [tempId] = doc.addLines([{ key: 99, quantity: 2 }]);
    const sent = doc.getChangeSet();
    const creation = sent.lineChanges.find((change) => change.action === "add")!;
    expect(creation).toEqual({ action: "add", tempId, data: { quantity: 2 } });
    doc.reset({ idMap: { [tempId!]: 10 } }, { sent });
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["0", "10"]);
    expect(doc.getRows()[1]!.key).toBe(10);
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects unowned changes atomically rather than adopting values that cannot be saved", () => {
    const doc = createLineItemsDocument<Row>({
      columns: [column({ accessorKey: "quantity" })],
      lines: [row("A"), row("B")],
    });
    const before = doc.getRows();
    const revision = doc.getRevision();
    expect(() =>
      doc.updateLines([
        { lineKey: "A", patch: { quantity: 2 } },
        { lineKey: "B", patch: { productId: "another product" } },
      ]),
    ).toThrow(/no document or metadata owner/);
    expect(doc.getRows()).toBe(before);
    expect(doc.getRevision()).toBe(revision);
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects identity changes and invalid batches without partial mutation", () => {
    const doc = document();
    const before = doc.getRows();
    expect(() =>
      doc.updateLines([
        { lineKey: "A", patch: { quantity: 2 } },
        { lineKey: "B", patch: { id: "C" } },
      ]),
    ).toThrow(/IDs may only/);
    expect(doc.getRows()).toBe(before);
    expect(() => doc.adoptExternal([{ ...doc.getRows()[0]!, id: "C" }])).toThrow(/IDs may only/);
    expect(doc.getRows()).toBe(before);
    expect(() => doc.removeLines(["A", "missing"])).toThrow(/Unknown line/);
    expect(doc.getRows()).toBe(before);
  });
});

describe("LineItems changes and ordering", () => {
  it("reads commands live, cancels add/remove, and clears dirty on restoring a value", () => {
    const doc = document();
    const [key] = doc.addLines([row()]);
    expect(doc.getChangeSet().lineChanges).toHaveLength(1);
    doc.removeLines([key!]);
    expect(doc.getChangeSet().isEmpty).toBe(true);
    doc.updateLines([{ lineKey: "A", patch: { quantity: 2 } }]);
    expect(doc.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "A", patch: { quantity: 2 } },
    ]);
    doc.updateLines([{ lineKey: "A", patch: { quantity: 1 } }]);
    expect(doc.getChangeSet().isEmpty).toBe(true);
    doc.removeLines(["B"]);
    expect(doc.getChangeSet().lineChanges).toEqual([{ action: "remove", lineId: "B" }]);
  });

  it("represents a middle insertion with complete final order and acknowledges it in place", () => {
    const doc = document(undefined, "manual");
    const [tempId] = doc.addLines([row()], { afterLineKey: "A" });
    const sent = doc.getChangeSet();
    expect(sent.order).toEqual([{ lineId: "A" }, { tempId }, { lineId: "B" }]);
    doc.reset({ idMap: { [tempId!]: "N" } }, { sent });
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["A", "N", "B"]);
    expect(doc.getChangeSet().isEmpty).toBe(true);
  });

  it("expresses reorder/remove/new rows together, with no order for presentation sorting", () => {
    const doc = document([row("A"), row("B"), row("C")], "manual");
    const [tempId] = doc.addLines([row()], { afterLineKey: null });
    doc.removeLines(["B"]);
    doc.reorder("C", "A");
    const sent = doc.getChangeSet();
    expect(sent.order).toEqual([{ tempId }, { lineId: "A" }, { lineId: "C" }]);
    const ids = new Set(["A", "B", "C"]);
    for (const change of sent.lineChanges) {
      if (change.action === "remove") ids.delete(change.lineId);
      if (change.action === "add") ids.add(change.tempId);
    }
    expect(new Set(sent.order!.map((ref) => ref.lineId ?? ref.tempId))).toEqual(ids);
    expect(() => document().reorder("A", "B")).toThrow(/manual/);
    expect(document().getChangeSet()).not.toHaveProperty("order");
  });

  it("restores the original order to clean and ignores dropping a row on itself", () => {
    const doc = document(undefined, "manual");
    const revision = doc.getRevision();
    doc.reorder("A", "A");
    expect(doc.getRevision()).toBe(revision);
    doc.reorder("B", null);
    expect(doc.isDirty()).toBe(true);
    doc.reorder("B", "A");
    expect(doc.isDirty()).toBe(false);
  });
});

describe("LineItems save receipts and rebasing", () => {
  it("keeps edits made during a save and adopts canonical values for unchanged fields", () => {
    const doc = document([row("A")]);
    doc.updateLines([{ lineKey: "A", patch: { quantity: 2 } }]);
    const sent = doc.getChangeSet();
    doc.updateLines([{ lineKey: "A", patch: { quantity: 3 } }]);
    doc.reset([{ ...row("A", 2), price: 15 }], { sent });
    expect(doc.getRows()[0]!.quantity).toBe(3);
    expect(doc.getRows()[0]!.price).toBe(15);
    expect(doc.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "A", patch: { quantity: 3 } },
    ]);
    expect(doc.isDirty()).toBe(true);
  });

  it("normalizes the final merged row when canonical and local changes affect cross-property rules", () => {
    type CalculatedRow = { id: string; quantity: number; price: number; total: number };
    const calculated = createLineItemHelper<CalculatedRow>().column;
    const normalize = vi.fn(
      (_value: number, context: Readonly<CalculatedRow>) => context.quantity * context.price,
    );
    const doc = createLineItemsDocument<CalculatedRow>({
      columns: [
        calculated({ accessorKey: "quantity" }),
        calculated({ accessorKey: "price" }),
        calculated({ accessorKey: "total", normalize }),
      ],
      lines: [{ id: "A", quantity: 1, price: 1, total: 1 }],
    });
    const sent = doc.getChangeSet();
    doc.updateLines([{ lineKey: "A", patch: { quantity: 2 } }]);
    doc.reset([{ id: "A", quantity: 1, price: 3, total: 3 }], { sent });
    expect(doc.getRows()[0]).toMatchObject({ quantity: 2, price: 3, total: 6 });
    expect(doc.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "A", patch: { quantity: 2, total: 6 } },
    ]);
    expect(normalize).toHaveBeenCalledTimes(4);
  });

  it("correlates canonical created rows explicitly, preserving edits after creation was submitted", () => {
    const doc = document([]);
    const [tempId] = doc.addLines([row()]);
    const original = doc.getRows()[0]!;
    const sent = doc.getChangeSet();
    doc.updateLines([{ lineKey: tempId!, patch: { quantity: 4 } }]);
    doc.reset([{ ...row("N"), price: 12 }], { sent, idMap: { [tempId!]: "N" } });
    expect(doc.getLineKey(original)).toBe("N");
    expect(doc.isNewLine(doc.getRows()[0]!)).toBe(false);
    expect(doc.getRows()[0]!.quantity).toBe(4);
    expect(doc.getRows()[0]!.price).toBe(12);
    expect(doc.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "N", patch: { quantity: 4 } },
    ]);
  });

  it("keeps created-then-locally-removed rows as removals of their assigned server IDs", () => {
    const doc = document([]);
    const [tempId] = doc.addLines([row()]);
    const sent = doc.getChangeSet();
    doc.removeLines([tempId!]);
    doc.reset([row("N")], { sent, idMap: { [tempId!]: "N" } });
    expect(doc.getRows()).toEqual([]);
    expect(doc.getChangeSet().lineChanges).toEqual([{ action: "remove", lineId: "N" }]);
  });

  it("turns a locally restored row into a new creation after its submitted removal succeeds", () => {
    const doc = document([row("A")]);
    doc.removeLines(["A"]);
    const sent = doc.getChangeSet();
    doc.revert();
    doc.reset([], { sent });
    expect(doc.getRows()[0]!.id).toBeUndefined();
    expect(doc.isNewLine(doc.getRows()[0]!)).toBe(true);
    const remaining = doc.getChangeSet();
    expect(remaining.lineChanges).toHaveLength(1);
    expect(remaining.lineChanges[0]!.action).toBe("add");
    expect(doc.getLineKey(doc.getRows()[0]!)).not.toBe("A");
  });

  it("preserves later additions/removals/order changes while acknowledging submitted updates", () => {
    const doc = document(undefined, "manual");
    doc.updateLines([{ lineKey: "A", patch: { quantity: 2 } }]);
    const sent = doc.getChangeSet();
    const [newKey] = doc.addLines([row()], { afterLineKey: null });
    doc.removeLines(["B"]);
    doc.reset({ idMap: {} }, { sent });
    expect(doc.getRows().map(doc.getLineKey)).toEqual([newKey, "A"]);
    const remaining = doc.getChangeSet();
    expect(remaining.lineChanges.map((change) => change.action)).toEqual(["remove", "add"]);
    expect(remaining.order).toEqual([{ tempId: newKey }, { lineId: "A" }]);
  });

  it("preserves order changed during a save while accepting canonical server order otherwise", () => {
    const doc = document(undefined, "manual");
    const sent = doc.getChangeSet();
    doc.reorder("B", null);
    doc.reset([row("A"), row("B")], { sent });
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["B", "A"]);
    expect(doc.isDirty()).toBe(true);
    const second = doc.getChangeSet();
    doc.reset([row("A"), row("B")], { sent: second });
    expect(doc.getRows().map(doc.getLineKey)).toEqual(["A", "B"]);
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects incomplete/duplicate/unknown mappings before changing current/baseline", () => {
    const doc = document();
    const [tempId] = doc.addLines([row()]);
    const sent = doc.getChangeSet();
    const before = doc.getRows();
    for (const idMap of [{}, { [tempId!]: "A" }, { [tempId!]: "N", unknown: "X" }]) {
      expect(() => doc.reset({ idMap }, { sent })).toThrow();
      expect(doc.getRows()).toBe(before);
      expect(doc.isDirty()).toBe(true);
    }
    expect(() => doc.reset([row("A"), row("B"), row("N")], { sent })).toThrow(/Missing server ID/);
    expect(() =>
      doc.reset([row("A"), row("N"), row("N")], { sent, idMap: { [tempId!]: "N" } }),
    ).toThrow(/unique/);
    expect(doc.getRows()).toBe(before);
    doc.reset({ idMap: { [tempId!]: "N" } }, { sent });
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects assigned IDs changed by normalization without consuming the receipt", () => {
    const doc = createLineItemsDocument<Row>({
      columns: [
        column({
          accessorKey: "id",
          normalize: (value) => (typeof value === "string" ? value.toUpperCase() : value),
        }),
        column({ accessorKey: "quantity" }),
      ],
      lines: [],
    });
    const [tempId] = doc.addLines([row()]);
    const sent = doc.getChangeSet();
    const before = doc.getRows();
    const revision = doc.getRevision();
    expect(() => doc.reset({ idMap: { [tempId!]: "server-1" } }, { sent })).toThrow(
      /cannot change an acknowledged line ID/,
    );
    expect(doc.getRows()).toBe(before);
    expect(doc.getRevision()).toBe(revision);
    expect(doc.getLineKey(before[0]!)).toBe(tempId);
    expect(doc.isDirty()).toBe(true);
    doc.reset({ idMap: { [tempId!]: "SERVER-1" } }, { sent });
    expect(doc.getLineKey(doc.getRows()[0]!)).toBe("SERVER-1");
    expect(doc.isDirty()).toBe(false);
  });

  it("rejects incomplete canonical membership and malformed rows atomically", () => {
    const doc = document();
    doc.updateLines([{ lineKey: "A", patch: { quantity: 2 } }]);
    const sent = doc.getChangeSet();
    const before = doc.getRows();
    for (const saved of [[row("A")], [row("A"), row("C")], [row("A"), row()]]) {
      expect(() => doc.reset(saved, { sent })).toThrow();
      expect(doc.getRows()).toBe(before);
    }
  });

  it("does not partially acknowledge when a custom equality check throws", () => {
    let fail = false;
    const doc = createLineItemsDocument<Row>({
      columns: [
        column({
          accessorKey: "memo",
          commit: "metadata",
          equals: (left, right) => {
            if (fail) throw new Error("Comparison failed");
            return Object.is(left, right);
          },
        }),
      ],
      lines: [],
    });
    const [tempId] = doc.addLines([row()]);
    const sent = doc.getChangeSet();
    doc.removeLines([tempId!]);
    const revision = doc.getRevision();
    fail = true;
    expect(() => doc.reset([row("N")], { sent, idMap: { [tempId!]: "N" } })).toThrow(
      "Comparison failed",
    );
    expect(doc.getRevision()).toBe(revision);
    expect(doc.isDirty()).toBe(false);
    fail = false;
    doc.reset([row("N")], { sent, idMap: { [tempId!]: "N" } });
    expect(doc.getChangeSet().lineChanges).toEqual([{ action: "remove", lineId: "N" }]);
  });

  it("binds receipts to this document/baseline, makes duplicates idempotent and replacements invalidate them", () => {
    const doc = document();
    const first = doc.getChangeSet();
    const concurrent = doc.getChangeSet();
    expect(() => document().reset(undefined, { sent: first })).toThrow(/foreign/);
    expect(() => doc.reset(undefined, { sent: { ...first } })).toThrow(/foreign/);
    doc.reset(undefined, { sent: first });
    const revision = doc.getRevision();
    doc.reset(undefined, { sent: first });
    expect(doc.getRevision()).toBe(revision);
    expect(() => doc.reset(undefined, { sent: concurrent })).toThrow(/Stale/);
    doc.reset([row("C")]);
    expect(() => doc.reset(undefined, { sent: first })).toThrow(/foreign/);
  });

  it("freezes public snapshot containers and does not derive receipts from transport mutations", () => {
    const doc = document();
    doc.updateLines([{ lineKey: "A", patch: { quantity: 2 } }]);
    const sent = doc.getChangeSet();
    expect(Object.isFrozen(sent)).toBe(true);
    expect(Object.isFrozen(sent.lineChanges)).toBe(true);
    const change = sent.lineChanges[0]!;
    expect(change.action).toBe("update");
    if (change.action !== "update") throw new Error("Expected update");
    expect(Object.isFrozen(change.patch)).toBe(true);
    expect(() => Object.assign(change.patch, { quantity: 999 })).toThrow();
    doc.updateLines([{ lineKey: "A", patch: { quantity: 3 } }]);
    doc.reset(undefined, { sent });
    expect(doc.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "A", patch: { quantity: 3 } },
    ]);
  });

  it("cannot mark unidentified new rows saved without a receipt and complete mapping", () => {
    const doc = document([]);
    doc.addLines([row()]);
    expect(() => doc.reset()).toThrow(/New lines require/);
    expect(() => doc.reset({ idMap: {} })).toThrow(/requires the submitted/);
    expect(doc.isDirty()).toBe(true);
    const sent = doc.getChangeSet();
    expect(() => doc.reset(undefined, { sent })).toThrow(/Missing server ID/);
  });
});

describe("metadata remains independent of document Discard", () => {
  it("keeps metadata edits outside document changes and retains them on Discard", () => {
    const doc = document([row("A")]);
    doc.updateLines([{ lineKey: "A", patch: { memo: "new", quantity: 2 } }]);
    expect(doc.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "A", patch: { quantity: 2 } },
    ]);
    doc.revert();
    expect(doc.getRows()[0]!.memo).toBe("new");
    expect(doc.getRows()[0]!.quantity).toBe(1);
    expect(doc.isDirty()).toBe(false);
  });

  it("restores deleted rows with their latest metadata rather than stale document baseline", () => {
    const doc = document([row("A")]);
    doc.updateLines([{ lineKey: "A", patch: { memo: "latest" } }]);
    doc.removeLines(["A"]);
    doc.revert();
    expect(doc.getRows()[0]!.memo).toBe("latest");
  });

  it("includes new-row metadata on create but preserves later metadata across rekey", () => {
    const doc = document([]);
    const [tempId] = doc.addLines([row()]);
    const sent = doc.getChangeSet();
    expect(added(sent)[0]!.data.memo).toBe("memo");
    doc.updateLines([{ lineKey: tempId!, patch: { memo: "later" } }]);
    doc.reset([row("N")], { sent, idMap: { [tempId!]: "N" } });
    expect(doc.getRows()[0]!.memo).toBe("later");
    expect(doc.isDirty()).toBe(false);
    doc.revert();
    expect(doc.getRows()[0]!.memo).toBe("later");
  });

  it("keeps metadata changed before a row was removed during its creation request", () => {
    const doc = document([]);
    const [tempId] = doc.addLines([row()]);
    const sent = doc.getChangeSet();
    doc.updateLines([{ lineKey: tempId!, patch: { memo: "latest" } }]);
    doc.removeLines([tempId!]);
    doc.reset([row("N")], { sent, idMap: { [tempId!]: "N" } });
    doc.revert();
    expect(doc.getRows()[0]!.id).toBe("N");
    expect(doc.getRows()[0]!.memo).toBe("latest");
  });

  it("does not let a document response overwrite independently saved metadata", () => {
    const doc = document([row("A")]);
    doc.updateLines([{ lineKey: "A", patch: { memo: "saved elsewhere", quantity: 2 } }]);
    const sent = doc.getChangeSet();
    doc.reset([row("A", 2)], { sent });
    expect(doc.getRows()[0]!.memo).toBe("saved elsewhere");
    doc.revert();
    expect(doc.getRows()[0]!.memo).toBe("saved elsewhere");
  });
});
