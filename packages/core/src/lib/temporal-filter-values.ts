import {
  fromDate,
  getLocalTimeZone,
  parseAbsolute,
  parseDateTime,
  toZoned,
} from "@internationalized/date";
import type { FilterConfig } from "@/types/collection";

export type TemporalFilterType = Extract<FilterConfig["type"], "datetime" | "date" | "time">;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIME_WITH_SECONDS_RE = /^((?:[01]\d|2[0-3]):[0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDate(value: Date, timeZone: string): string {
  const date = fromDate(value, timeZone);
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

function formatLocalTime(value: Date, timeZone: string): string {
  const date = fromDate(value, timeZone);
  return `${pad2(date.hour)}:${pad2(date.minute)}`;
}

function toValidDate(value: unknown, timeZone: string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" || typeof value === "string") {
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (trimmed === "") return null;
    if (typeof trimmed === "string" && DATETIME_RE.test(trimmed)) {
      return toValidDateTime(trimmed, timeZone)?.toDate() ?? null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toValidDateTime(value: string, timeZone: string) {
  if (!DATETIME_RE.test(value)) return null;
  try {
    return /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      ? parseAbsolute(value, timeZone)
      : toZoned(parseDateTime(value), timeZone);
  } catch {
    return null;
  }
}

export function isTemporalFilterType(type: FilterConfig["type"]): type is TemporalFilterType {
  return type === "datetime" || type === "date" || type === "time";
}

export function isTemporalFilterValueValid(
  type: TemporalFilterType,
  value: string,
  timeZone = getLocalTimeZone(),
): boolean {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return false;

  switch (type) {
    case "datetime":
      // Legacy filters may be local datetimes; DataTable editors serialize new
      // values as RFC 3339 instants.
      return toValidDateTime(trimmedValue, timeZone) != null;
    case "date":
      return DATE_RE.test(trimmedValue);
    case "time":
      return TIME_RE.test(trimmedValue);
  }
}

export function normalizeTemporalFilterValue(
  type: TemporalFilterType,
  value: unknown,
  timeZone = getLocalTimeZone(),
): string | undefined {
  if (value == null || value === "") return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;

    switch (type) {
      case "date": {
        if (DATE_RE.test(trimmed)) return trimmed;
        const date = toValidDate(trimmed, timeZone);
        return date ? formatLocalDate(date, timeZone) : undefined;
      }
      case "datetime": {
        const datetime = toValidDateTime(trimmed, timeZone);
        if (datetime) return datetime.toDate().toISOString();
        if (DATETIME_RE.test(trimmed)) return undefined;
        const date = toValidDate(trimmed, timeZone);
        return date ? date.toISOString() : undefined;
      }
      case "time": {
        if (TIME_RE.test(trimmed)) return trimmed;
        const timeMatch = trimmed.match(TIME_WITH_SECONDS_RE);
        if (timeMatch) return timeMatch[1];
        const date = toValidDate(trimmed, timeZone);
        return date ? formatLocalTime(date, timeZone) : undefined;
      }
    }
  }

  const date = toValidDate(value, timeZone);
  if (!date) return undefined;

  switch (type) {
    case "date":
      return formatLocalDate(date, timeZone);
    case "datetime":
      return date.toISOString();
    case "time":
      return formatLocalTime(date, timeZone);
  }
}

/** Convert a datetime value to the local date/time parts displayed by its picker. */
export function localDateTimeParts(
  value: string,
  timeZone = getLocalTimeZone(),
): { date: string; time: string } {
  const datetime =
    toValidDateTime(value, timeZone) ??
    (!DATETIME_RE.test(value)
      ? (() => {
          const date = toValidDate(value, timeZone);
          return date ? fromDate(date, timeZone) : null;
        })()
      : null);
  return datetime
    ? {
        date: `${datetime.year}-${pad2(datetime.month)}-${pad2(datetime.day)}`,
        time: `${pad2(datetime.hour)}:${pad2(datetime.minute)}`,
      }
    : { date: "", time: "" };
}
