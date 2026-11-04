import { describe, expect, it, vi } from "vitest";
import { createLineItemHelper } from "./column-helper";
import { compileLineItemsColumns } from "./columns";

type Row = { id?: string; quantity: number | null; price: number; memo: string | null };
const { column } = createLineItemHelper<Row>();

describe("compileLineItemsColumns", () => {
  it("rejects duplicate IDs, including inferred property IDs", () => {
    expect(() =>
      compileLineItemsColumns<Row>([
        column({ accessorKey: "quantity" }),
        column({ id: "quantity" }),
      ]),
    ).toThrow(/unique/);
    expect(() => compileLineItemsColumns<Row>([column({ id: "" })])).toThrow(/unique/);
  });

  it("allows read-only duplicate views while assigning rules to one property owner", () => {
    const normalize = vi.fn((value: number | null) => (value === null ? null : Math.round(value)));
    const compiled = compileLineItemsColumns<Row>([
      column({ id: "quantity-label", accessorKey: "quantity", type: "text" }),
      column({
        id: "quantity-input",
        accessorKey: "quantity",
        edit: { editorType: "number" },
        normalize,
      }),
      column({ accessorKey: "memo", commit: "metadata" }),
    ]);
    expect(compiled.documentKeys).toEqual(["quantity"]);
    expect(compiled.metadataKeys).toEqual(["memo"]);
    expect(compiled.normalize({ quantity: 1.7, price: 2, memo: null }).quantity).toBe(2);
    expect(normalize).toHaveBeenCalledTimes(1);
  });

  it("rejects competing edit/rule owners rather than assigning priority", () => {
    expect(() =>
      compileLineItemsColumns<Row>([
        column({ id: "first", accessorKey: "quantity", normalize: (value) => value }),
        column({ id: "second", accessorKey: "quantity", validate: () => null }),
      ]),
    ).toThrow(/multiple rule\/edit owners/);
  });

  it("normalizes once from the same merged input context regardless of column order", () => {
    const quantity = column({
      accessorKey: "quantity",
      normalize: (value) => (value === null ? null : value + 1),
    });
    const price = column({
      accessorKey: "price",
      normalize: (value, row) => value * (row.quantity ?? 0),
    });
    const row = Object.freeze({ quantity: 2, price: 10, memo: null });
    for (const columns of [
      [quantity, price],
      [price, quantity],
    ]) {
      expect(compileLineItemsColumns<Row>(columns).normalize(row)).toEqual({
        quantity: 3,
        price: 20,
        memo: null,
      });
    }
    expect(row).toEqual({ quantity: 2, price: 10, memo: null });
  });

  it("has identity defaults and preserves nested leaf references", () => {
    type ObjectRow = { name: string; detail: { count: number } };
    const objectColumn = createLineItemHelper<ObjectRow>().column;
    const compiled = compileLineItemsColumns<ObjectRow>([
      objectColumn({ accessorKey: "name" }),
      objectColumn({ accessorKey: "detail" }),
    ]);
    const row = { name: " untrimmed ", detail: { count: 1 } };
    const normalized = compiled.normalize(row);
    expect(normalized).not.toBe(row);
    expect(normalized.name).toBe(" untrimmed ");
    expect(normalized.detail).toBe(row.detail);
    expect(compiled.equals("detail", normalized.detail, row.detail, row)).toBe(true);
    expect(compiled.equals("detail", { count: 1 }, row.detail, row)).toBe(false);
    expect(compiled.equals("name", null, undefined, row)).toBe(false);
  });

  it("validates every row and read-only property with the owning column ID", () => {
    const validate = vi.fn((value: number | null) =>
      value === null || value < 0 ? "Invalid quantity" : null,
    );
    const compiled = compileLineItemsColumns<Row>([
      column({ id: "qty", accessorKey: "quantity", validate }),
    ]);
    const rows: Row[] = [
      { id: "A", quantity: -1, price: 1, memo: null },
      { id: "B", quantity: 1, price: 1, memo: null },
    ];
    expect(compiled.validate(rows, (row) => row.id!)).toEqual([
      { lineKey: "A", columnId: "qty", message: "Invalid quantity" },
    ]);
    expect(validate).toHaveBeenCalledTimes(2);
  });
});
