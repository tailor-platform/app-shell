import { describe, expect, it } from "vitest";
import {
  currencyFractionDigits,
  evaluateNumberDraft,
  isIsoDate,
  optionLabel,
  resolveBadgeOptions,
  sameDate,
  toCalendarDate,
  toIsoDateTime,
  toLocalDate,
  toTimeText,
  evaluateTextDraft,
  normalizeNumberText,
  parseNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
  type NumberEditRules,
} from "./cell-edit";

const alwaysCustom = () => "custom";

const rules = (overrides: Partial<NumberEditRules> = {}): NumberEditRules => ({
  maxDecimals: 2,
  required: false,
  ...overrides,
});

describe("typed text that isn't a number", () => {
  it("is reported as not a number, not silently accepted", () => {
    for (const text of ["e", "1e5", "+5", "0x1f", "12a", "1,5"]) {
      expect(evaluateNumberDraft(normalizeNumberText(text), rules()).error).toEqual({
        code: "number",
      });
    }
  });
});

describe("normalizeNumberText", () => {
  it("drops strict thousands grouping", () => {
    expect(normalizeNumberText("1,234.5")).toBe("1234.5");
    expect(normalizeNumberText("-1,234,567")).toBe("-1234567");
  });

  it("leaves a decimal comma alone so it fails instead of becoming 15", () => {
    expect(normalizeNumberText("1,5")).toBe("1,5");
    expect(parseNumberText(normalizeNumberText("1,5"))).toBeUndefined();
  });

  it("converts full-width digits and signs", () => {
    expect(normalizeNumberText("１２．５")).toBe("12.5");
    expect(normalizeNumberText("－３")).toBe("-3");
    expect(normalizeNumberText("−3")).toBe("-3");
  });

  it("strips whitespace and currency symbols", () => {
    expect(normalizeNumberText(" $1,234.50 ")).toBe("1234.50");
    expect(normalizeNumberText("¥ 1 200")).toBe("1200");
  });
});

describe("parseNumberText", () => {
  it("treats an empty draft as null", () => {
    expect(parseNumberText("")).toBeNull();
    expect(parseNumberText("  ")).toBeNull();
  });

  it("parses partial but complete-enough numbers", () => {
    expect(parseNumberText("5.")).toBe(5);
    expect(parseNumberText(".5")).toBe(0.5);
    expect(parseNumberText("-0")).toBe(0);
    expect(Object.is(parseNumberText("-0"), -0)).toBe(false);
  });

  it("rejects half-typed and non-numeric drafts", () => {
    for (const text of ["-", ".", "-.", "abc", "1,5", String(Number.MAX_SAFE_INTEGER * 2)]) {
      expect(parseNumberText(text)).toBeUndefined();
    }
  });
});

describe("evaluateNumberDraft", () => {
  it("returns the parsed value when every rule passes", () => {
    expect(evaluateNumberDraft("12.5", rules({ min: 0, max: 100 }))).toEqual({
      value: 12.5,
      error: null,
    });
  });

  it("checks rules in order: required, number, decimals, min, max, custom", () => {
    const validate = alwaysCustom;
    expect(evaluateNumberDraft("", rules({ required: true }), validate).error).toEqual({
      code: "required",
    });
    expect(evaluateNumberDraft("-", rules(), validate).error).toEqual({ code: "number" });
    expect(evaluateNumberDraft("1.234", rules(), validate).error).toEqual({
      code: "decimals",
      maxDecimals: 2,
    });
    expect(evaluateNumberDraft("-1", rules({ min: 0 }), validate).error).toEqual({
      code: "min",
      min: 0,
    });
    expect(evaluateNumberDraft("101", rules({ max: 100 }), validate).error).toEqual({
      code: "max",
      max: 100,
    });
    expect(evaluateNumberDraft("5", rules(), validate).error).toEqual({
      code: "custom",
      message: "custom",
    });
  });

  it("ignores trailing zeros when counting decimals", () => {
    expect(evaluateNumberDraft("2.50", rules({ maxDecimals: 1 })).error).toBeNull();
    expect(evaluateNumberDraft("3.0", rules({ maxDecimals: 0 })).error).toBeNull();
  });

  it("passes an empty value to validate only when the column isn't required", () => {
    const calls: unknown[] = [];
    const validate = (value: number | null) => {
      calls.push(value);
      return undefined;
    };
    evaluateNumberDraft("", rules(), validate);
    evaluateNumberDraft("", rules({ required: true }), validate);
    expect(calls).toEqual([null]);
  });

  it("treats min and max as inclusive", () => {
    expect(evaluateNumberDraft("0", rules({ min: 0, max: 0 })).error).toBeNull();
  });
});

describe("evaluateTextDraft", () => {
  it("commits text as typed and an emptied field as null", () => {
    expect(evaluateTextDraft(" Hello ", false)).toEqual({ value: " Hello ", error: null });
    expect(evaluateTextDraft("", false)).toEqual({ value: null, error: null });
  });

  it("reports required and custom errors", () => {
    expect(evaluateTextDraft("", true).error).toEqual({ code: "required" });
    expect(evaluateTextDraft("x", false, (v) => (v === "x" ? "No x" : null)).error).toEqual({
      code: "custom",
      message: "No x",
    });
  });
});

