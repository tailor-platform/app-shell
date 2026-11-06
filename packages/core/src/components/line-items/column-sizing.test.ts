import { describe, expect, it, vi } from "vitest";
import { measureAutoColumns, resolveColumnSizing } from "./column-sizing";

describe("resolveColumnSizing", () => {
  const columns = [
    { id: "fixed", width: 100.5 },
    { id: "auto" },
    { id: "first", width: "flex" },
    { id: "second", width: "flex" },
  ] as const;

  it("keeps measured auto/px widths and gives flex columns equal leftover space", () => {
    const result = resolveColumnSizing(columns, 800, new Map([["auto", 199.5]]));
    expect([...result.widths.values()]).toEqual([100.5, 199.5, 250, 250]);
    expect(result.tableWidth).toBe(800);
    expect(result.spacerWidth).toBe(0);
  });

  it("overflows rather than shrinking declared or control-safe flex widths", () => {
    const result = resolveColumnSizing(columns, 300, new Map([["auto", 199.5]]));
    expect([...result.widths.values()]).toEqual([100.5, 199.5, 120, 120]);
    expect(result.tableWidth).toBe(540);
  });

  it("uses a spacer instead of stretching fixed/auto columns when no column flexes", () => {
    const result = resolveColumnSizing(columns.slice(0, 2), 800, new Map([["auto", 199.5]]));
    expect([...result.widths.values()]).toEqual([100.5, 199.5]);
    expect(result.spacerWidth).toBe(500);
    expect(result.tableWidth).toBe(800);
  });

  it("preserves fractional allocations without rounding pin geometry", () => {
    const result = resolveColumnSizing(columns, 801, new Map([["auto", 200]]));
    expect(result.widths.get("first")).toBe(250.25);
    expect(result.widths.get("second")).toBe(250.25);
  });

  it("keeps zero-pixel columns explicit, and supplies auto geometry before mount", () => {
    const result = resolveColumnSizing([{ id: "zero", width: 0 }, { id: "auto" }], 0, new Map());
    expect([...result.widths.values()]).toEqual([0, 32]);
    expect(result.tableWidth).toBe(32);
  });

  it("handles an empty schema", () => {
    expect(resolveColumnSizing([], 100, new Map())).toEqual({
      widths: new Map(),
      tableWidth: 100,
      spacerWidth: 100,
    });
  });

  it.each([-1, NaN, Infinity])("rejects invalid viewport/column measurements %s", (width) => {
    expect(() => resolveColumnSizing([], width, new Map())).toThrow(RangeError);
    expect(() => resolveColumnSizing([{ id: "fixed", width }], 100, new Map())).toThrow(RangeError);
    expect(() => resolveColumnSizing([{ id: "auto" }], 100, new Map([["auto", width]]))).toThrow(
      RangeError,
    );
  });

  it("restores DOM styles on success/failure and excludes nested measurement targets", () => {
    const container = document.createElement("div");
    const table = document.createElement("table");
    const colgroup = document.createElement("colgroup");
    const col = document.createElement("col");
    col.dataset.columnId = "auto";
    col.style.width = "240px";
    colgroup.append(col);
    table.append(colgroup);
    const cell = table.insertRow().insertCell();
    cell.colSpan = 2;
    cell.style.padding = "4px";
    const nested = document.createElement("table");
    const nestedCol = document.createElement("col");
    nestedCol.dataset.columnId = "auto";
    nested.append(nestedCol);
    cell.append(nested);
    container.append(table);
    table.style.tableLayout = "fixed";
    const before = [table, col, cell, cell.parentElement!].map((element) => element.style.cssText);
    vi.spyOn(table, "getBoundingClientRect").mockReturnValue({ width: 400 } as DOMRect);
    const read = vi
      .spyOn(col, "getBoundingClientRect")
      .mockReturnValue({ width: 143.5 } as DOMRect);
    const nestedRead = vi.spyOn(nestedCol, "getBoundingClientRect");
    const observed = new Map<string, number>();
    measureAutoColumns(table, [{ id: "auto" }], observed);
    expect(observed.get("auto")).toBe(143.5);
    expect(nestedRead).not.toHaveBeenCalled();
    read.mockReturnValue({ width: 50 } as DOMRect);
    measureAutoColumns(table, [{ id: "auto" }], observed);
    expect(observed.get("auto")).toBe(143.5);
    read.mockImplementation(() => {
      throw new Error("Measurement failed");
    });
    expect(() => measureAutoColumns(table, [{ id: "auto" }], observed)).toThrow(
      "Measurement failed",
    );
    expect([table, col, cell, cell.parentElement!].map((element) => element.style.cssText)).toEqual(
      before,
    );
  });

  it("rejects empty or duplicate IDs instead of losing geometry", () => {
    expect(() => resolveColumnSizing([{ id: "" }], 100, new Map())).toThrow(/unique/);
    expect(() =>
      resolveColumnSizing([{ id: "a" }, { id: "a", width: "flex" }], 100, new Map()),
    ).toThrow(/unique/);
  });
});
