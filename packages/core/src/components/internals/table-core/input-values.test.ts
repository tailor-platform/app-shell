import { describe, expect, it } from "vitest";
import {
  normalizeNumberText,
  parseNumberText,
  sameNumber,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "./input-values";

describe("shared numeric/text input values", () => {
  it.each([
    ["１２．５", 12.5],
    ["−３", -3],
    [" $1,234.50 ", 1234.5],
    ["¥ 1 200", 1200],
    ["5.", 5],
    [".5", 0.5],
    ["", null],
  ] as const)("normalizes and parses %j without business rounding", (text, expected) => {
    expect(parseNumberText(normalizeNumberText(text))).toBe(expected);
  });

  it.each(["1,5", "1,23,456", "1e5", "+5", "0x10", "-", ".", "-.", "Infinity"])(
    "does not silently reinterpret invalid input %j",
    (text) => expect(parseNumberText(normalizeNumberText(text))).toBeUndefined(),
  );

  it("preserves precision and null/zero semantics", () => {
    for (const value of [0.1 + 0.2, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE, 1e-30]) {
      expect(parseNumberText(toNumberEditText(value))).toBe(value);
    }
    expect(sameNumber(0.1 + 0.2, 0.3)).toBe(false);
    expect(sameNumber(0, null)).toBe(false);
    expect(Object.is(parseNumberText("-0"), -0)).toBe(false);
    expect(toNumberEditText(null)).toBe("");
    expect(toNumberValue("0")).toBe(0);
    expect(toNumberValue("not a number")).toBeNull();
    expect(toTextValue(undefined)).toBeNull();
    expect(toTextValue(0)).toBe("0");
    expect(toTextValue("  ")).toBe("  ");
  });
});
