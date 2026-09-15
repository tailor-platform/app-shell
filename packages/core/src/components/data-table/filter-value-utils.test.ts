import { describe, expect, it } from "vitest";
import {
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
