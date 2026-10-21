import { describe, expect, it } from "vitest";

import { createLineItemHelper, fieldToColumnDef, parseLooseDate, parseLooseNumber } from "./field";

describe("parseLooseNumber", () => {
  it.each([
    ["42", 42],
    ["  -3.5 ", -3.5],
    ["1,234", 1234],
    ["1,234,567.89", 1234567.89],
    ["1.234,5", 1234.5],
    ["1,5", 1.5],
    ["$1,200", 1200],
    ["¥ 3 000", 3000],
    ["１２３", 123],
    [".5", 0.5],
  ])("reads %j as %d", (input, expected) => {
    expect(parseLooseNumber(input)).toBe(expected);
  });

  it.each(["", "N/A", "12abc", "1-2", "--"])("rejects %j", (input) => {
    expect(parseLooseNumber(input)).toBeNull();
  });
});

describe("parseLooseDate", () => {
  it.each([
    ["2026-06-01", "2026-06-01"],
    ["2026/6/1", "2026-06-01"],
    ["2026.12.31", "2026-12-31"],
  ])("reads %j as %s", (input, expected) => {
    expect(parseLooseDate(input)).toBe(expected);
  });

  it.each(["2026-02-31", "01/06/2026", "tomorrow", ""])("rejects %j", (input) => {
    expect(parseLooseDate(input)).toBeNull();
  });
});

type Line = { id?: string; qty: number | null; due: string | null };
const f = createLineItemHelper<Line>();
const row: Line = { id: "1", qty: 5, due: "2026-06-10" };

describe("fieldToColumnDef normalizers", () => {
  const qty = fieldToColumnDef(
    f.field({
      key: "qty",
      label: "Qty",
      render: (l) => l.qty,
      type: { kind: "number", decimals: 2 },
    }),
  );
  const due = fieldToColumnDef(
    f.field({
      key: "due",
      label: "Due",
      render: (l) => l.due,
      type: { kind: "date", min: "2026-06-01", max: "2026-06-30" },
    }),
  );

  it("parses pasted numbers and rounds by decimals", () => {
    expect(qty.normalize?.("1,234.567", row)).toBe(1234.57);
  });

  it("keeps the current value when a number can't be read", () => {
    expect(qty.normalize?.("N/A", row)).toBe(5);
  });

  it("keeps the current value for an out-of-range or invalid date", () => {
    expect(due.normalize?.("2026-07-15", row)).toBe("2026-06-10");
    expect(due.normalize?.("2026-02-31", row)).toBe("2026-06-10");
    expect(due.normalize?.("2026/6/20", row)).toBe("2026-06-20");
  });
});
