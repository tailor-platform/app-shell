import type { FilterConfig } from "@/types/collection";

export type TemporalFilterType = Extract<FilterConfig["type"], "datetime" | "date" | "time">;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIME_WITH_SECONDS_RE = /^((?:[01]\d|2[0-3]):[0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDate(value: Date): string {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function formatLocalTime(value: Date): string {
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" || typeof value === "string") {
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (trimmed === "") return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function isTemporalFilterType(type: FilterConfig["type"]): type is TemporalFilterType {
  return type === "datetime" || type === "date" || type === "time";
}

export function isTemporalFilterValueValid(type: TemporalFilterType, value: string): boolean {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return false;

  switch (type) {
    case "datetime":
      // Legacy filters may be local datetimes; DataTable editors serialize new
      // values as RFC 3339 instants.
      return (
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
          trimmedValue,
        ) && toValidDate(trimmedValue) != null
      );
    case "date":
      return DATE_RE.test(trimmedValue);
    case "time":
      return TIME_RE.test(trimmedValue);
  }
}

export function normalizeTemporalFilterValue(
  type: TemporalFilterType,
  value: unknown,
): string | undefined {
  if (value == null || value === "") return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;

    switch (type) {
      case "date": {
        if (DATE_RE.test(trimmed)) return trimmed;
        const date = toValidDate(trimmed);
        return date ? formatLocalDate(date) : undefined;
      }
      case "datetime": {
        const date = toValidDate(trimmed);
        return date ? date.toISOString() : undefined;
      }
      case "time": {
        if (TIME_RE.test(trimmed)) return trimmed;
        const timeMatch = trimmed.match(TIME_WITH_SECONDS_RE);
        if (timeMatch) return timeMatch[1];
        const date = toValidDate(trimmed);
        return date ? formatLocalTime(date) : undefined;
      }
    }
  }

  const date = toValidDate(value);
  if (!date) return undefined;

  switch (type) {
    case "date":
      return formatLocalDate(date);
    case "datetime":
      return date.toISOString();
    case "time":
      return formatLocalTime(date);
  }
}

/** Convert a datetime value to the local date/time parts displayed by its picker. */
export function localDateTimeParts(value: string): { date: string; time: string } {
  const datetime = toValidDate(value);
  return datetime
    ? { date: formatLocalDate(datetime), time: formatLocalTime(datetime) }
    : { date: "", time: "" };
}
