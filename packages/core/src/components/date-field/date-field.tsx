import { useCallback, useId, useRef, useState } from "react";
import type { DateValue } from "@internationalized/date";
import { cn } from "@/lib/utils";
import { buildLocaleResolver, type LocalizedString } from "@/lib/i18n";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import {
  useDateFieldState,
  type DateFieldInvalidReason,
  type Granularity,
  type HourCycle,
} from "./use-date-field-state";
import { useCalendarState, type FirstDayOfWeek } from "../calendar/use-calendar-state";
import { CalendarView } from "../calendar/calendar-view";
import {
  DateInputGroup,
  DatePopover,
  DatePickerPopoverTrigger,
  DatePickerLabel,
  DatePickerDescription,
  DatePickerError,
} from "./date-input-group";
import { useDateFieldT } from "./i18n";

/**
 * Public, closed-API date components — the @internationalized/date + Base UI
 * implementation. Same surface as the react-aria variant; only the internals
 * differ. Consumers never see Base UI or the date engines.
 */

// Built-in validation message key for a field's invalid reason (null = none, so
// the consumer's `errorMessage` — or no message — stands). A lookup rather than
// a nested ternary keeps the lint happy.
function invalidMessageKey(
  reason: DateFieldInvalidReason | null | undefined,
): "dateUnavailable" | "dateOutOfRange" | null {
  if (reason === "unavailable") return "dateUnavailable";
  if (reason === "range") return "dateOutOfRange";
  return null;
}

