import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  optionLabel,
  resolveBadgeOptions,
  sameDate,
  toCalendarDate,
  toIsoDateTime,
  toTimeText,
} from "./cell-values";

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

  it("distinguishes incomplete date-only data from explicit midnight in datetime comparisons", () => {
    const day = "2026-10-02";
    const midnight = "2026-10-01T15:00:00.000Z";
    expect(sameDate(day, midnight, true, "Asia/Tokyo")).toBe(false);
    expect(sameDate(midnight, day, true, "Asia/Tokyo")).toBe(false);
    expect(sameDate(day, null, true, "Asia/Tokyo")).toBe(false);
    expect(sameDate(day, day, true, "Asia/Tokyo")).toBe(true);
    expect(sameDate(day, midnight, false, "Asia/Tokyo")).toBe(true);
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
