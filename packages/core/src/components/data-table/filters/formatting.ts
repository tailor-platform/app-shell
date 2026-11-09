import { DateFormatter, parseDate } from "@internationalized/date";
import { normalizeTemporalFilterValue, isTemporalFilterType } from "@/lib/temporal-filter-values";
import type { Filter, FilterConfig } from "@/types/collection";
import type { useDataTableT } from "../i18n";

/** Format an ISO "YYYY-MM-DD" value as a locale-appropriate medium date. */
function formatDateValue(iso: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  try {
    // Format in UTC against a UTC-anchored instant so the calendar date never
    // shifts across timezones.
    return new DateFormatter(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(parseDate(iso).toDate("UTC"));
  } catch {
    return iso;
  }
}

/**
 * Date range for chip display: "15 Jul 2026 – 17 Jul 2026". Each bound is
 * formatted with the same locale-aware medium date used elsewhere, joined with
 * an en dash. (A tighter same-month collapse was avoided — partial Intl date
 * parts render inconsistently across locales.)
 */
function formatDateRange(minIso: string, maxIso: string, locale: string): string {
  return [minIso && formatDateValue(minIso, locale), maxIso && formatDateValue(maxIso, locale)]
    .filter(Boolean)
    .join(" – ");
}

/** Format an RFC 3339 datetime as a locale medium date + short time. */
function formatDateTimeValue(iso: string, locale: string, timeZone: string): string {
  const normalized = normalizeTemporalFilterValue("datetime", iso, timeZone);
  if (!normalized) return iso;
  try {
    return new DateFormatter(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(normalized));
  } catch {
    return iso;
  }
}

function formatFilterValue(
  filter: Filter,
  config: FilterConfig,
  t: ReturnType<typeof useDataTableT>,
  locale: string,
  timeZone: string,
  /** Column label — used to summarize multi-select enums as "N labels". */
  label?: string,
): string {
  if (config.type === "enum" && Array.isArray(filter.value)) {
    const labels = filter.value
      .map((v) => config.options.find((option) => option.value === v)?.label ?? String(v))
      .filter((v) => v !== "");
    // Summarize multiple selections as "2 Status(s)" rather than listing them.
    if (labels.length > 1 && label) {
      return t("filterEnumCount", { count: labels.length, noun: label });
    }
    return labels.join(", ");
  }

  if (config.type === "boolean") {
    return filter.value === true ? t("filterBooleanTrue") : t("filterBooleanFalse");
  }

  if ((config.type === "number" || config.type === "decimal") && filter.operator === "between") {
    const range = filter.value as { min?: unknown; max?: unknown } | null;
    if (!range || typeof range !== "object") return "";
    const min = range.min != null ? String(range.min) : "";
    const max = range.max != null ? String(range.max) : "";
    return [min, max].filter(Boolean).join(" - ");
  }

  if (config.type === "date") {
    if (filter.operator === "between") {
      const range = filter.value as { min?: unknown; max?: unknown } | null;
      if (!range || typeof range !== "object") return "";
      const minIso = range.min != null ? String(range.min) : "";
      const maxIso = range.max != null ? String(range.max) : "";
      return formatDateRange(minIso, maxIso, locale);
    }
    if (filter.value == null || filter.value === "") return "";
    return formatDateValue(String(filter.value), locale);
  }

  if (config.type === "datetime") {
    if (filter.operator === "between") {
      const range = filter.value as { min?: unknown; max?: unknown } | null;
      if (!range || typeof range !== "object") return "";
      const min = range.min != null ? formatDateTimeValue(String(range.min), locale, timeZone) : "";
      const max = range.max != null ? formatDateTimeValue(String(range.max), locale, timeZone) : "";
      return [min, max].filter(Boolean).join(" – ");
    }
    if (filter.value == null || filter.value === "") return "";
    return formatDateTimeValue(String(filter.value), locale, timeZone);
  }

  if (isTemporalFilterType(config.type) && filter.operator === "between") {
    const range = filter.value as { min?: unknown; max?: unknown } | null;
    if (!range || typeof range !== "object") return "";
    const min = range.min != null ? String(range.min) : "";
    const max = range.max != null ? String(range.max) : "";
    return [min, max].filter(Boolean).join(" - ");
  }

  if (Array.isArray(filter.value)) {
    return filter.value.map((v) => String(v)).join(", ");
  }

  if (filter.value == null || filter.value === "") return "";
  return String(filter.value);
}

export { formatDateTimeValue, formatDateValue, formatFilterValue };
