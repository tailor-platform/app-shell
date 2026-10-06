import { describe, expect, it } from "vitest";
import {
  isDecimalFilterValueValid,
  isDecimalRangeOrdered,
  isTemporalFilterType,
  isTemporalFilterValueValid,
  normalizeTemporalFilterValue,
} from "./filter-value-utils";

function mockDate(local: {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds?: number;
  iso: string;
}) {
  const value = new Date(local.iso);
  Object.assign(value, {
    getFullYear: () => local.year,
    getMonth: () => local.month - 1,
    getDate: () => local.day,
    getHours: () => local.hours,
    getMinutes: () => local.minutes,
    getSeconds: () => local.seconds ?? 0,
    getTime: () => 1,
    toISOString: () => local.iso,
  });
  return value;
}

describe("decimal filters", () => {
  it.each(["0", "-0", "+001.20", ".5", "1.", "-9007199254740993.123456789", "1.23e-400"])(
    "accepts decimal %s without converting it to Number",
    (value) => expect(isDecimalFilterValueValid(value)).toBe(true),
  );

  it.each(["", " ", "NaN", "Infinity", "0x10", "1,23", "1e", "1.2.3", "--1"])(
    "rejects invalid decimal %s",
    (value) => expect(isDecimalFilterValueValid(value)).toBe(false),
  );

  it.each([
    ["9007199254740992", "9007199254740993"],
    ["0.12345678901234567890", "0.12345678901234567891"],
    ["-9007199254740993.1", "-9007199254740993.0"],
    ["-0.001", "0"],
    ["0", "0.001"],
    ["-0", "+0"],
    ["-1.2", "-1.20"],
    ["001.20", "1.2"],
    [".5", "0.5"],
    ["1.", "1"],
    ["123e-2", "1.2300"],
    ["1e-400", "2e-400"],
    ["9e99999999999999999999", "1e100000000000000000000"],
  ])("compares %s ≤ %s exactly", (min, max) => {
    expect(isDecimalRangeOrdered(min, max)).toBe(true);
    if (min === "9007199254740992" || min.startsWith("0.123") || min === "1e-400") {
      expect(isDecimalRangeOrdered(max, min)).toBe(false);
    }
  });

  it.each([
    ["10", "2"],
    ["-2", "-10"],
    ["0", "-0.001"],
    ["0.001", "-0"],
    ["1e400", "9e399"],
    ["invalid", "1"],
    ["1", "invalid"],
  ])("rejects unordered or invalid range %s … %s", (min, max) => {
    expect(isDecimalRangeOrdered(min, max)).toBe(false);
  });
});

describe("filter-value-utils", () => {
  it("detects temporal filter types", () => {
    expect(isTemporalFilterType("date")).toBe(true);
    expect(isTemporalFilterType("datetime")).toBe(true);
    expect(isTemporalFilterType("time")).toBe(true);
    expect(isTemporalFilterType("string")).toBe(false);
  });

  it("validates canonical temporal values", () => {
    expect(isTemporalFilterValueValid("date", "2026-09-08")).toBe(true);
    expect(isTemporalFilterValueValid("datetime", "2026-09-08T09:30:45")).toBe(true);
    expect(isTemporalFilterValueValid("time", "09:30")).toBe(true);
    expect(isTemporalFilterValueValid("time", "09:30:00")).toBe(false);
  });

  it("normalizes date values from local date parts instead of UTC ISO slicing", () => {
    const value = mockDate({
      year: 2026,
      month: 9,
      day: 8,
      hours: 0,
      minutes: 0,
      iso: "2026-09-07T15:00:00.000Z",
    });

    expect(normalizeTemporalFilterValue("date", value)).toBe("2026-09-08");
  });

  it("normalizes datetime values from local date/time parts", () => {
    const value = mockDate({
      year: 2026,
      month: 9,
      day: 8,
      hours: 9,
      minutes: 30,
      seconds: 45,
      iso: "2026-09-08T00:30:45.000Z",
    });

    expect(normalizeTemporalFilterValue("datetime", value)).toBe("2026-09-08T09:30:45");
  });

  it("normalizes time strings with seconds to the editable HH:mm format", () => {
    expect(normalizeTemporalFilterValue("time", "09:30:00")).toBe("09:30");
  });

  it("rejects temporal values that still cannot be normalized", () => {
    expect(normalizeTemporalFilterValue("date", "not-a-date")).toBeUndefined();
    expect(normalizeTemporalFilterValue("datetime", "still-not-a-date")).toBeUndefined();
    expect(normalizeTemporalFilterValue("time", "25:61")).toBeUndefined();
  });
});
