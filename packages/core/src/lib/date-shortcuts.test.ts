import { describe, expect, it } from "vitest";
import { CalendarDate } from "@internationalized/date";
import { DATE_SHORTCUT_KEYS, resolveDateShortcut } from "./date-shortcuts";

// Pure-function coverage for the shared shortcut resolver — the cheap place to
// pin down leap-year and week-start edge cases. The behavioural (keyboard →
// onChange) contract lives in the date-field and calendar component tests.

const TODAY = new CalendarDate(2026, 7, 2);
const resolve = (cmd: Parameters<typeof resolveDateShortcut>[0], base: CalendarDate) =>
  resolveDateShortcut(cmd, base, TODAY, "en-US").toString();

describe("resolveDateShortcut", () => {
  it("today returns the provided today, regardless of base", () => {
    expect(resolve("today", new CalendarDate(1999, 1, 1))).toBe("2026-07-02");
  });

  it("month start/end", () => {
    expect(resolve("monthStart", new CalendarDate(2025, 6, 15))).toBe("2025-06-01");
    expect(resolve("monthEnd", new CalendarDate(2025, 6, 15))).toBe("2025-06-30");
  });

  it("month end is leap-year-aware", () => {
    expect(resolve("monthEnd", new CalendarDate(2024, 2, 10))).toBe("2024-02-29");
    expect(resolve("monthEnd", new CalendarDate(2026, 2, 10))).toBe("2026-02-28");
  });

  it("year start/end", () => {
    expect(resolve("yearStart", new CalendarDate(2025, 6, 15))).toBe("2025-01-01");
    expect(resolve("yearEnd", new CalendarDate(2025, 6, 15))).toBe("2025-12-31");
  });

  it("week start/end follow the locale, with firstDayOfWeek override", () => {
    const wed = new CalendarDate(2025, 6, 18); // a Wednesday
    // en-US weeks run Sun → Sat.
    expect(resolve("weekStart", wed)).toBe("2025-06-15");
    expect(resolve("weekEnd", wed)).toBe("2025-06-21");
    // Forced Monday start (the calendar's firstDayOfWeek prop).
    expect(resolveDateShortcut("weekStart", wed, TODAY, "en-US", "mon").toString()).toBe(
      "2025-06-16",
    );
    expect(resolveDateShortcut("weekEnd", wed, TODAY, "en-US", "mon").toString()).toBe(
      "2025-06-22",
    );
  });

  it("day steps roll over month and year boundaries", () => {
    expect(resolve("dayPrev", new CalendarDate(2025, 3, 1))).toBe("2025-02-28");
    expect(resolve("dayPrev", new CalendarDate(2025, 1, 1))).toBe("2024-12-31");
    expect(resolve("dayNext", new CalendarDate(2025, 12, 31))).toBe("2026-01-01");
    expect(resolve("dayNext", new CalendarDate(2024, 2, 29))).toBe("2024-03-01");
  });
});

describe("DATE_SHORTCUT_KEYS", () => {
  it("maps '=' and '+' to the same command (plus works with or without Shift)", () => {
    expect(DATE_SHORTCUT_KEYS["="]).toBe("dayNext");
    expect(DATE_SHORTCUT_KEYS["+"]).toBe("dayNext");
  });

  it("is keyed by lower-cased keys (consumers lower-case before lookup)", () => {
    for (const key of Object.keys(DATE_SHORTCUT_KEYS)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});
