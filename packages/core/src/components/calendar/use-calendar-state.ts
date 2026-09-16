import { useCallback, useMemo, useState } from "react";
import { isSameDay, type CalendarDate, type DateValue } from "@internationalized/date";
import {
  toCal,
  useCalendarGridState,
  withDatePart,
  type CalendarGridOptions,
  type CalendarSelectionAdapter,
} from "./use-calendar-base-state";

/**
 * Single-value calendar state — the logic react-aria's `useCalendarState`
 * would otherwise provide. The grid/focus/keyboard engine lives in
 * `useCalendarGridState`; this wrapper owns only the selection model
 * (one controlled/uncontrolled `DateValue`).
 */

export type { CalendarDay, FirstDayOfWeek } from "./use-calendar-base-state";

export interface CalendarStateOptions extends CalendarGridOptions {
  value?: DateValue | null;
  defaultValue?: DateValue | null;
  onChange?: (value: DateValue) => void;
}

export function useCalendarState(options: CalendarStateOptions) {
  const { value: controlledValue, defaultValue, onChange, ...gridOptions } = options;

  const isValueControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<DateValue | null>(defaultValue ?? null);
  const value = isValueControlled ? controlledValue : internalValue;
  const selectedDate = useMemo(() => toCal(value), [value]);

  const dayFlags = useCallback(
    (date: CalendarDate) => ({
      isSelected: selectedDate != null && isSameDay(date, selectedDate),
    }),
    [selectedDate],
  );

  const select = useCallback(
    (date: CalendarDate) => {
      // Preserve the time portion when the existing value carries time.
      const next: DateValue = withDatePart(value, date);
      if (!isValueControlled) setInternalValue(next);
      onChange?.(next);
      return undefined;
    },
    [value, isValueControlled, onChange],
  );

  const adapter = useMemo<CalendarSelectionAdapter>(
    () => ({ dayFlags, select }),
    [dayFlags, select],
  );

  return useCalendarGridState(
    {
      ...gridOptions,
      defaultFocusedValue: gridOptions.defaultFocusedValue ?? selectedDate ?? undefined,
    },
    adapter,
  );
}
