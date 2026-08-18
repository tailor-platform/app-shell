import { describe, expect, it } from "vitest";
import {
  CalendarDate,
  CalendarDateTime,
  ZonedDateTime,
  parseDateTime,
  parseZonedDateTime,
} from "@internationalized/date";
import { withDatePart } from "./use-calendar-base-state";

// `withDatePart` is the one place a selection's emitted endpoint type is decided
// — at runtime, by `instanceof` on the previous value. The calendar components
// surface `DateRange<T>` / `T` via a cast that TypeScript can't verify (a cold
// selection with no prior value emits a plain CalendarDate regardless of `T`),
// so this per-branch contract is guarded here at the runtime layer instead. A
// regression that narrowed/widened a returned endpoint type would fail here.

const target = new CalendarDate(2026, 9, 15);

describe("withDatePart", () => {
  it("preserves a CalendarDateTime's time part, keeping the type", () => {
    const result = withDatePart(parseDateTime("2026-08-20T09:30:15"), target);

    expect(result).toBeInstanceOf(CalendarDateTime);
    expect([result.year, result.month, result.day]).toEqual([2026, 9, 15]);
    const dt = result as CalendarDateTime;
    expect([dt.hour, dt.minute, dt.second]).toEqual([9, 30, 15]);
  });

  it("preserves a ZonedDateTime's time and zone, keeping the type", () => {
    const result = withDatePart(parseZonedDateTime("2026-08-20T09:30[America/New_York]"), target);

    expect(result).toBeInstanceOf(ZonedDateTime);
    expect([result.year, result.month, result.day]).toEqual([2026, 9, 15]);
    const zdt = result as ZonedDateTime;
    expect(zdt.hour).toBe(9);
    expect(zdt.timeZone).toBe("America/New_York");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a CalendarDate", new CalendarDate(2026, 8, 20)],
  ])("emits a plain CalendarDate on a cold/date-only base (%s)", (_label, base) => {
    const result = withDatePart(base, target);

    expect(result).toBeInstanceOf(CalendarDate);
    expect(result).not.toBeInstanceOf(CalendarDateTime);
    expect([result.year, result.month, result.day]).toEqual([2026, 9, 15]);
  });
});
