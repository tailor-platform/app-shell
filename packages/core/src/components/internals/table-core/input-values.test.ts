import { describe, expect, it } from "vitest";
import {
  normalizeNumberText,
  parseNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "./input-values";

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
