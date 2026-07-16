import { useCallback, useMemo, useRef, useState } from "react";
import {
  CalendarDate,
  CalendarDateTime,
  DateFormatter,
  ZonedDateTime,
  endOfMonth,
  getWeeksInMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  toCalendarDate,
  today,
  type DateValue,
} from "@internationalized/date";
import { DATE_SHORTCUT_KEYS, resolveDateShortcut, type FirstDayOfWeek } from "@/lib/date-shortcuts";

/**
 * Hand-rolled calendar-grid state — the logic react-aria's `useCalendarState`
 * would otherwise provide. We own: month/week computation (locale + first-day-
 * of-week aware), selection, roving focus, and full APG keyboard navigation
 * (arrows, Home/End, PageUp/Down, Shift+PageUp/Down).
 */

// Re-exported from the shared shortcut module so existing import sites
// (`calendar.tsx`, `date-field.tsx`) keep resolving it here.
export type { FirstDayOfWeek };

export interface CalendarStateOptions {
  value?: DateValue | null;
  defaultValue?: DateValue | null;
  onChange?: (value: DateValue) => void;
  focusedValue?: DateValue;
  defaultFocusedValue?: DateValue;
  onFocusChange?: (date: CalendarDate) => void;
  minValue?: DateValue;
  maxValue?: DateValue;
  isDateUnavailable?: (date: DateValue) => boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  firstDayOfWeek?: FirstDayOfWeek;
  locale: string;
  timeZone: string;
}

export interface CalendarDay {
  date: CalendarDate;
  isOutsideMonth: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isUnavailable: boolean;
  isToday: boolean;
  isFocused: boolean;
}

function toCal(v: DateValue | null | undefined): CalendarDate | null {
  if (!v) return null;
  return toCalendarDate(v as never);
}

