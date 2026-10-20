import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  optionLabel,
  resolveBadgeOptions,
  sameDate,
  toCalendarDate,
  toIsoDateTime,
  toTimeText,
  normalizeNumberText,
  parseNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "./cell-edit";

describe("typed text that isn't a number", () => {
  it("is reported as not a number, not silently accepted", () => {
    for (const text of ["e", "1e5", "+5", "0x1f", "12a", "1,5"]) {
      expect(parseNumberText(normalizeNumberText(text))).toBeUndefined();
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

  it("parses partial but complete-enough numbers without business constraints", () => {
    expect(parseNumberText("-3.5678")).toBe(-3.5678);
    expect(parseNumberText("500.0001")).toBe(500.0001);
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

describe("value helpers", () => {
  it("compares parsed numbers without silently rounding distinct values", () => {
    expect(sameNumber(10, 10)).toBe(true);
    expect(sameNumber(0.1 + 0.2, 0.3)).toBe(false);
    expect(sameNumber(1234567890123456, 1234567890123457)).toBe(false);
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

  it("formats numbers without grouping, exponents, or precision loss", () => {
    expect(toNumberEditText(1234567.5)).toBe("1234567.5");
    expect(toNumberEditText(0.1 + 0.2)).toBe("0.30000000000000004");
    expect(toNumberEditText(1234567890123456)).toBe("1234567890123456");
    expect(toNumberEditText(1e21)).toBe("1000000000000000000000");
    expect(toNumberEditText(null)).toBe("");
    for (const value of [Number.MAX_SAFE_INTEGER, Number.MIN_VALUE, 1e-30, 1.2345678901234567]) {
      expect(parseNumberText(toNumberEditText(value))).toBe(value);
    }
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

  it("converts cell values to the calendar day and local time they show", () => {
    expect(toCalendarDate("2026-10-02")?.toString()).toBe("2026-10-02");
    expect(toCalendarDate(new Date(2026, 9, 2, 23, 30))?.toString()).toBe("2026-10-02");
    expect(toCalendarDate(null)).toBeNull();
    expect(toTimeText(new Date(2026, 9, 2, 9, 5))).toBe("09:05");
    expect(toTimeText("2026-10-02")).toBe("");
    expect(toTimeText(undefined)).toBe("");
  });

  it("builds an ISO timestamp from a day and a local time", () => {
    const day = toCalendarDate("2026-10-20")!;
    expect(toIsoDateTime(day, "14:30")).toBe(new Date(2026, 9, 20, 14, 30).toISOString());
    expect(toIsoDateTime(day, "")).toBeUndefined();
  });

  it("does not fill or coerce an incomplete or invalid time", () => {
    const day = toCalendarDate("2026-10-20")!;
    for (const time of ["", "14:", "9:05", "24:00", "12:60", "-1:00", "abc"]) {
      expect(toIsoDateTime(day, time)).toBeUndefined();
    }
    expect(toIsoDateTime(day, "00:00", "Asia/Tokyo")).toBe("2026-10-19T15:00:00.000Z");
  });

  it("initializes and commits date-times in the configured timezone", () => {
    const zone = "America/New_York";
    const value = "2026-10-09T00:00:00Z";
    expect(toCalendarDate(value, zone)?.toString()).toBe("2026-10-08");
    expect(toTimeText(value, zone)).toBe("20:00");
    expect(toCalendarDate("2026-10-09", zone)?.toString()).toBe("2026-10-09");
    expect(toIsoDateTime(toCalendarDate("2026-10-08")!, "20:00", zone)).toBe(
      "2026-10-09T00:00:00.000Z",
    );
    expect(sameDate(value, "2026-10-08", false, zone)).toBe(true);
    expect(sameDate("2026-10-08T20:00", value, true, zone)).toBe(true);
    expect(toIsoDateTime(toCalendarDate("2026-12-08")!, "20:00", zone)).toBe(
      "2026-12-09T01:00:00.000Z",
    );
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
