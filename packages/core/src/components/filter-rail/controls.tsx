// Date, date-range and number-range controls.
//
// A field holds exactly one filter, so `gte` AND `lte` on one field is not
// expressible — a two-ended range commits a single `between` with
// `{ min, max }`, which also survives the URL round-trip unchanged.

import { useEffect, useState, type KeyboardEvent } from "react";
import { parseDate, type DateValue } from "@internationalized/date";
import { cn } from "@/lib/utils";
import type { Filter } from "@/types/collection";
import { DatePicker, DateRangePicker } from "../date-field";
import { useFilterRailContext, sectionName } from "./filter-rail-context";
import { useFilterRailT } from "./i18n";
import { inputClass } from "./internals";
import { filterFor } from "./sections";
import type { DateRangeSection, DateSection, NumberRangeSection } from "./types";

/** `YYYY-MM-DD` ⇄ `DateValue`. A malformed stored value renders empty rather than throwing. */
const toDateValue = (iso: unknown): DateValue | null => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  try {
    return parseDate(iso);
  } catch {
    return null;
  }
};

const isoOf = (value: DateValue | null | undefined) => (value ? value.toString() : null);

// ─── Date ────────────────────────────────────────────────────────────────────

export const DateControl = ({ section }: { section: DateSection }) => {
  const { control, commit } = useFilterRailContext("Sections");
  const value = toDateValue(filterFor(control.filters, section.field)?.value);

  return (
    <DatePicker
      value={value}
      minValue={toDateValue(section.min) ?? undefined}
      maxValue={toDateValue(section.max) ?? undefined}
      aria-label={sectionName(section)}
      onChange={(next) => {
        const iso = isoOf(next);
        commit(
          section.field,
          iso ? { field: section.field, operator: section.operator, value: iso } : null,
        );
      }}
    />
  );
};

// ─── Date range ──────────────────────────────────────────────────────────────

export const DateRangeControl = ({ section }: { section: DateRangeSection }) => {
  const { control, commit } = useFilterRailContext("Sections");
  const bounds = filterFor(control.filters, section.field)?.value as
    | { min?: string; max?: string }
    | undefined;
  const start = toDateValue(bounds?.min);
  const end = toDateValue(bounds?.max);

  const apply = (from: string | null, to: string | null) =>
    commit(
      section.field,
      from && to
        ? { field: section.field, operator: "between", value: { min: from, max: to } }
        : null,
    );

  return (
    <div className="astw:space-y-1.5">
      {section.presets && section.presets.length > 0 && (
        <div className="astw:flex astw:flex-wrap astw:gap-1">
          {section.presets.map((preset) => {
            const active = bounds?.min === preset.from && bounds?.max === preset.to;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                // Clicking the active preset clears it.
                onClick={() => (active ? apply(null, null) : apply(preset.from, preset.to))}
                className={cn(
                  "astw:cursor-pointer astw:rounded-md astw:border astw:px-1.5 astw:py-0.5 astw:text-xs",
                  active
                    ? "astw:border-transparent astw:bg-accent astw:text-foreground"
                    : "astw:border-border astw:text-muted-foreground astw:hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
      <DateRangePicker
        value={start && end ? { start, end } : null}
        minValue={toDateValue(section.min) ?? undefined}
        maxValue={toDateValue(section.max) ?? undefined}
        aria-label={sectionName(section)}
        onChange={(next) => apply(isoOf(next?.start), isoOf(next?.end))}
      />
    </div>
  );
};

// ─── Number range ────────────────────────────────────────────────────────────

type Bounds = { min?: number; max?: number };

const num = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const show = (value: number | undefined) => (value === undefined ? "" : String(value));

/** `between` carries both ends; a half-open range is a single `gte` or `lte`. */
const readBounds = (filter: Filter | undefined): Bounds => {
  if (!filter) return {};
  if (filter.operator === "gte") return { min: num(filter.value) };
  if (filter.operator === "lte") return { max: num(filter.value) };
  const value = (filter.value ?? {}) as { min?: unknown; max?: unknown };
  return { min: num(value.min), max: num(value.max) };
};

const rangeFilter = (field: string, min?: number, max?: number): Filter | null => {
  if (min !== undefined && max !== undefined) {
    return { field, operator: "between", value: { min, max } };
  }
  if (min !== undefined) return { field, operator: "gte", value: min };
  if (max !== undefined) return { field, operator: "lte", value: max };
  return null;
};

export const NumberRangeControl = ({ section }: { section: NumberRangeSection }) => {
  const t = useFilterRailT();
  const { control, commit } = useFilterRailContext("Sections");
  const bounds = readBounds(filterFor(control.filters, section.field));

  // Local drafts: commit on blur / Enter, not per keystroke.
  const [from, setFrom] = useState(show(bounds.min));
  const [to, setTo] = useState(show(bounds.max));

  useEffect(() => {
    setFrom(show(bounds.min));
    setTo(show(bounds.max));
  }, [bounds.min, bounds.max]);

  const apply = () => {
    const lo = from.trim() === "" ? undefined : Number(from);
    const hi = to.trim() === "" ? undefined : Number(to);
    if (lo === bounds.min && hi === bounds.max) return;
    commit(section.field, rangeFilter(section.field, lo, hi));
  };

  const name = sectionName(section);
  const shared = {
    type: "number",
    inputMode: "decimal" as const,
    min: section.min,
    max: section.max,
    step: section.step,
    onBlur: apply,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") apply();
    },
    className: inputClass,
  };

  return (
    <div className="astw:flex astw:items-center astw:gap-1.5">
      <input
        {...shared}
        value={from}
        placeholder={section.min !== undefined ? String(section.min) : t("rangeMin")}
        aria-label={t("rangeMinLabel", { section: name })}
        onChange={(event) => setFrom(event.target.value)}
      />
      <span aria-hidden className="astw:shrink-0 astw:text-xs astw:text-muted-foreground">
        {t("rangeTo")}
      </span>
      <input
        {...shared}
        value={to}
        placeholder={section.max !== undefined ? String(section.max) : t("rangeMax")}
        aria-label={t("rangeMaxLabel", { section: name })}
        onChange={(event) => setTo(event.target.value)}
      />
      {section.unit && (
        <span className="astw:shrink-0 astw:text-xs astw:text-muted-foreground">
          {section.unit}
        </span>
      )}
    </div>
  );
};