export function useCalendarState(options: CalendarStateOptions) {
  const {
    value: controlledValue,
    defaultValue,
    onChange,
    focusedValue,
    defaultFocusedValue,
    onFocusChange,
    minValue,
    maxValue,
    isDateUnavailable,
    isDisabled,
    isReadOnly,
    firstDayOfWeek,
    locale,
    timeZone,
  } = options;

  const isValueControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<DateValue | null>(defaultValue ?? null);
  const value = isValueControlled ? controlledValue : internalValue;
  const selectedDate = toCal(value);

  const todayDate = useMemo(() => today(timeZone), [timeZone]);

  const isFocusControlled = focusedValue !== undefined;
  const [internalFocused, setInternalFocused] = useState<CalendarDate>(
    () => toCal(defaultFocusedValue) ?? selectedDate ?? todayDate,
  );
  const focusedDate = isFocusControlled ? toCal(focusedValue)! : internalFocused;

  // Tracks whether the grid currently holds focus (used by Tab containment).
  const isFocusedRef = useRef(false);
  // One-shot signal: when a `focusedDate` change should pull DOM focus onto the
  // new day cell. Set by keyboard grid navigation only — NOT by the prev/next
  // month buttons, so clicking those keeps focus on the button.
  const moveFocusRef = useRef(false);

  const min = useMemo(() => toCal(minValue), [minValue]);
  const max = useMemo(() => toCal(maxValue), [maxValue]);

  const isInvalidRange = useCallback(
    (date: CalendarDate) =>
      (min != null && date.compare(min) < 0) || (max != null && date.compare(max) > 0),
    [min, max],
  );

  const setFocusedDate = useCallback(
    (date: CalendarDate) => {
      // Clamp focus to the allowed range.
      let next = date;
      if (min != null && next.compare(min) < 0) next = min;
      if (max != null && next.compare(max) > 0) next = max;
      if (!isFocusControlled) setInternalFocused(next);
      onFocusChange?.(next);
    },
    [min, max, isFocusControlled, onFocusChange],
  );

  const selectDate = useCallback(
    (date: CalendarDate) => {
      if (isDisabled || isReadOnly) return;
      if (isInvalidRange(date) || isDateUnavailable?.(date)) return;
      // Preserve the time portion when the existing value carries time.
      const next: DateValue = withDatePart(value, date);
      if (!isValueControlled) setInternalValue(next);
      onChange?.(next);
      setFocusedDate(date);
    },
    [
      isDisabled,
      isReadOnly,
      isInvalidRange,
      isDateUnavailable,
      value,
      isValueControlled,
      onChange,
      setFocusedDate,
    ],
  );

  const visibleMonth = startOfMonth(focusedDate);

  // ── Weeks ─────────────────────────────────────────────────────────────────
  const weeks = useMemo<CalendarDay[][]>(() => {
    const weeksInMonth = getWeeksInMonth(visibleMonth, locale, firstDayOfWeek);
    const gridStart = startOfWeek(visibleMonth, locale, firstDayOfWeek);
    const result: CalendarDay[][] = [];
    for (let w = 0; w < weeksInMonth; w++) {
      const days: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const date = gridStart.add({ days: w * 7 + d });
        const outside = !isSameMonth(date, visibleMonth);
        days.push({
          date,
          isOutsideMonth: outside,
          isSelected: selectedDate != null && isSameDay(date, selectedDate),
          isDisabled: !!isDisabled || isInvalidRange(date),
          isUnavailable: !outside && !!isDateUnavailable?.(date),
          isToday: isSameDay(date, todayDate),
          isFocused: isSameDay(date, focusedDate),
        });
      }
      result.push(days);
    }
    return result;
  }, [
    visibleMonth,
    locale,
    firstDayOfWeek,
    selectedDate,
    isDisabled,
    isInvalidRange,
    isDateUnavailable,
    todayDate,
    focusedDate,
  ]);

  // ── Localised chrome ────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const shortFmt = new DateFormatter(locale, { weekday: "short", timeZone });
    const longFmt = new DateFormatter(locale, { weekday: "long", timeZone });
    const gridStart = startOfWeek(visibleMonth, locale, firstDayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = gridStart.add({ days: i }).toDate(timeZone);
      return { short: shortFmt.format(d), long: longFmt.format(d) };
    });
  }, [locale, timeZone, visibleMonth, firstDayOfWeek]);

  const title = useMemo(
    () =>
      new DateFormatter(locale, { month: "long", year: "numeric", timeZone }).format(
        visibleMonth.toDate(timeZone),
      ),
    [locale, timeZone, visibleMonth],
  );

  // One formatter per locale/timezone, reused for every cell — the grid renders
  // ~42 cells and re-renders on each arrow keypress, so building a fresh
  // DateFormatter per cell (per frame while a key is held) was needless churn.
  const cellLabelFmt = useMemo(
    () =>
      new DateFormatter(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone,
      }),
    [locale, timeZone],
  );
  const cellLabel = useCallback(
    (date: CalendarDate) => cellLabelFmt.format(date.toDate(timeZone)),
    [cellLabelFmt, timeZone],
  );

  // ── Month paging ────────────────────────────────────────────────────────────
  const previousMonth = useCallback(
    () => setFocusedDate(visibleMonth.subtract({ months: 1 })),
    [visibleMonth, setFocusedDate],
  );
  const nextMonth = useCallback(
    () => setFocusedDate(visibleMonth.add({ months: 1 })),
    [visibleMonth, setFocusedDate],
  );

  const prevDisabled = useMemo(
    () =>
      !!isDisabled ||
      (min != null && endOfMonth(visibleMonth.subtract({ months: 1 })).compare(min) < 0),
    [isDisabled, min, visibleMonth],
  );
  const nextDisabled = useMemo(
    () =>
      !!isDisabled ||
      (max != null && startOfMonth(visibleMonth.add({ months: 1 })).compare(max) > 0),
    [isDisabled, max, visibleMonth],
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  const onCellKeyDown = useCallback(
    (e: React.KeyboardEvent, date: CalendarDate) => {
      let next: CalendarDate | null = null;
      switch (e.key) {
        case "ArrowLeft":
          next = date.subtract({ days: 1 });
          break;
        case "ArrowRight":
          next = date.add({ days: 1 });
          break;
        case "ArrowUp":
          next = date.subtract({ weeks: 1 });
          break;
        case "ArrowDown":
          next = date.add({ weeks: 1 });
          break;
        case "Home":
          next = startOfWeek(date, locale, firstDayOfWeek);
          break;
        case "End":
          next = startOfWeek(date, locale, firstDayOfWeek).add({ days: 6 });
          break;
        case "PageUp":
          next = date.subtract(e.shiftKey ? { years: 1 } : { months: 1 });
          break;
        case "PageDown":
          next = date.add(e.shiftKey ? { years: 1 } : { months: 1 });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          selectDate(date);
          return;
        default: {
          // QBO-style whole-date shortcuts move the highlight like the arrows do
          // (Enter/click still confirms). Bare keypress only — a modifier is left
          // for the browser/OS. `setFocusedDate` clamps the target to min/max.
          if (e.altKey || e.ctrlKey || e.metaKey) return;
          const cmd = DATE_SHORTCUT_KEYS[e.key.toLowerCase()];
          if (!cmd) return;
          next = resolveDateShortcut(cmd, date, todayDate, locale, firstDayOfWeek);
          break;
        }
      }
      e.preventDefault();
      isFocusedRef.current = true;
      moveFocusRef.current = true;
      setFocusedDate(next);
    },
    [locale, firstDayOfWeek, selectDate, setFocusedDate, todayDate],
  );

  return {
    weeks,
    weekDays,
    title,
    cellLabel,
    focusedDate,
    isFocusedRef,
    moveFocusRef,
    setFocusedDate,
    selectDate,
    previousMonth,
    nextMonth,
    prevDisabled,
    nextDisabled,
    onCellKeyDown,
  };
}

/**
 * Returns a value whose date portion is `date`, preserving the time/zone of
 * `base` when it carries one (so picking a day in a date+time picker keeps the
 * time the user typed).
 */
function withDatePart(base: DateValue | null | undefined, date: CalendarDate): DateValue {
  const parts = { year: date.year, month: date.month, day: date.day };
  if (base instanceof ZonedDateTime) return base.set(parts);
  if (base instanceof CalendarDateTime) return base.set(parts);
  return date;
}
