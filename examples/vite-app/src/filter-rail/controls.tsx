// ✅ Reusable Component: the rail's date, range and boolean controls.
//
// Split out of `FilterRail.tsx` so the root stays readable now that the rail
// covers every filter type `DataTable` supports:
//
//   string  → TextControl (in FilterRail)      enum    → Checkbox / Radio
//   uuid    → TextControl, operator "eq"       boolean → BooleanControl
//   number  → NumberRangeControl               date    → DateControl
//   time    → NumberRangeControl (as minutes)  datetime→ DateRangeControl
//
// ─── The one rule that shapes all of these ───────────────────────────────────
//
// `addFilter` upserts by field, so a field can hold exactly one filter. `gte`
// AND `lte` on the same field is therefore not expressible — the second call
// overwrites the first. Every two-ended control here commits a single `between`
// whose value is `{ min, max }`, which is the model's own way of saying it.
//
// That shape also happens to be what survives the URL: app-shell stringifies
// array *members* on write, but the object branch of the serializer leaves
// `{ min, max }` alone. Raised with the app-shell team.

import { DatePicker, DateRangePicker, parseDate, type DateValue } from "@tailor-platform/app-shell";
import { useEffect, useState } from "react";
import { RadioRow } from "./internals";
import type {
  BooleanSection,
  DateRangeSection,
  DateSection,
  FilterRailProps,
  NumberRangeSection,
} from "./types";

/** `YYYY-MM-DD` ⇄ the pickers' `DateValue`. Never a `Date`. */
const toDateValue = (iso: unknown): DateValue | null => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  try {
    return parseDate(iso);
  } catch {
    // A stored value that is no longer a valid date (a hand-edited URL) must
    // not take the page down — the rail renders empty and the filter is dropped
    // on the next change.
    return null;
  }
};

const isoOf = (value: DateValue | null | undefined) => (value ? value.toString() : null);

// ─── Date ────────────────────────────────────────────────────────────────────

export const DateControl = ({
  section,
  control,
  onFilterChange,
  commit,
}: {
  section: DateSection;
  control: FilterRailProps["control"];
  onFilterChange?: FilterRailProps["onFilterChange"];
  commit: Commit;
}) => {
  const applied = control.filters.find((filter) => filter.field === section.field);
  const value = toDateValue(applied?.value);

  return (
    <DatePicker
      value={value}
      minValue={toDateValue(section.min) ?? undefined}
      maxValue={toDateValue(section.max) ?? undefined}
      aria-label={typeof section.label === "string" ? section.label : section.id}
      onChange={(next) => {
        const iso = isoOf(next);
        commit(
          control,
          section.field,
          iso ? { field: section.field, operator: section.operator, value: iso } : null,
          onFilterChange,
        );
      }}
    />
  );
};

// ─── Date range ──────────────────────────────────────────────────────────────

