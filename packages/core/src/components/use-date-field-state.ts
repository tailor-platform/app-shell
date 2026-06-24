import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDate,
  CalendarDateTime,
  ZonedDateTime,
  DateFormatter,
  endOfMonth,
  now,
  toCalendarDateTime,
  toZoned,
  today,
  type DateValue,
} from "@internationalized/date";

/**
 * Hand-rolled segmented-date-field state.
 *
 * This is the logic react-aria's `useDateFieldState` would otherwise provide.
 * We own it here: locale-driven segment ordering (via `DateFormatter`), per-
 * segment spinbutton semantics (increment/decrement with context-aware limits),
 * numeric type-to-fill with auto-advance, and value-type discrimination by
 * `granularity`. No `Date` ever escapes — `onChange` emits `@internationalized/date`
 * values (or `null`).
 */

export type Granularity = "day" | "hour" | "minute" | "second";
export type HourCycle = 12 | 24;

export type EditableSegmentType =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "dayPeriod";

const DATE_SEGMENTS: EditableSegmentType[] = ["year", "month", "day"];
const TIME_BY_GRANULARITY: Record<Granularity, EditableSegmentType[]> = {
  day: [],
  hour: ["hour"],
  minute: ["hour", "minute"],
  second: ["hour", "minute", "second"],
};

// Max digits a segment accepts before it's "full" and auto-advances. A leading
// zero counts, so typing "02" (2 digits) completes the day and advances —
// while typing "2" then "9" still builds 29.
const SEGMENT_MAX_DIGITS: Record<EditableSegmentType, number> = {
  year: 4,
  month: 2,
  day: 2,
  hour: 2,
  minute: 2,
  second: 2,
  dayPeriod: 0,
};

type Fields = Partial<Record<EditableSegmentType, number>>;

export interface Segment {
  type: EditableSegmentType | "literal";
  /** Display text (locale-formatted value, or placeholder when empty). */
  text: string;
  isEditable: boolean;
  isPlaceholder: boolean;
  value?: number;
  minValue?: number;
  maxValue?: number;
  /** Accessible label, e.g. "month", "year". */
  label?: string;
}

export interface DateFieldStateOptions {
  value?: DateValue | null;
  defaultValue?: DateValue | null;
  onChange?: (value: DateValue | null) => void;
  granularity?: Granularity;
  locale: string;
  /** Used only to construct `ZonedDateTime` values for time granularities. */
  timeZone?: string;
  hourCycle?: HourCycle;
  placeholderValue?: DateValue;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}

const SEGMENT_LABELS: Record<EditableSegmentType, string> = {
  year: "year",
  month: "month",
  day: "day",
  hour: "hour",
  minute: "minute",
  second: "second",
  dayPeriod: "AM/PM",
};

const PLACEHOLDERS: Record<EditableSegmentType, string> = {
  year: "yyyy",
  month: "mm",
  day: "dd",
  hour: "––",
  minute: "––",
  second: "––",
  dayPeriod: "AM",
};

function fieldsFromValue(v: DateValue | null | undefined): Fields {
  if (!v) return {};
  const f: Fields = {};
  if ("year" in v) {
    f.year = v.year;
    f.month = v.month;
    f.day = v.day;
  }
  if ("hour" in v) {
    f.hour = v.hour;
    f.minute = v.minute;
    f.second = v.second;
  }
  return f;
}

function use12HourCycle(locale: string, hourCycle?: HourCycle): boolean {
  if (hourCycle === 12) return true;
  if (hourCycle === 24) return false;
  // Derive from the locale's resolved hour cycle.
  try {
    const opts = new DateFormatter(locale, { hour: "numeric" }).resolvedOptions();
    return opts.hour12 ?? false;
  } catch {
    return false;
  }
}

