import type { CalendarDate, DateValue } from "@internationalized/date";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import { useCalendarState, type FirstDayOfWeek } from "./use-calendar-state";
import { CalendarView } from "./calendar-view";

/**
 * Public, closed-API standalone calendar — the @internationalized/date + Base UI
 * implementation. Same surface as the react-aria variant; only the internals
 * differ. Consumers never see Base UI or the calendar engine.
 */

export interface CalendarProps<T extends DateValue = DateValue> {
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T) => void;
  minValue?: DateValue;
  maxValue?: DateValue;
  isDateUnavailable?: (date: DateValue) => boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  focusedValue?: DateValue;
  defaultFocusedValue?: DateValue;
  onFocusChange?: (date: CalendarDate) => void;
  firstDayOfWeek?: FirstDayOfWeek;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  timeZone?: string;
  className?: string;
  /** BCP-47 locale override; defaults to the AppShell formatting locale. */
  locale?: string;
}

/**
 * A standalone inline calendar — no popover, suitable for reporting filters
 * or date selection within a larger layout.
 *
 * @example
 * ```tsx
 * import { Calendar } from "@tailor-platform/app-shell";
 *
 * <Calendar aria-label="Select date" value={value} onChange={setValue} />
 * ```
 */
function Calendar<T extends DateValue = DateValue>({
  value,
  defaultValue,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  isDisabled,
  isReadOnly,
  focusedValue,
  defaultFocusedValue,
  onFocusChange,
  firstDayOfWeek,
  timeZone: timeZoneProp,
  locale: localeProp,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: CalendarProps<T>) {
  const { locale: shellLocale } = useResolvedLocale();
  const shellTz = useTimeZone();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedTz = timeZoneProp ?? shellTz.value;

  const state = useCalendarState({
    value: value ?? undefined,
    defaultValue,
    onChange: onChange as (v: DateValue) => void,
    minValue,
    maxValue,
    isDateUnavailable,
    isDisabled,
    isReadOnly,
    focusedValue,
    defaultFocusedValue,
    onFocusChange,
    firstDayOfWeek,
    locale: resolvedLocale,
    timeZone: resolvedTz,
  });

  return (
    <CalendarView
      state={state}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
      className={className}
    />
  );
}

export { Calendar };