export const DateRangeControl = ({
  section,
  control,
  onFilterChange,
  commit,
}: {
  section: DateRangeSection;
  control: FilterRailProps["control"];
  onFilterChange?: FilterRailProps["onFilterChange"];
  commit: Commit;
}) => {
  const applied = control.filters.find((filter) => filter.field === section.field);
  const bounds = applied?.value as { min?: string; max?: string } | undefined;
  const start = toDateValue(bounds?.min);
  const end = toDateValue(bounds?.max);

  const apply = (from: string | null, to: string | null) =>
    commit(
      control,
      section.field,
      from && to
        ? { field: section.field, operator: "between", value: { min: from, max: to } }
        : null,
      onFilterChange,
    );

  return (
    <div className="space-y-1.5">
      {section.presets && section.presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {section.presets.map((preset) => {
            const active = bounds?.min === preset.from && bounds?.max === preset.to;
            return (
              <button
                key={preset.label}
                type="button"
                // Toggling, not just setting: clicking the active preset clears
                // it. Decision 7 — undoing must never cost more clicks than
                // doing, and hunting for the X in a date picker costs more.
                onClick={() => (active ? apply(null, null) : apply(preset.from, preset.to))}
                className={`rounded-md border px-1.5 py-0.5 text-[11px] ${
                  active
                    ? "border-transparent bg-[var(--accent)] text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
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
        aria-label={typeof section.label === "string" ? section.label : section.id}
        // Fires only with a complete range, or `null` — never a half-typed
        // intermediate, so there is no need to debounce or guard for one.
        onChange={(next) => apply(isoOf(next?.start ?? null), isoOf(next?.end ?? null))}
      />
    </div>
  );
};

// ─── Number range ────────────────────────────────────────────────────────────

export const NumberRangeControl = ({
  section,
  control,
  onFilterChange,
  commit,
}: {
  section: NumberRangeSection;
  control: FilterRailProps["control"];
  onFilterChange?: FilterRailProps["onFilterChange"];
  commit: Commit;
}) => {
  const applied = control.filters.find((filter) => filter.field === section.field);
  const bounds = applied?.value as { min?: number; max?: number } | undefined;

  // Local drafts, because a range is only meaningful once both ends are typed
  // and committing on every keystroke resets pagination under the cursor.
  const [from, setFrom] = useState(bounds?.min ?? "");
  const [to, setTo] = useState(bounds?.max ?? "");

  useEffect(() => {
    setFrom(bounds?.min ?? "");
    setTo(bounds?.max ?? "");
  }, [bounds?.min, bounds?.max]);

  const apply = (nextFrom: number | string, nextTo: number | string) => {
    const lo = nextFrom === "" ? null : Number(nextFrom);
    const hi = nextTo === "" ? null : Number(nextTo);
    if (lo === null && hi === null) return commit(control, section.field, null, onFilterChange);
    // A half-open range is not expressible as `between`, so an empty end is
    // filled from the section's declared bounds rather than refused — typing
    // only a minimum is the common case and should work.
    const min = lo ?? section.min ?? Number.MIN_SAFE_INTEGER;
    const max = hi ?? section.max ?? Number.MAX_SAFE_INTEGER;
    commit(
      control,
      section.field,
      { field: section.field, operator: "between", value: { min, max } },
      onFilterChange,
    );
  };

  const box =
    "h-7 w-full rounded-md border border-border bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        value={from}
        min={section.min}
        max={section.max}
        step={section.step}
        placeholder={section.min !== undefined ? String(section.min) : "Min"}
        aria-label={`Minimum ${typeof section.label === "string" ? section.label : section.id}`}
        onChange={(event) => setFrom(event.target.value)}
        onBlur={() => apply(from, to)}
        onKeyDown={(event) => {
          if (event.key === "Enter") apply(from, to);
        }}
        className={box}
      />
      <span aria-hidden className="shrink-0 text-xs text-muted-foreground">
        to
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={to}
        min={section.min}
        max={section.max}
        step={section.step}
        placeholder={section.max !== undefined ? String(section.max) : "Max"}
        aria-label={`Maximum ${typeof section.label === "string" ? section.label : section.id}`}
        onChange={(event) => setTo(event.target.value)}
        onBlur={() => apply(from, to)}
        onKeyDown={(event) => {
          if (event.key === "Enter") apply(from, to);
        }}
        className={box}
      />
      {section.unit && (
        <span className="shrink-0 text-xs text-muted-foreground">{section.unit}</span>
      )}
    </div>
  );
};

// ─── Boolean ─────────────────────────────────────────────────────────────────

export const BooleanControl = ({
  section,
  control,
  rowHeight,
  onFilterChange,
  commit,
}: {
  section: BooleanSection;
  control: FilterRailProps["control"];
  rowHeight: string;
  onFilterChange?: FilterRailProps["onFilterChange"];
  commit: Commit;
}) => {
  const applied = control.filters.find((filter) => filter.field === section.field);
  const current = typeof applied?.value === "boolean" ? applied.value : null;
  const operator = section.operator ?? "eq";

  const set = (next: boolean | null) =>
    commit(
      control,
      section.field,
      next === null ? null : { field: section.field, operator, value: next },
      onFilterChange,
    );

  return (
    <div
      role="radiogroup"
      aria-label={typeof section.label === "string" ? section.label : section.id}
    >
      {section.anyLabel !== null && (
        <RadioRow
          name={section.id}
          label={typeof section.anyLabel === "string" ? section.anyLabel : "Any"}
          checked={current === null}
          rowHeight={rowHeight}
          onSelect={() => set(null)}
        />
      )}
      <RadioRow
        name={section.id}
        label={typeof section.trueLabel === "string" ? section.trueLabel : "Yes"}
        checked={current === true}
        rowHeight={rowHeight}
        onSelect={() => set(true)}
      />
      <RadioRow
        name={section.id}
        label={typeof section.falseLabel === "string" ? section.falseLabel : "No"}
        checked={current === false}
        rowHeight={rowHeight}
        onSelect={() => set(false)}
      />
    </div>
  );
};

/** The rail's single mutation path — see `commit` in `FilterRail.tsx`. */
type Commit = (
  control: FilterRailProps["control"],
  field: string,
  next: Parameters<FilterRailProps["control"]["setFilters"]>[0][number] | null,
  onFilterChange?: FilterRailProps["onFilterChange"],
) => void;
