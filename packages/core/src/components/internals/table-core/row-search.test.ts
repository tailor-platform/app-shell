import { describe, expect, it, vi } from "vitest";
import { filterRowsByQuery } from "./row-search";

describe("filterRowsByQuery", () => {
  it("returns the original rows for empty or whitespace-only queries", () => {
    const rows = [{ name: "One" }];
    const search = vi.fn(() => false);
    const columns = [{ getValue: (row: { name: string }) => row.name, search }];
    expect(filterRowsByQuery(rows, columns, "")).toBe(rows);
    expect(filterRowsByQuery(rows, columns, "  \u3000 ")).toBe(rows);
    expect(search).not.toHaveBeenCalled();
  });
  it("matches any column case/width-insensitively, retaining row identity and order", () => {
    const rows = [
      { name: "ＳＫＵ-ONE", amount: 10 },
      { name: "Other", amount: 42 },
      { name: "sku-three", amount: 30 },
    ];
    const columns = [
      { getValue: (row: (typeof rows)[number]) => row.name },
      { getValue: (row: (typeof rows)[number]) => row.amount },
    ];
    const found = filterRowsByQuery(rows, columns, "  SKU  ");
    expect(found).toEqual([rows[0], rows[2]]);
    expect(found[0]).toBe(rows[0]);
    expect(filterRowsByQuery(rows, columns, "４２")).toEqual([rows[1]]);
  });
  it("lets a custom matcher replace raw value search and receives a normalized query", () => {
    const rows = [{ code: "PRIVATE" }];
    const getValue = vi.fn((row: (typeof rows)[number]) => row.code);
    const search = vi.fn((_row: (typeof rows)[number], query: string) => query === "label");
    const columns = [{ getValue, search }];
    expect(filterRowsByQuery(rows, columns, " ＬＡＢＥＬ ")).toEqual(rows);
    expect(search).toHaveBeenCalledWith(rows[0], "label");
    expect(filterRowsByQuery(rows, columns, "private")).toEqual([]);
    expect(getValue).not.toHaveBeenCalled();
  });
  it("supports primitive arrays/dates without serializing arbitrary or cyclic objects", () => {
    const cyclic: unknown[] = [];
    cyclic.push(cyclic);
    const values: unknown[] = [
      null,
      undefined,
      true,
      12n,
      ["Badge", "Other"],
      { secret: "Badge" },
      new Date("2026-12-01T00:00:00Z"),
      new Date("invalid"),
      cyclic,
    ];
    const columns = [{ getValue: (value: unknown) => value }];
    expect(filterRowsByQuery(values, columns, "badge")).toEqual([values[4]]);
    expect(filterRowsByQuery(values, columns, "true")).toEqual([true]);
    expect(filterRowsByQuery(values, columns, "12")).toEqual([12n, values[6]]);
    expect(filterRowsByQuery(values, columns, "object")).toEqual([]);
  });
});
