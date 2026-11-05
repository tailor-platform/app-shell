/**
 * Pure helpers for DataTable's choice labels and date/time conversion.
 * Business validation belongs to the consumer.
 *
 * @internal
 */

import {
  CalendarDate,
  CalendarDateTime,
  getLocalTimeZone,
  parseDate,
  toZoned,
} from "@internationalized/date";
import { localDateTimeParts, normalizeTemporalFilterValue } from "@/lib/temporal-filter-values";
import type { SelectOption } from "@/types/collection";
import type { BadgeCellOptions } from "@/components/internals/table-core/column-types";
import type { DataTableFilterConfig } from "./types";

// ── Choices (dropdown and badge editors) ─────────────────────────────────────

/** The label a choice shows, or the raw value when it isn't one of the choices. */
export function optionLabel(options: readonly SelectOption[] | undefined, value: unknown): unknown {
  if (!options || value == null || value === "") return value;
  return options.find((option) => option.value === String(value))?.label ?? value;
}

/**
 * The choices a badge column offers: `edit.options`, else the entries of
 * `typeOptions.badgeLabelMap`, else the column's enum filter options.
 */
export function resolveBadgeOptions(
  options: readonly SelectOption[] | undefined,
  typeOptions: BadgeCellOptions | undefined,
  filter: DataTableFilterConfig | undefined,
): readonly SelectOption[] {
  if (options) return options;
  const labels = typeOptions?.badgeLabelMap;
  if (labels) return Object.entries(labels).map(([value, label]) => ({ value, label }));
  if (filter?.type === "enum") return filter.options;
  return [];
}

// ── Dates ────────────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whether `value` is a date-only ISO string (`"YYYY-MM-DD"`). */
export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

/** A raw date cell value as the calendar day it shows. */
export function toCalendarDate(raw: unknown, timeZone = getLocalTimeZone()): CalendarDate | null {
  const date = normalizeTemporalFilterValue("date", raw, timeZone);
  if (!date) return null;
  try {
    return parseDate(date);
  } catch {
    return null;
  }
}

/** The zoned time of a raw date cell value as `"HH:mm"`; `""` when there is none. */
export function toTimeText(raw: unknown, timeZone = getLocalTimeZone()): string {
  if (isIsoDate(raw)) return "";
  const datetime = normalizeTemporalFilterValue("datetime", raw, timeZone);
  return datetime ? localDateTimeParts(datetime, timeZone).time : "";
}

/** A calendar day plus a zoned `"HH:mm"` as an ISO 8601 timestamp. */
export function toIsoDateTime(
  day: CalendarDate,
  time: string,
  timeZone = getLocalTimeZone(),
): string | undefined {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return undefined;
  const [hours, minutes] = time.split(":").map(Number);
  return toZoned(new CalendarDateTime(day.year, day.month, day.day, hours, minutes), timeZone)
    .toDate()
    .toISOString();
}

/**
 * Whether two raw date values mean the same thing: the same day for a date
 * column, the same minute for a date-time one — so `"2026-10-02"` equals a
 * `Date` for that day, and string formatting differences don't count.
 */
export function sameDate(
  a: unknown,
  b: unknown,
  withTime: boolean,
  timeZone = getLocalTimeZone(),
): boolean {
  if (!withTime) {
    const left = toCalendarDate(a, timeZone);
    const right = toCalendarDate(b, timeZone);
    return left && right ? left.compare(right) === 0 : left === right;
  }
  // Date-only data is incomplete in a datetime editor, not implicit midnight.
  if (isIsoDate(a) || isIsoDate(b)) return a === b;
  const asInstant = (raw: unknown) => {
    const normalized = normalizeTemporalFilterValue("datetime", raw, timeZone);
    return normalized ? new Date(normalized) : null;
  };
  const left = asInstant(a);
  const right = asInstant(b);
  if (!left || !right) return left === right;
  return Math.floor(left.getTime() / 60_000) === Math.floor(right.getTime() / 60_000);
}
