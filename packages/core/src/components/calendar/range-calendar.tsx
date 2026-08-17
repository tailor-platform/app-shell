import type { CalendarDate, DateValue } from "@internationalized/date";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import type { FirstDayOfWeek } from "./use-calendar-base-state";
import { useRangeCalendarState, type DateRange } from "./use-range-calendar-state";
import { CalendarView } from "./calendar-view";

/**
 * Public, closed-API standalone range calendar — the @internationalized/date +
 * Base UI implementation. Same surface as the react-aria variant; only the
 * internals differ. Consumers never see Base UI or the calendar engine.
 */

export interface RangeCalendarProps<T extends DateValue = DateValue> {
  value?: DateRange<T> | null;
  defaultValue?: DateRange<T> | null;
  /** Fired once per selection, when the second date completes the range. */
  onChange?: (value: DateRange<T>) => void;
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
 * A standalone inline range calendar. The first click sets one end of the
 * range, the highlight follows the pointer (or arrow keys), and the second
 * click completes it — picking a day before the first swaps the endpoints.
 *
 * @example
 * ```tsx
 * import { RangeCalendar, type DateRange } from "@tailor-platform/app-shell";
 *
 * const [range, setRange] = useState<DateRange | null>(null);
 * <RangeCalendar aria-label="Stay dates" value={range} onChange={setRange} />
 * ```
 */
function RangeCalendar<T extends DateValue = DateValue>({
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
}: RangeCalendarProps<T>) {
  const { locale: shellLocale } = useResolvedLocale();
  const shellTz = useTimeZone();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedTz = timeZoneProp ?? shellTz.value;

  const state = useRangeCalendarState({
    value,
    defaultValue,
    onChange: onChange as (v: DateRange) => void,
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

export { RangeCalendar };
