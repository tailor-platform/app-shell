import type { FilterConfig } from "@/types/collection";

export type TemporalFilterType = Extract<FilterConfig["type"], "datetime" | "date" | "time">;

const LOCAL_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
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

function formatLocalDateTime(value: Date): string {
  return `${formatLocalDate(value)}T${formatLocalTime(value)}:${pad2(value.getSeconds())}`;
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
      // The datetime editor emits a local "YYYY-MM-DDTHH:mm:ss" (no zone); a
      // trailing Z or ±hh:mm offset is still accepted for externally-set values.
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
        trimmedValue,
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
        if (LOCAL_DATETIME_RE.test(trimmed)) return trimmed;
        const date = toValidDate(trimmed);
        return date ? formatLocalDateTime(date) : undefined;
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
      return formatLocalDateTime(date);
    case "time":
      return formatLocalTime(date);
  }
}
