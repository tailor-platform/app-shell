import { describe, expect, it } from "vitest";
import {
  currencyFractionDigits,
  evaluateNumberDraft,
  evaluateTextDraft,
  isAllowedNumberText,
  isLiveError,
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

describe("isAllowedNumberText", () => {
  it("accepts digits and the empty string", () => {
    expect(isAllowedNumberText("", rules())).toBe(true);
    expect(isAllowedNumberText("120", rules())).toBe(true);
  });

  it("blocks a minus sign when negatives aren't allowed", () => {
    expect(isAllowedNumberText("-", rules({ min: 0 }))).toBe(false);
    expect(isAllowedNumberText("-5", rules({ min: 0 }))).toBe(false);
    expect(isAllowedNumberText("-5", rules({ min: -10 }))).toBe(true);
    expect(isAllowedNumberText("-", rules())).toBe(true);
  });

  it("only accepts a minus sign in first position", () => {
    expect(isAllowedNumberText("5-", rules())).toBe(false);
    expect(isAllowedNumberText("--5", rules())).toBe(false);
  });

  it("blocks the decimal point for whole numbers", () => {
    expect(isAllowedNumberText("5.", rules({ maxDecimals: 0 }))).toBe(false);
    expect(isAllowedNumberText("5", rules({ maxDecimals: 0 }))).toBe(true);
  });

  it("blocks digits past maxDecimals and a second decimal point", () => {
    expect(isAllowedNumberText("1.25", rules())).toBe(true);
    expect(isAllowedNumberText("1.255", rules())).toBe(false);
    expect(isAllowedNumberText("1.2.5", rules())).toBe(false);
  });

  it("rejects letters, exponents and signs Number() would accept", () => {
    for (const text of ["e", "1e5", "+5", "0x1f", "1,000", "12a"]) {
      expect(isAllowedNumberText(text, rules())).toBe(false);
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

describe("isLiveError", () => {
  it("shows errors more typing can't fix right away, and defers the rest", () => {
    expect(isLiveError({ code: "max", max: 1 })).toBe(true);
    expect(isLiveError({ code: "decimals", maxDecimals: 0 })).toBe(true);
    expect(isLiveError({ code: "custom", message: "x" })).toBe(true);
    expect(isLiveError({ code: "min", min: 1 })).toBe(false);
    expect(isLiveError({ code: "required" })).toBe(false);
    expect(isLiveError({ code: "number" })).toBe(false);
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