// ─── Small controlled-state helper ────────────────────────────────────────────
function useControlledState<V>(
  controlled: V | undefined,
  defaultValue: V,
  onChange?: (value: V) => void,
): [V, (value: V) => void] {
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = useState<V>(defaultValue);
  const value = isControlled ? (controlled as V) : internal;
  const set = useCallback(
    (next: V) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [value, set];
}

// ─── Shared prop types (names unchanged from react-aria) ──────────────────────

interface DateFieldMetaProps {
  label?: LocalizedString;
  description?: LocalizedString;
  errorMessage?: LocalizedString;
  className?: string;
}

interface DateBehaviorProps<T extends DateValue> {
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
  granularity?: Granularity;
  minValue?: DateValue;
  maxValue?: DateValue;
  isDateUnavailable?: (date: DateValue) => boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  autoFocus?: boolean;
  hourCycle?: HourCycle;
  hideTimeZone?: boolean;
  placeholderValue?: DateValue;
  /**
   * First day of the week (0 = Sunday … 6 = Saturday); defaults to the locale.
   * Only affects the `w`/`k` (start/end of week) keyboard shortcuts here.
   */
  firstDayOfWeek?: FirstDayOfWeek;
  name?: string;
  /** Accessible name when no visible `label` is provided (e.g. a compact filter input). */
  "aria-label"?: string;
  /** BCP-47 locale override; defaults to the AppShell formatting locale. */
  locale?: string;
}

export type DateFieldProps<T extends DateValue = DateValue> = DateFieldMetaProps &
  DateBehaviorProps<T>;

export type DatePickerProps<T extends DateValue = DateValue> = DateFieldProps<T> & {
  /** IANA timezone; defaults to the AppShell `timeZone`. */
  timeZone?: string;
};

// ─── DateField ────────────────────────────────────────────────────────────────

/**
 * A segmented date/time input field with no popover.
 *
 * @example
 * ```tsx
 * import { DateField } from "@tailor-platform/app-shell";
 *
 * <DateField label="Invoice date" />
 * <DateField label="Created at" granularity="minute" />
 * ```
 */
function DateField<T extends DateValue = DateValue>({
  label,
  description,
  errorMessage,
  className,
  locale: localeProp,
  value,
  defaultValue,
  onChange,
  granularity,
  hourCycle,
  placeholderValue,
  minValue,
  maxValue,
  isDateUnavailable,
  isDisabled,
  isReadOnly,
  isInvalid,
  isRequired,
  autoFocus,
  firstDayOfWeek,
  name,
  "aria-label": ariaLabel,
}: DateFieldProps<T>) {
  const { locale: shellLocale, language } = useResolvedLocale();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolve = buildLocaleResolver(language);
  const t = useDateFieldT();

  const labelId = useId();
  const descId = useId();
  const errId = useId();

  const state = useDateFieldState({
    // Pass `value` through as-is: `null` is a controlled-empty value and must
    // stay distinct from `undefined` (uncontrolled), or a parent clearing the
    // field with `value={null}` would be treated as uncontrolled and ignored.
    value,
    defaultValue,
    onChange: onChange as (v: DateValue | null) => void,
    granularity,
    locale: resolvedLocale,
    hourCycle,
    placeholderValue,
    // min/max and unavailability flag a typed/shortcut value invalid (not
    // clamped) — the field is free-entry with no calendar to gate selection.
    minValue,
    maxValue,
    isDateUnavailable,
    // Drives the `w`/`k` (start/end of week) shortcuts; the standalone field has
    // no calendar to pair with, so this is the only week-start override.
    firstDayOfWeek,
    isReadOnly,
  });

  const labelText = label ? resolve(label, "") : undefined;
  const descText = description ? resolve(description, "") : undefined;
  const errorText = errorMessage ? resolve(errorMessage, "") : undefined;
  // Consumer `errorMessage` wins; otherwise fall back to the built-in message
  // for an out-of-range / unavailable typed value.
  const msgKey = invalidMessageKey(state.invalidReason);
  const shownError = errorText ?? (msgKey ? t(msgKey) : undefined);
  const derivedInvalid = !!errorText || !!isInvalid || state.isInvalid;

  const describedBy = cn(descText && descId, derivedInvalid && shownError && errId) || undefined;

  return (
    <div data-slot="date-field" className={cn("astw:flex astw:flex-col astw:gap-1", className)}>
      {labelText && <DatePickerLabel id={labelId}>{labelText}</DatePickerLabel>}
      <DateInputGroup
        segments={state.segments}
        cycle={state.cycle}
        setDigit={state.setDigit}
        setDayPeriod={state.setDayPeriod}
        clearSegment={state.clearSegment}
        applyShortcut={state.applyShortcut}
        commitOnBlur={state.commitOnBlur}
        expandShortYear={state.expandShortYear}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isInvalid={derivedInvalid}
        isRequired={isRequired}
        autoFocus={autoFocus}
        labelId={labelText ? labelId : undefined}
        ariaLabel={ariaLabel}
        describedById={describedBy}
      />
      {descText && <DatePickerDescription id={descId}>{descText}</DatePickerDescription>}
      {derivedInvalid && shownError && <DatePickerError id={errId}>{shownError}</DatePickerError>}
      {name && <input type="hidden" name={name} value={state.fieldValue?.toString() ?? ""} />}
    </div>
  );
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

/**
 * A date/time input with a popover calendar.
 *
 * Value type is driven by `granularity`:
 * - `"day"` (default) → `CalendarDate`
 * - `"hour" | "minute" | "second"` → `CalendarDateTime` (or `ZonedDateTime` when a `timeZone` is set)
 *
 * @example
 * ```tsx
 * import { DatePicker, today, getLocalTimeZone, type CalendarDate } from "@tailor-platform/app-shell";
 *
 * const [date, setDate] = useState<CalendarDate | null>(null);
 * <DatePicker label="Ship date" value={date} onChange={setDate} />
 * ```
 */
function DatePicker<T extends DateValue = DateValue>({
  label,
  description,
  errorMessage,
  className,
  locale: localeProp,
  timeZone: timeZoneProp,
  value,
  defaultValue,
  onChange,
  granularity,
  hourCycle,
  placeholderValue,
  minValue,
  maxValue,
  isDateUnavailable,
  isDisabled,
  isReadOnly,
  isInvalid,
  isRequired,
  autoFocus,
  firstDayOfWeek,
  name,
  "aria-label": ariaLabel,
}: DatePickerProps<T>) {
  const { locale: shellLocale, language } = useResolvedLocale();
  const shellTz = useTimeZone();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedTz = timeZoneProp ?? shellTz.value;
  const resolve = buildLocaleResolver(language);
  const t = useDateFieldT();

  const labelId = useId();
  const descId = useId();
  const errId = useId();

  const labelText = label ? resolve(label, "") : undefined;
  const descText = description ? resolve(description, "") : undefined;
  const errorText = errorMessage ? resolve(errorMessage, "") : undefined;

  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [val, setVal] = useControlledState<DateValue | null>(
    // `null` is controlled-empty; only `undefined` means uncontrolled (see above).
    value,
    defaultValue ?? null,
    onChange as (v: DateValue | null) => void,
  );

  const fieldState = useDateFieldState({
    value: val,
    onChange: setVal,
    granularity,
    locale: resolvedLocale,
    // Use the resolved timezone (prop → AppShell → local), matching the calendar
    // below — otherwise the field falls back to UTC for its "today"/anchor while
    // the calendar uses the AppShell zone, and they disagree on defaults.
    timeZone: resolvedTz,
    hourCycle,
    placeholderValue,
    // Same bounds the calendar enforces, but on the field they flag a typed/
    // shortcut value invalid (the calendar gates selection; typing can't be).
    minValue,
    maxValue,
    isDateUnavailable,
    // Match the calendar's week-start so field + calendar `w`/`k` agree.
    firstDayOfWeek,
    isReadOnly,
  });

  const calState = useCalendarState({
    value: val,
    onChange: (d) => {
      setVal(d);
      setOpen(false);
    },
    minValue,
    maxValue,
    isDateUnavailable,
    isDisabled,
    isReadOnly,
    firstDayOfWeek,
    locale: resolvedLocale,
    timeZone: resolvedTz,
  });

  // Consumer `errorMessage` wins; otherwise the built-in out-of-range /
  // unavailable message for a typed or shortcut-entered value.
  const msgKey = invalidMessageKey(fieldState.invalidReason);
  const shownError = errorText ?? (msgKey ? t(msgKey) : undefined);
  const derivedInvalid = !!errorText || !!isInvalid || fieldState.isInvalid;

  const describedBy = cn(descText && descId, derivedInvalid && shownError && errId) || undefined;
  const accessibleName = labelText ?? ariaLabel;
  const popoverAriaLabel = accessibleName
    ? t("chooseDateFor", { name: accessibleName })
    : t("chooseDate");

  return (
    <div data-slot="date-picker" className={cn("astw:flex astw:flex-col astw:gap-1", className)}>
      {labelText && <DatePickerLabel id={labelId}>{labelText}</DatePickerLabel>}
      <DatePopover
        open={open}
        onOpenChange={setOpen}
        ariaLabel={popoverAriaLabel}
        anchor={fieldRef}
        field={
          <DateInputGroup
            segments={fieldState.segments}
            cycle={fieldState.cycle}
            setDigit={fieldState.setDigit}
            setDayPeriod={fieldState.setDayPeriod}
            clearSegment={fieldState.clearSegment}
            applyShortcut={fieldState.applyShortcut}
            commitOnBlur={fieldState.commitOnBlur}
            expandShortYear={fieldState.expandShortYear}
            onOpenCalendar={() => setOpen(true)}
            isDisabled={isDisabled}
            isReadOnly={isReadOnly}
            isInvalid={derivedInvalid}
            isRequired={isRequired}
            autoFocus={autoFocus}
            labelId={labelText ? labelId : undefined}
            ariaLabel={ariaLabel}
            describedById={describedBy}
            groupRef={fieldRef}
            trigger={<DatePickerPopoverTrigger disabled={isDisabled} />}
          />
        }
      >
        <CalendarView
          state={calState}
          ariaLabel={labelText ?? ariaLabel ?? t("calendar")}
          inPopover
        />
      </DatePopover>
      {descText && <DatePickerDescription id={descId}>{descText}</DatePickerDescription>}
      {derivedInvalid && shownError && <DatePickerError id={errId}>{shownError}</DatePickerError>}
      {name && <input type="hidden" name={name} value={fieldState.fieldValue?.toString() ?? ""} />}
    </div>
  );
}

export { DateField, DatePicker };
