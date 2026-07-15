import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDate,
  CalendarDateTime,
  ZonedDateTime,
  DateFormatter,
  endOfMonth,
  now,
  toCalendarDate,
  toCalendarDateTime,
  toZoned,
  today,
  type DateValue,
} from "@internationalized/date";
import { resolveDateShortcut, type DateShortcut, type FirstDayOfWeek } from "@/lib/date-shortcuts";

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
  /** Lower/upper bound the keyboard shortcuts clamp their target date into. */
  minValue?: DateValue;
  maxValue?: DateValue;
  /** Week-start for the `w`/`k` shortcuts; defaults to the locale convention. */
  firstDayOfWeek?: FirstDayOfWeek;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}

const PLACEHOLDERS: Record<EditableSegmentType, string> = {
  year: "yyyy",
  month: "mm",
  day: "dd",
  hour: "––",
  minute: "––",
  second: "––",
  dayPeriod: "AM",
};

/**
 * Snap an impossible day down to the entered month's real length — but only once
 * the date is fully specified (a 4-digit year). Mid-typing is left untouched so
 * the day isn't prematurely shrunk: while a partial year is being typed (e.g. the
 * `2` → `20` → `202` → `2026` keystrokes for 29 Feb), the leap-ness of the final
 * year isn't known yet, so we wait until the year is complete. The on-blur
 * `commitOnBlur` is the backstop for the year-still-empty case.
 */
function clampCompleteDay(f: Fields): Fields {
  const { day, month, year } = f;
  if (day == null || month == null || month < 1 || month > 12) return f;
  if (year == null || year < 1000) return f; // year not yet fully typed
  const maxDay = endOfMonth(new CalendarDate(year, month, 1)).day;
  return day > maxDay ? { ...f, day: maxDay } : f;
}

/**
 * The currently-entered date as a `CalendarDate`, or `null` if it isn't a
 * complete, in-range day/month/year. Used by the day/week shortcuts, which need
 * a concrete date to step from (falling back to today when there isn't one).
 */
