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
 * Selection-agnostic calendar-grid engine — month/week computation (locale +
 * first-day-of-week aware), roving focus, month paging, and full APG keyboard
 * navigation. What "selecting a day" means is injected via a
 * {@link CalendarSelectionAdapter}, so the single-value `useCalendarState` and
 * the range `useRangeCalendarState` share everything but their selection model.
 */

// `FirstDayOfWeek` lives in the shared shortcut module (its resolver consumes
// it); re-export so calendar import sites keep resolving it from the engine.
export type { FirstDayOfWeek };

export interface CalendarDay {
  date: CalendarDate;
  isOutsideMonth: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isUnavailable: boolean;
  isToday: boolean;
  isFocused: boolean;
  /** Range states — set only by the range selection adapter. */
  isSelectionStart?: boolean;
  isSelectionEnd?: boolean;
  /** Inside the (highlighted or committed) range, endpoints included. */
  isInRange?: boolean;
}

/** The selection-derived slice of a {@link CalendarDay}. */
export type CalendarDaySelection = Pick<
  CalendarDay,
  "isSelected" | "isSelectionStart" | "isSelectionEnd" | "isInRange"
>;

export interface CalendarSelectionAdapter {
  /** Selection flags for a day; merged into the `CalendarDay` grid cells. */
  dayFlags: (date: CalendarDate, focusedDate: CalendarDate) => CalendarDaySelection;
  /**
   * Handle a confirmed day (click or Enter/Space). May return a different date
   * to move the roving focus to — the range adapter advances focus one day
   * past a keyboard-set anchor to signal that the range is now extending.
   */
  select: (date: CalendarDate, opts: { viaKeyboard: boolean }) => CalendarDate | undefined;
  /** Escape pressed on a cell — the range adapter cancels an in-progress selection. */
  onEscape?: () => void;
}

export interface CalendarGridOptions {
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

export function toCal(v: DateValue | null | undefined): CalendarDate | null {
  if (!v) return null;
  return toCalendarDate(v as never);
}

export function useCalendarGridState(
  options: CalendarGridOptions,
  adapter: CalendarSelectionAdapter,
) {
  const {
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

  const todayDate = useMemo(() => today(timeZone), [timeZone]);

  const isFocusControlled = focusedValue !== undefined;
  const [internalFocused, setInternalFocused] = useState<CalendarDate>(
    () => toCal(defaultFocusedValue) ?? todayDate,
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
    (date: CalendarDate, viaKeyboard = false) => {
      if (isDisabled || isReadOnly) return;
      if (isInvalidRange(date) || isDateUnavailable?.(date)) return;
      let target = adapter.select(date, { viaKeyboard }) ?? date;
      if (min != null && target.compare(min) < 0) target = min;
      if (max != null && target.compare(max) > 0) target = max;
      // When a keyboard selection moves focus to a *different* day (the range
      // anchor advancing), pull DOM focus along like the arrow keys do.
      if (viaKeyboard && !isSameDay(target, focusedDate)) {
        isFocusedRef.current = true;
        moveFocusRef.current = true;
      }
      setFocusedDate(target);
    },
    [
      isDisabled,
      isReadOnly,
      isInvalidRange,
      isDateUnavailable,
      adapter,
      min,
      max,
      focusedDate,
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
          isDisabled: !!isDisabled || isInvalidRange(date),
          isUnavailable: !outside && !!isDateUnavailable?.(date),
          isToday: isSameDay(date, todayDate),
          isFocused: isSameDay(date, focusedDate),
          // Selection flags stay off the grayed outside-month duplicates —
          // otherwise a range crossing a month boundary paints its band (and
          // announces aria-selected) on the non-interactive copies too.
          ...(outside ? { isSelected: false } : adapter.dayFlags(date, focusedDate)),
        });
      }
      result.push(days);
    }
    return result;
  }, [
    visibleMonth,
    locale,
    firstDayOfWeek,
    adapter,
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
  // Paging preserves the day-of-month (Jun 15 → Jul 15, constrained at short
  // months), matching PageUp/PageDown and react-aria — and keeping a range
  // preview anchored mid-month from snapping to the 1st.
  const previousMonth = useCallback(
    () => setFocusedDate(focusedDate.subtract({ months: 1 })),
    [focusedDate, setFocusedDate],
  );
  const nextMonth = useCallback(
    () => setFocusedDate(focusedDate.add({ months: 1 })),
    [focusedDate, setFocusedDate],
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
          selectDate(date, true);
          return;
        case "Escape":
          // Cancels an in-progress range selection. Deliberately NOT
          // preventDefault'd: inside a popover the same keypress should still
          // dismiss it (mirrors react-aria's RangeCalendar).
          adapter.onEscape?.();
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
      // Arm the one-shot focus move only when the (clamped) target is a
      // different day — a keypress clamped back to the min/max boundary must
      // not leave a stale flag that would later hijack a non-keyboard focus
      // change (month-nav click, hover) and yank DOM focus into the grid.
      let target = next;
      if (min != null && target.compare(min) < 0) target = min;
      if (max != null && target.compare(max) > 0) target = max;
      if (!isSameDay(target, focusedDate)) {
        isFocusedRef.current = true;
        moveFocusRef.current = true;
      }
      setFocusedDate(target);
    },
    [locale, firstDayOfWeek, selectDate, setFocusedDate, todayDate, adapter, min, max, focusedDate],
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

export type CalendarGridState = ReturnType<typeof useCalendarGridState>;

/**
 * The state contract `CalendarView` renders from — the grid engine plus the
 * optional range-mode extras set by `useRangeCalendarState`.
 */
export interface CalendarViewState extends CalendarGridState {
  /** True for a range calendar — turns on `aria-multiselectable` + selection prompts. */
  isRange?: boolean;
  /** True while a range selection is in progress (anchor set, awaiting the end date). */
  hasAnchor?: boolean;
  /** Live range preview: extend the highlight to the hovered cell. */
  onCellHover?: (date: CalendarDate) => void;
}

/**
 * Returns a value whose date portion is `date`, preserving the time/zone of
 * `base` when it carries one (so picking a day in a date+time picker keeps the
 * time the user typed).
 */
export function withDatePart(base: DateValue | null | undefined, date: CalendarDate): DateValue {
  const parts = { year: date.year, month: date.month, day: date.day };
  if (base instanceof ZonedDateTime) return base.set(parts);
  if (base instanceof CalendarDateTime) return base.set(parts);
  return date;
}
