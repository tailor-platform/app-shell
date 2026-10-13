import { describe, expect, it } from "vitest";
import {
  isTemporalFilterType,
  isTemporalFilterValueValid,
  localDateTimeParts,
  normalizeTemporalFilterValue,
} from "@/lib/temporal-filter-values";

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
    expect(isTemporalFilterValueValid("datetime", "2026-99-08T09:30:45")).toBe(false);
    expect(isTemporalFilterValueValid("datetime", "2026-02-30T09:30:45Z")).toBe(false);
    expect(isTemporalFilterValueValid("datetime", "2026-01-01T24:00:00Z")).toBe(false);
    expect(isTemporalFilterValueValid("time", "09:30")).toBe(true);
    expect(isTemporalFilterValueValid("time", "09:30:00")).toBe(false);
  });

  it("extracts date and time values in the configured timezone", () => {
    const value = new Date("2026-09-07T15:00:00.000Z");
    expect(normalizeTemporalFilterValue("date", value, "Asia/Tokyo")).toBe("2026-09-08");
    expect(normalizeTemporalFilterValue("time", value, "Asia/Tokyo")).toBe("00:00");
    expect(normalizeTemporalFilterValue("date", value, "America/Los_Angeles")).toBe("2026-09-07");
    expect(normalizeTemporalFilterValue("time", value, "America/Los_Angeles")).toBe("08:00");
    expect(normalizeTemporalFilterValue("date", "2026-09-08T00:00", "Asia/Tokyo")).toBe(
      "2026-09-08",
    );
    expect(normalizeTemporalFilterValue("time", "2026-09-08T00:00", "Asia/Tokyo")).toBe("00:00");
  });

  it("normalizes datetime values to RFC 3339 instants", () => {
    const value = mockDate({
      year: 2026,
      month: 9,
      day: 8,
      hours: 9,
      minutes: 30,
      seconds: 45,
      iso: "2026-09-08T00:30:45.000Z",
    });

    expect(normalizeTemporalFilterValue("datetime", value)).toBe("2026-09-08T00:30:45.000Z");
  });

  it("converts legacy local datetime strings to RFC 3339 in the configured timezone", () => {
    const value = "2026-09-08T09:30:45";
    expect(normalizeTemporalFilterValue("datetime", value, "America/Los_Angeles")).toBe(
      "2026-09-08T16:30:45.000Z",
    );
  });

  it("interprets minute-only datetime strings in the configured timezone", () => {
    expect(isTemporalFilterValueValid("datetime", "2026-10-09T00:00", "America/Los_Angeles")).toBe(
      true,
    );
    expect(
      normalizeTemporalFilterValue("datetime", "2026-10-09T00:00", "America/Los_Angeles"),
    ).toBe("2026-10-09T07:00:00.000Z");
    expect(localDateTimeParts("2026-10-09T00:00", "America/Los_Angeles")).toEqual({
      date: "2026-10-09",
      time: "00:00",
    });
  });

  it("derives picker values in the configured timezone from an RFC 3339 datetime", () => {
    expect(localDateTimeParts("2026-09-08T16:30:45.000Z", "America/Los_Angeles")).toEqual({
      date: "2026-09-08",
      time: "09:30",
    });
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