function completeCalendarDate(f: Fields): CalendarDate | null {
  if (f.year == null || f.month == null || f.day == null) return null;
  if (f.month < 1 || f.month > 12 || f.day < 1) return null;
  if (f.day > endOfMonth(new CalendarDate(f.year, f.month, 1)).day) return null;
  return new CalendarDate(f.year, f.month, f.day);
}

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
    minValue,
    maxValue,
    firstDayOfWeek,
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
          // Until a valid month is entered, allow any day up to 31 — don't
          // constrain to the anchor month, or typing "31" while the current
          // month has 30 (or 28/29) days would be wrongly rejected. Once the
          // month is known, cap at that month's real day count.
          if (fields.month == null || fields.month < 1 || fields.month > 12) {
            return { min: 1, max: 31 };
          }
          const y = fields.year ?? anchor.year;
          const max = endOfMonth(new CalendarDate(y, fields.month, 1)).day;
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
      // Self-correct an impossible day as soon as the date is complete, so an
      // unreachable date (e.g. 29 Feb in a non-leap year) never persists — no
      // matter how the field is left. Skipped while clearing a segment.
      const f = intent === "edit" ? clampCompleteDay(next) : next;
      setInternalFields(f);
      const composed = composeValue(f);
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

  /**
   * Whole-date navigation (QBO-style shortcuts): pick the reference date the
   * command steps from, resolve the target via {@link resolveDateShortcut}
   * (shared with the calendar grid), clamp into range, and commit — keeping any
   * time segments intact.
   *
   * The reference differs by command:
   * - **Month/year jumps** (`monthStart`/`monthEnd`/`yearStart`/`yearEnd`) prefer
   *   the month/year already entered — even in an incomplete date — so "m" on a
   *   half-typed "08/…" lands on 1 Aug of the current year. They fall back to
   *   today's month/year when nothing usable is entered.
   * - **Day/week jumps** (`dayPrev`/`dayNext`/`weekStart`/`weekEnd`) need a
   *   concrete date, so they step from the complete entered date if there is one,
   *   otherwise from today.
   */
  const applyShortcut = useCallback(
    (cmd: DateShortcut) => {
      if (isReadOnly) return;
      const ref = today(timeZone ?? "UTC");
      const usesEnteredMonthYear =
        cmd === "monthStart" || cmd === "monthEnd" || cmd === "yearStart" || cmd === "yearEnd";
      let base: CalendarDate;
      if (usesEnteredMonthYear) {
        const monthEntered = fields.month != null && fields.month >= 1 && fields.month <= 12;
        base = new CalendarDate(
          fields.year ?? ref.year,
          monthEntered ? (fields.month as number) : ref.month,
          1,
        );
      } else {
        base = completeCalendarDate(fields) ?? ref;
      }
      let next = resolveDateShortcut(cmd, base, ref, locale, firstDayOfWeek);
      // Clamp into [minValue, maxValue] so a shortcut can't land outside the
      // allowed range — mirrors the calendar grid, which clamps roving focus the
      // same way. (`isDateUnavailable` isn't enforced here; the field is a
      // free-entry control, so — like typing — it may land on an unavailable date.)
      const lo = minValue ? toCalendarDate(minValue) : null;
      const hi = maxValue ? toCalendarDate(maxValue) : null;
      if (lo && next.compare(lo) < 0) next = lo;
      if (hi && next.compare(hi) > 0) next = hi;
      commit({ ...fields, year: next.year, month: next.month, day: next.day });
    },
    [fields, timeZone, locale, isReadOnly, commit, minValue, maxValue, firstDayOfWeek],
  );

  /**
   * Expand a 1–2 digit year to the 2000s (e.g. "26" ⇒ 2026) as soon as the year
   * segment is left — moving to a sibling segment, tabbing to the calendar icon,
   * or leaving the field entirely. The calendar icon sits inside the group, so
   * relying on `commitOnBlur` (whole-group blur) would leave "26" showing until
   * focus escaped the icon too; firing on the year segment's own blur closes that
   * gap. Idempotent — a full-width year (≥ 100) is left untouched — so the
   * `commitOnBlur` backstop can safely run over it as well.
   */
  const expandShortYear = useCallback(() => {
    if (isReadOnly) return;
    const y = fields.year;
    if (y == null || y >= 100) return;
    commit({ ...fields, year: 2000 + y });
  }, [fields, isReadOnly, commit]);

  /**
   * On-blur normalization — two corrections applied in a single commit when
   * focus leaves the whole group:
   *
   * 1. **Backfill coarser fields from the anchor (today).** If the day is filled
   *    but the month/year are missing, assume the current month/year — typing
   *    just "2" ⇒ the 2nd of this month, this year; "2 Aug" ⇒ 2 Aug this year.
   *    This only ever fills a *coarser* field (month, year) from a provided
   *    *finer* one, gated on the day being present. The day itself is never
   *    guessed, so a lone year (or month) is deliberately left untouched.
   * 2. **Clamp an impossible day** to the resolved month's length (e.g. the
   *    30/02 → 28 case), leap-year-aware. A complete date already self-corrects
   *    in `commit` (see {@link clampCompleteDay}); this is the backstop for the
   *    partial cases handled above.
   */
  const commitOnBlur = useCallback(() => {
    if (isReadOnly) return;
    const next: Fields = { ...fields };

    // (0) Expand a 1–2 digit year to the 2000s (e.g. "26" ⇒ 2026). A full-width
    //     (3–4 digit) year is left untouched. Done first so the leap-year-aware
    //     day clamp below sees the resolved year.
    if (next.year != null && next.year < 100) next.year = 2000 + next.year;

    // (1) Backfill — the day (finest, un-guessable unit) is the trigger.
    if (next.day != null) {
      if (next.month == null) next.month = anchor.month;
      if (next.year == null) next.year = anchor.year;
    }

    // (2) Clamp the day to the now-resolved month/year.
    if (next.day != null && next.month != null && next.month >= 1 && next.month <= 12) {
      const yearForMax = next.year ?? 2000; // 2000 is a leap year
      const maxDay = endOfMonth(new CalendarDate(yearForMax, next.month, 1)).day;
      if (next.day > maxDay) next.day = maxDay;
    }

    if (next.day !== fields.day || next.month !== fields.month || next.year !== fields.year) {
      commit(next);
    }
  }, [fields, anchor, isReadOnly, commit]);

  // ── Display segments (locale-ordered) ────────────────────────────────────────
  // The Intl objects + the locale's part order/separators only depend on
  // locale / granularity / hour-cycle / timezone (via the anchor) — never on
  // `fields`. Build them once here so a keystroke (which only changes `fields`)
  // doesn't spin up a fresh DateFormatter + two NumberFormats + formatToParts.
  const segmentFormat = useMemo(() => {
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
    const pad2 = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
    const yearFmt = new Intl.NumberFormat(locale, { useGrouping: false });
    const formatSegment = (type: EditableSegmentType, value: number): string => {
      if (type === "dayPeriod") return value === 1 ? "PM" : "AM";
      if (type === "year") return yearFmt.format(value);
      return pad2.format(value);
    };
    // Format the (always-valid) anchor to get the locale's segment ORDER and the
    // literal separators. Each editable segment's *text* is then formatted from
    // its own value, so an in-progress out-of-range value can never build an
    // invalid date.
    const parts = formatter.formatToParts(anchor.toDate(timeZone ?? "UTC"));
    return { parts, formatSegment };
  }, [locale, hasTime, granularity, is12, timeZone, anchor]);

  const segments = useMemo<Segment[]>(() => {
    return segmentFormat.parts.map<Segment>((part) => {
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
        text: filled ? segmentFormat.formatSegment(editable, current) : PLACEHOLDERS[editable],
        isEditable: true,
        isPlaceholder: !filled,
        value: current,
        minValue: min,
        maxValue: max,
      };
    });
  }, [segmentFormat, fields, editableTypes, getLimits]);

  const fieldValue = composeValue(fields);

  return {
    segments,
    fieldValue,
    cycle,
    setDigit,
    setDayPeriod,
    clearSegment,
    applyShortcut,
    expandShortYear,
    commitOnBlur,
  };
}
