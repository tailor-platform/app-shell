import { useCallback, useMemo, useState } from "react";
import { isSameDay, type CalendarDate, type DateValue } from "@internationalized/date";
import {
  toCal,
  useCalendarGridState,
  withDatePart,
  type CalendarGridOptions,
  type CalendarSelectionAdapter,
  type CalendarViewState,
} from "./use-calendar-base-state";

/**
 * Range calendar state — the logic react-aria's `useRangeCalendarState` would
 * otherwise provide, on top of the shared `useCalendarGridState` engine.
 *
 * Selection is the react-aria two-click model: the first confirmed day sets an
 * *anchor*; while the anchor is set the highlighted range live-extends to the
 * focused day (keyboard nav and pointer hover both move it); the second
 * confirmed day commits `{ start, end }` in one `onChange`. Picking a day
 * before the anchor swaps the endpoints, so a committed range is always
 * ordered — a reversed range can only be produced by typing into the field.
 */

/** An inclusive date range. `start` and `end` may be the same day. */
export interface DateRange<T extends DateValue = DateValue> {
  start: T;
  end: T;
}

export interface RangeCalendarStateOptions extends CalendarGridOptions {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onChange?: (value: DateRange) => void;
}

function orderRange(a: CalendarDate, b: CalendarDate): { start: CalendarDate; end: CalendarDate } {
  return a.compare(b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

export function useRangeCalendarState(options: RangeCalendarStateOptions) {
  const { value: controlledValue, defaultValue, onChange, ...gridOptions } = options;
  const { minValue, maxValue, isDateUnavailable } = gridOptions;

  const isValueControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<DateRange | null>(defaultValue ?? null);
  const value = isValueControlled ? controlledValue : internalValue;

  // Committed range, normalized for display — a reversed value typed into a
  // field still highlights as an ordered span.
  const committed = useMemo(() => {
    const start = toCal(value?.start);
    const end = toCal(value?.end);
    return start != null && end != null ? orderRange(start, end) : null;
  }, [value]);

  // First half of an in-progress selection. While set, the highlight extends
  // from here to the focused day.
  const [anchorDate, setAnchorDate] = useState<CalendarDate | null>(null);

  const dayFlags = useCallback(
    (date: CalendarDate, focusedDate: CalendarDate) => {
      const highlighted = anchorDate != null ? orderRange(anchorDate, focusedDate) : committed;
      if (highlighted == null) return { isSelected: false };
      const isStart = isSameDay(date, highlighted.start);
      const isEnd = isSameDay(date, highlighted.end);
      return {
        // "Selected" = an endpoint; the days in between carry `isInRange` so the
        // endpoint pills and the connecting band style independently.
        isSelected: isStart || isEnd,
        isSelectionStart: isStart,
        isSelectionEnd: isEnd,
        isInRange: date.compare(highlighted.start) >= 0 && date.compare(highlighted.end) <= 0,
      };
    },
    [anchorDate, committed],
  );

  const select = useCallback(
    (date: CalendarDate, { viaKeyboard }: { viaKeyboard: boolean }) => {
      if (anchorDate == null) {
        setAnchorDate(date);
        // A keyboard-set anchor advances focus one day so arrow keys visibly
        // extend the range from here (react-aria's cue that selection started).
        // Except onto an unavailable day: the anchored bounds (below) will
        // exclude it next render, so advancing would strand focus/preview on a
        // day the contiguous-range rule forbids.
        if (!viaKeyboard) return undefined;
        const next = date.add({ days: 1 });
        return isDateUnavailable?.(next) ? undefined : next;
      }
      const { start, end } = orderRange(anchorDate, date);
      const next: DateRange = {
        // Preserve each endpoint's own time portion when the previous value
        // carried one.
        start: withDatePart(value?.start, start),
        end: withDatePart(value?.end, end),
      };
      setAnchorDate(null);
      if (!isValueControlled) setInternalValue(next);
      onChange?.(next);
      return undefined;
    },
    [anchorDate, value, isValueControlled, onChange, isDateUnavailable],
  );

  const cancelSelection = useCallback(() => setAnchorDate(null), []);

  const adapter = useMemo<CalendarSelectionAdapter>(
    () => ({ dayFlags, select, onEscape: cancelSelection }),
    [dayFlags, select, cancelSelection],
  );

  // While anchored, a range must not cross an unavailable date (react-aria's
  // contiguous-range rule): tighten min/max to the nearest unavailable day on
  // either side of the anchor. Bounded scan — a year each way is far beyond
  // what a month grid can reach without paging.
  const bounds = useMemo(() => {
    if (anchorDate == null || isDateUnavailable == null) {
      return { minValue, maxValue };
    }
    let lo = toCal(minValue);
    let hi = toCal(maxValue);
    let before = anchorDate.subtract({ days: 1 });
    for (let i = 0; i < 366 && (lo == null || before.compare(lo) >= 0); i++) {
      if (isDateUnavailable(before)) {
        lo = before.add({ days: 1 });
        break;
      }
      before = before.subtract({ days: 1 });
    }
    let after = anchorDate.add({ days: 1 });
    for (let i = 0; i < 366 && (hi == null || after.compare(hi) <= 0); i++) {
      if (isDateUnavailable(after)) {
        hi = after.subtract({ days: 1 });
        break;
      }
      after = after.add({ days: 1 });
    }
    return { minValue: lo ?? undefined, maxValue: hi ?? undefined };
  }, [anchorDate, isDateUnavailable, minValue, maxValue]);

  const base = useCalendarGridState(
    {
      ...gridOptions,
      minValue: bounds.minValue,
      maxValue: bounds.maxValue,
      defaultFocusedValue: gridOptions.defaultFocusedValue ?? value?.start ?? undefined,
    },
    adapter,
  );

  const { setFocusedDate, focusedDate, isFocusedRef, moveFocusRef } = base;
  const onCellHover = useCallback(
    (date: CalendarDate) => {
      // While the grid holds focus, the hover highlight IS the focus (react-aria
      // behaviour): pull DOM focus along so Enter/arrows act on the highlighted
      // day, not on whichever cell was focused before the hover.
      if (isFocusedRef.current && !isSameDay(date, focusedDate)) {
        moveFocusRef.current = true;
      }
      setFocusedDate(date);
    },
    [setFocusedDate, focusedDate, isFocusedRef, moveFocusRef],
  );

  const state = {
    ...base,
    isRange: true,
    hasAnchor: anchorDate != null,
    // Hover only previews while a selection is in progress — moving the
    // highlight (and the roving tabindex) on plain mouse-over would be noise.
    onCellHover: anchorDate != null ? onCellHover : undefined,
    /** Cancel an in-progress selection (e.g. when the popover closes mid-pick). */
    cancelSelection,
  } satisfies CalendarViewState & { cancelSelection: () => void };

  return state;
}
