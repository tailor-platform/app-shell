import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
  type CalendarDate,
} from "@internationalized/date";

/**
 * QBO-style whole-date keyboard shortcuts, shared by the segmented date field
 * (`components/date-field`) and the calendar grid (`components/calendar`) so
 * both honour the same keys. Pure module — no React, no component imports — so
 * it sits below both consumers without coupling them to each other.
 */

/**
 * Whole-date shortcut commands. Unlike the field's per-segment mutations
 * (`cycle`/`setDigit`), each of these resolves to a complete target date,
 * letting `@internationalized/date` roll month and year boundaries over
 * naturally.
 */
export type DateShortcut =
  | "today"
  | "monthStart"
  | "monthEnd"
  | "yearStart"
  | "yearEnd"
  | "weekStart"
  | "weekEnd"
  | "dayPrev"
  | "dayNext";

/**
 * Week-start override for the `weekStart`/`weekEnd` shortcuts (and the calendar
 * grid). Defined here — with the resolver that consumes it — so the field and
 * calendar engines share one source of truth.
 */
export type FirstDayOfWeek = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/**
 * Key → command, keyed by the lower-cased `KeyboardEvent.key`. `+` and `=` both
 * mean "next day" (so plus works with or without Shift); `-` is previous day.
 * Letters mirror QuickBooks Online's date-box keys. Consumers additionally
 * handle `/` (advance to the next segment) and `Alt+↓` (open the calendar)
 * where those apply.
 */
export const DATE_SHORTCUT_KEYS: Record<string, DateShortcut> = {
  t: "today",
  m: "monthStart",
  h: "monthEnd",
  y: "yearStart",
  r: "yearEnd",
  w: "weekStart",
  k: "weekEnd",
  "-": "dayPrev",
  "=": "dayNext",
  "+": "dayNext",
};

/**
 * Target date for `cmd`, stepping from `base` — the date the control considers
 * current (the field's entered date, or the calendar's focused day). `todayDate`
 * is passed in rather than computed so the caller keeps timezone ownership.
 * Weeks follow the locale's convention unless `firstDayOfWeek` overrides it.
 * Clamping to an allowed range is the caller's job.
 */
export function resolveDateShortcut(
  cmd: DateShortcut,
  base: CalendarDate,
  todayDate: CalendarDate,
  locale: string,
  firstDayOfWeek?: FirstDayOfWeek,
): CalendarDate {
  switch (cmd) {
    case "today":
      return todayDate;
    case "monthStart":
      return startOfMonth(base);
    case "monthEnd":
      return endOfMonth(base);
    case "yearStart":
      return startOfYear(base);
    case "yearEnd":
      return endOfYear(base);
    case "weekStart":
      return startOfWeek(base, locale, firstDayOfWeek);
    case "weekEnd":
      return endOfWeek(base, locale, firstDayOfWeek);
    case "dayPrev":
      return base.subtract({ days: 1 });
    case "dayNext":
      return base.add({ days: 1 });
  }
}
