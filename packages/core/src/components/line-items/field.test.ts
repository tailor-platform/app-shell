import { describe, expect, it } from "vitest";

import {
  createLineItemHelper,
  fieldToColumnDef,
  parseLooseBoolean,
  parseLooseDate,
  parseLooseNumber,
} from "./field";

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

describe("parseLooseBoolean", () => {
  it.each([
    ["TRUE", true],
    ["false", false],
    ["Yes", true],
    ["0", false],
    ["✓", true],
    ["", false],
  ])("reads %j as %s", (input, expected) => {
    expect(parseLooseBoolean(input)).toBe(expected);
  });

  it.each(["maybe", "2", "checked?"])("rejects %j", (input) => {
    expect(parseLooseBoolean(input)).toBeNull();
  });
});

type Line = {
  id?: string;
  qty: number | null;
  due: string | null;
  urgent?: boolean;
  uom?: string | null;
};
const f = createLineItemHelper<Line>();
const row: Line = { id: "1", qty: 5, due: "2026-06-10", urgent: true, uom: "EA" };

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

  const urgent = fieldToColumnDef(
    f.field({ key: "urgent", label: "Urgent", render: () => null, type: { kind: "boolean" } }),
  );
  const uom = fieldToColumnDef(
    f.field({
      key: "uom",
      label: "UoM",
      render: (l) => l.uom,
      type: {
        kind: "select",
        options: [
          { value: "EA", label: "Each" },
          { value: "CS", label: "Case" },
        ],
      },
    }),
  );

  it("stores a pasted boolean as a boolean, not a string", () => {
    expect(urgent.normalize?.("FALSE", row)).toBe(false);
    expect(urgent.normalize?.("true", row)).toBe(true);
    expect(urgent.normalize?.("unclear", row)).toBe(true);
  });

  it("matches a pasted select value or label, keeping the current value otherwise", () => {
    expect(uom.normalize?.("cs", row)).toBe("CS");
    expect(uom.normalize?.("Case", row)).toBe("CS");
    expect(uom.normalize?.("Pallet", row)).toBe("EA");
  });

  it("keeps the current value for an out-of-range or invalid date", () => {
    expect(due.normalize?.("2026-07-15", row)).toBe("2026-06-10");
    expect(due.normalize?.("2026-02-31", row)).toBe("2026-06-10");
    expect(due.normalize?.("2026/6/20", row)).toBe("2026-06-20");
  });
});

describe("field types", () => {
  it("requires a type on an editable field", () => {
    // @ts-expect-error — an editable field without `type` would quietly get a text editor.
    const missing = f.field({ key: "qty", label: "Qty", render: (l) => l.qty, editable: ["edit"] });
    const readOnly = f.field({ key: "qty", label: "Qty", render: (l) => l.qty });
    expect([missing.key, readOnly.key]).toEqual(["qty", "qty"]);
  });
});