describe("value helpers", () => {
  it("compares numbers without floating-point noise", () => {
    expect(sameNumber(10, 10)).toBe(true);
    expect(sameNumber(0.1 + 0.2, 0.3)).toBe(true);
    expect(sameNumber(null, null)).toBe(true);
    expect(sameNumber(0, null)).toBe(false);
    expect(sameNumber(10, 10.01)).toBe(false);
  });

  it("reads raw values the way the renderers do", () => {
    expect(toNumberValue("10.00")).toBe(10);
    expect(toNumberValue("")).toBeNull();
    expect(toNumberValue("abc")).toBeNull();
    expect(toTextValue("")).toBeNull();
    expect(toTextValue(42)).toBe("42");
  });

  it("formats numbers for editing without grouping, exponents or noise", () => {
    expect(toNumberEditText(1234567.5)).toBe("1234567.5");
    expect(toNumberEditText(0.1 + 0.2)).toBe("0.3");
    expect(toNumberEditText(1e21)).toBe("1000000000000000000000");
    expect(toNumberEditText(null)).toBe("");
  });

  it("knows each currency's decimal places", () => {
    expect(currencyFractionDigits("USD")).toBe(2);
    expect(currencyFractionDigits("JPY")).toBe(0);
    expect(currencyFractionDigits("KWD")).toBe(3);
    expect(currencyFractionDigits("NOT-A-CODE")).toBe(2);
  });
});

describe("choices", () => {
  const choices = [
    { value: "acme", label: "Acme Corp" },
    { value: "7", label: "Seven" },
  ];

  it("labels a value by its choice, and leaves unknown or empty values alone", () => {
    expect(optionLabel(choices, "acme")).toBe("Acme Corp");
    expect(optionLabel(choices, 7)).toBe("Seven");
    expect(optionLabel(choices, "other")).toBe("other");
    expect(optionLabel(choices, null)).toBeNull();
    expect(optionLabel(undefined, "acme")).toBe("acme");
  });

  it("takes a badge column's choices from edit.options, then badgeLabelMap, then an enum filter", () => {
    const filter = {
      field: "status",
      type: "enum" as const,
      options: [{ value: "a", label: "A" }],
    };
    const typeOptions = { badgeLabelMap: { open: "Open", closed: "Closed" } };
    expect(resolveBadgeOptions(choices, typeOptions, filter)).toBe(choices);
    expect(resolveBadgeOptions(undefined, typeOptions, filter)).toEqual([
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ]);
    expect(resolveBadgeOptions(undefined, undefined, filter)).toEqual(filter.options);
    expect(resolveBadgeOptions(undefined, undefined, { field: "status", type: "string" })).toEqual(
      [],
    );
  });
});

describe("dates", () => {
  it("recognises date-only strings", () => {
    expect(isIsoDate("2026-10-02")).toBe(true);
    expect(isIsoDate("2026-10-02T09:00:00Z")).toBe(false);
    expect(isIsoDate(20261002)).toBe(false);
  });

  it("reads a date-only string as that local day, and rejects impossible ones", () => {
    const day = toLocalDate("2026-10-02");
    expect([day?.getFullYear(), day?.getMonth(), day?.getDate()]).toEqual([2026, 9, 2]);
    expect(toLocalDate("2026-13-45")).toBeNull();
    expect(toLocalDate("2026-02-30")).toBeNull();
    expect(toLocalDate("not a date")).toBeNull();
    expect(toLocalDate({})).toBeNull();
  });

  it("converts cell values to the calendar day and local time they show", () => {
    expect(toCalendarDate("2026-10-02")?.toString()).toBe("2026-10-02");
    expect(toCalendarDate(new Date(2026, 9, 2, 23, 30))?.toString()).toBe("2026-10-02");
    expect(toCalendarDate(null)).toBeNull();
    expect(toTimeText(new Date(2026, 9, 2, 9, 5))).toBe("09:05");
    expect(toTimeText("2026-10-02")).toBe("00:00");
    expect(toTimeText(undefined)).toBe("");
  });

  it("builds an ISO timestamp from a day and a local time", () => {
    const day = toCalendarDate("2026-10-20")!;
    expect(toIsoDateTime(day, "14:30")).toBe(new Date(2026, 9, 20, 14, 30).toISOString());
    expect(toIsoDateTime(day, "")).toBe(new Date(2026, 9, 20).toISOString());
  });

  it("compares by day for dates and by minute for date-times", () => {
    expect(sameDate("2026-10-02", new Date(2026, 9, 2, 18), false)).toBe(true);
    expect(sameDate("2026-10-02", "2026-10-03", false)).toBe(false);
    const at = new Date(2026, 9, 2, 14, 30, 5);
    expect(sameDate(at.toISOString(), new Date(2026, 9, 2, 14, 30, 50), true)).toBe(true);
    expect(sameDate(at.toISOString(), new Date(2026, 9, 2, 14, 31), true)).toBe(false);
    expect(sameDate(null, undefined, false)).toBe(true);
    expect(sameDate(null, "2026-10-02", false)).toBe(false);
  });
});