export function useDateFieldState(options: DateFieldStateOptions) {
  const {
    value: controlledValue,
    defaultValue,
    onChange,
    granularity = "day",
    locale,
    timeZone,
    hourCycle,
    placeholderValue,
    isReadOnly,
  } = options;

  const isControlled = controlledValue !== undefined;
  const hasTime = granularity !== "day";
  const is12 = use12HourCycle(locale, hourCycle);

  // The editable segment order, before locale reordering.
  const editableTypes = useMemo<EditableSegmentType[]>(() => {
    const types = [...DATE_SEGMENTS, ...TIME_BY_GRANULARITY[granularity]];
    if (hasTime && is12) types.push("dayPeriod");
    return types;
  }, [granularity, hasTime, is12]);

  // Per-segment working state. This is the source of truth while editing — even
  // when controlled — so a half-typed value (and intermediate out-of-range
  // segments) survive the round-trip through `onChange`. A `controlled` value
  // that changes *externally* is synced back in via the effect below.
  const [internalFields, setInternalFields] = useState<Fields>(() =>
    fieldsFromValue(controlledValue ?? defaultValue),
  );
  const fields = internalFields;

  const lastEmitted = useRef<DateValue | null>(controlledValue ?? defaultValue ?? null);

  // Anchor for placeholder formatting + sensible increment starting points.
  const anchor = useMemo<CalendarDate | CalendarDateTime | ZonedDateTime>(() => {
    if (placeholderValue) {
      return hasTime ? toCalendarDateTime(placeholderValue as never) : (placeholderValue as never);
    }
    const tz = timeZone ?? "UTC";
    return hasTime ? now(tz) : today(tz);
  }, [placeholderValue, hasTime, timeZone]);

  // Anchor as a plain field record — used to seed increments and to populate
  // unfilled segments for display formatting.
  const anchorFields = useMemo<Fields>(() => fieldsFromValue(anchor), [anchor]);

  // ── Limits ──────────────────────────────────────────────────────────────────
  const getLimits = useCallback(
    (type: EditableSegmentType): { min: number; max: number } => {
      switch (type) {
        case "year":
          return { min: 1, max: 9999 };
        case "month":
          return { min: 1, max: 12 };
        case "day": {
          const y = fields.year ?? anchor.year;
          const rawM = fields.month ?? anchor.month;
          // Mid-typing the month can be out of range (e.g. 0); fall back to the
          // anchor month so the day limit stays computable.
          const m = rawM >= 1 && rawM <= 12 ? rawM : anchor.month;
          const max = endOfMonth(new CalendarDate(y, m, 1)).day;
          return { min: 1, max };
        }
        case "hour":
          return is12 ? { min: 1, max: 12 } : { min: 0, max: 23 };
        case "minute":
        case "second":
          return { min: 0, max: 59 };
        case "dayPeriod":
          return { min: 0, max: 1 };
      }
    },
    [fields.year, fields.month, anchor, is12],
  );

  // ── Value composition ─────────────────────────────────────────────────────
  const composeValue = useCallback(
    (f: Fields): DateValue | null => {
      if (f.year == null || f.month == null || f.day == null) return null;
      // Reject out-of-range segments (possible mid-typing) so we never build an
      // invalid CalendarDate — the value is simply "incomplete" until valid.
      if (f.month < 1 || f.month > 12 || f.day < 1) return null;
      if (f.day > endOfMonth(new CalendarDate(f.year, f.month, 1)).day) return null;
      if (!hasTime) return new CalendarDate(f.year, f.month, f.day);

      let hour = f.hour ?? 0;
      if (is12) {
        // f.hour is 1..12, dayPeriod 0=AM 1=PM → convert to 24h.
        const pm = (f.dayPeriod ?? 0) === 1;
        hour = (hour % 12) + (pm ? 12 : 0);
      }
      const cdt = new CalendarDateTime(f.year, f.month, f.day, hour, f.minute ?? 0, f.second ?? 0);
      // ZonedDateTime when the field is timezone-anchored (controlled value or
      // placeholder is zoned, or an explicit timeZone is provided).
      const wantsZoned =
        controlledValue instanceof ZonedDateTime ||
        defaultValue instanceof ZonedDateTime ||
        placeholderValue instanceof ZonedDateTime ||
        timeZone != null;
      if (wantsZoned && timeZone) return toZoned(cdt, timeZone);
      return cdt;
    },
    [hasTime, is12, controlledValue, defaultValue, placeholderValue, timeZone],
  );

  const commit = useCallback(
    (next: Fields, intent: "edit" | "clear" = "edit") => {
      setInternalFields(next);
      const composed = composeValue(next);
      // While editing, only emit a *complete & valid* value — never `null` for a
      // half-typed/out-of-range intermediate (that would thrash a controlled
      // value and lose the in-progress entry). Clearing explicitly emits `null`.
      let emit: DateValue | null | undefined;
      if (composed != null) emit = composed;
      else if (intent === "clear") emit = null;
      else emit = undefined;
      if (emit === undefined) return;

      const prev = lastEmitted.current;
      const changed =
        (emit == null) !== (prev == null) ||
        (emit != null && prev != null && emit.compare(prev as never) !== 0);
      if (changed) {
        lastEmitted.current = emit;
        onChange?.(emit);
      }
    },
    [composeValue, onChange],
  );

  // Sync internal segments when a *controlled* value changes externally (i.e.
  // to something other than what we last emitted), without clobbering an
  // in-progress edit or looping on our own onChange.
  useEffect(() => {
    if (!isControlled) return;
    const cv = controlledValue ?? null;
    const le = lastEmitted.current;
    const same =
      (cv == null && le == null) || (cv != null && le != null && cv.compare(le as never) === 0);
    if (!same) {
      lastEmitted.current = cv;
      setInternalFields(fieldsFromValue(cv));
    }
  }, [controlledValue, isControlled]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const cycle = useCallback(
    (type: EditableSegmentType, delta: number) => {
      if (isReadOnly) return;
      const { min, max } = getLimits(type);
      const current = fields[type];
      let next: number;
      if (current == null) {
        // Start from the anchor's value for that field, or the min.
        if (type === "dayPeriod") {
          next = (anchorFields.hour ?? 0) >= 12 ? 1 : 0;
        } else {
          next = anchorFields[type] ?? min;
        }
      } else {
        const span = max - min + 1;
        next = ((current - min + delta + span * 1000) % span) + min;
      }
      commit({ ...fields, [type]: next });
    },
    [fields, getLimits, anchorFields, commit, isReadOnly],
  );

  const setDigit = useCallback(
    (
      type: EditableSegmentType,
      digit: number,
      replace = false,
      digitCount = 1,
    ): { advance: boolean } => {
      if (isReadOnly || type === "dayPeriod") return { advance: false };
      const { min, max } = getLimits(type);
      // `replace` (first digit after the segment gains focus) starts fresh
      // rather than accumulating onto the existing value.
      const current = replace ? undefined : fields[type];
      let next = current != null && current * 10 + digit <= max ? current * 10 + digit : digit;
      if (next < min) next = digit;
      // Auto-advance when the segment can't accept another digit (value too
      // large) OR the field is digit-width-full (so a leading-zero entry like
      // "02" advances, while "2" still waits for a possible second digit).
      const advance = next * 10 > max || digitCount >= SEGMENT_MAX_DIGITS[type];
      commit({ ...fields, [type]: next });
      return { advance };
    },
    [fields, getLimits, commit, isReadOnly],
  );

  const setDayPeriod = useCallback(
    (pm: boolean) => {
      if (isReadOnly) return;
      commit({ ...fields, dayPeriod: pm ? 1 : 0 });
    },
    [fields, commit, isReadOnly],
  );

  const clearSegment = useCallback(
    (type: EditableSegmentType) => {
      if (isReadOnly) return;
      const next = { ...fields };
      delete next[type];
      commit(next, "clear");
    },
    [fields, commit, isReadOnly],
  );

  // ── Display segments (locale-ordered) ────────────────────────────────────────
  const segments = useMemo<Segment[]>(() => {
    const formatter = new DateFormatter(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(hasTime
        ? {
            hour: "2-digit",
            ...(granularity !== "hour" ? { minute: "2-digit" } : {}),
            ...(granularity === "second" ? { second: "2-digit" } : {}),
            hour12: is12,
          }
        : {}),
      ...(timeZone ? { timeZone } : {}),
    });

    // Format the (always-valid) anchor to get the locale's segment ORDER and the
    // literal separators. Each editable segment's *text* is then formatted from
    // its own value, so an in-progress out-of-range value can never build an
    // invalid date.
    const pad2 = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
    const yearFmt = new Intl.NumberFormat(locale, { useGrouping: false });
    const formatSegment = (type: EditableSegmentType, value: number): string => {
      if (type === "dayPeriod") return value === 1 ? "PM" : "AM";
      if (type === "year") return yearFmt.format(value);
      return pad2.format(value);
    };

    const parts = formatter.formatToParts(anchor.toDate(timeZone ?? "UTC"));
    return parts.map<Segment>((part) => {
      const rawType = part.type;
      if (!editableTypes.includes(rawType as EditableSegmentType)) {
        return { type: "literal", text: part.value, isEditable: false, isPlaceholder: false };
      }
      const editable = rawType as EditableSegmentType;
      const current = fields[editable];
      const filled = current != null;
      const { min, max } = getLimits(editable);
      return {
        type: editable,
        text: filled ? formatSegment(editable, current) : PLACEHOLDERS[editable],
        isEditable: true,
        isPlaceholder: !filled,
        value: current,
        minValue: min,
        maxValue: max,
        label: SEGMENT_LABELS[editable],
      };
    });
  }, [locale, hasTime, granularity, is12, timeZone, fields, editableTypes, anchor, getLimits]);

  const fieldValue = composeValue(fields);

  return {
    segments,
    fieldValue,
    cycle,
    setDigit,
    setDayPeriod,
    clearSegment,
  };
}
