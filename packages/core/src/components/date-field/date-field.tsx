import * as React from "react";
import type { DateValue } from "@internationalized/date";
import { cn } from "@/lib/utils";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import { useDateFieldState, type Granularity, type HourCycle } from "./use-date-field-state";
import { useCalendarState, type FirstDayOfWeek } from "../calendar/use-calendar-state";
import { CalendarView } from "../calendar/calendar-view";
import { DateInputGroup, DatePopover, DatePickerPopoverTrigger } from "./date-input-group";
import { useDateFieldT } from "./i18n";

/**
 * Public date controls.
 *
 * These are standalone composite widgets built on plain accessible markup and a
 * proxy input for form value / native validity. They intentionally do not hook
 * into Base UI's internal Field/Form wiring.
 */

function invalidMessageKey(
  reason: "range" | "unavailable" | null | undefined,
): "dateUnavailable" | "dateOutOfRange" | null {
  if (reason === "unavailable") return "dateUnavailable";
  if (reason === "range") return "dateOutOfRange";
  return null;
}

function assignRef<T>(ref: React.Ref<T | null> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

function useProxyInputRef(
  forwardedRef: React.Ref<HTMLInputElement> | undefined,
  customValidity: string,
) {
  return React.useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.setCustomValidity(customValidity);
      assignRef(forwardedRef, node);
    },
    [customValidity, forwardedRef],
  );
}

function useControlledState<V>(
  controlled: V | undefined,
  defaultValue: V,
  onChange?: (value: V) => void,
): [V, (value: V) => void] {
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = React.useState<V>(defaultValue);
  const value = isControlled ? (controlled as V) : internal;
  const set = React.useCallback(
    (next: V) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [value, set];
}

interface DateControlProps<T extends DateValue> {
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
  onBlur?: () => void;
  granularity?: Granularity;
  minValue?: DateValue;
  maxValue?: DateValue;
  isDateUnavailable?: (date: T) => boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  autoFocus?: boolean;
  hourCycle?: HourCycle;
  placeholderValue?: DateValue;
  firstDayOfWeek?: FirstDayOfWeek;
  name?: string;
  className?: string;
  id?: string;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** ID of the element(s) that label the control. */
  "aria-labelledby"?: string;
  /** ID of the element(s) that describe the control. */
  "aria-describedby"?: string;
  /** BCP-47 locale override; defaults to the AppShell formatting locale. */
  locale?: string;
}

export type DateFieldProps<T extends DateValue = DateValue> = DateControlProps<T>;

export type DatePickerProps<T extends DateValue = DateValue> = DateControlProps<T> & {
  /** IANA timezone; defaults to the AppShell `timeZone`. */
  timeZone?: string;
};

/**
 * A segmented date/time input field with no popover.
 *
 * Provide an accessible name with `aria-label` or `aria-labelledby`. For
 * visible labels / descriptions / errors, wire them manually with standard
 * HTML + ARIA attributes.
 */
const DateField = React.forwardRef(function DateField<T extends DateValue = DateValue>(
  {
    id,
    className,
    locale: localeProp,
    value,
    defaultValue,
    onChange,
    onBlur,
    granularity,
    minValue,
    maxValue,
    isDateUnavailable,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    hourCycle,
    placeholderValue,
    autoFocus,
    firstDayOfWeek,
    name,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
  }: DateFieldProps<T>,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const { locale: shellLocale } = useResolvedLocale();
  const resolvedLocale = localeProp ?? shellLocale;
  const groupRef = React.useRef<HTMLDivElement>(null);
  const t = useDateFieldT();

  const state = useDateFieldState({
    value,
    defaultValue,
    onChange: onChange as (v: DateValue | null) => void,
    granularity,
    locale: resolvedLocale,
    hourCycle,
    placeholderValue,
    minValue,
    maxValue,
    isDateUnavailable: isDateUnavailable as ((date: DateValue) => boolean) | undefined,
    firstDayOfWeek,
    isReadOnly,
  });

  const localValidationMessage = React.useMemo(() => {
    const key = invalidMessageKey(state.invalidReason);
    return key ? t(key) : "";
  }, [state.invalidReason, t]);
  const derivedInvalid = !!isInvalid || !!localValidationMessage;

  const setProxyRef = useProxyInputRef(ref, localValidationMessage);

  const focusFirstSegment = React.useCallback(() => {
    const first = groupRef.current?.querySelector<HTMLElement>('[role="spinbutton"]');
    first?.focus();
  }, []);

  return (
    <div data-slot="date-field" className={cn("astw:relative", className)}>
      <input
        ref={setProxyRef}
        id={id}
        name={name}
        tabIndex={-1}
        aria-hidden="true"
        disabled={isDisabled}
        readOnly={isReadOnly}
        required={isRequired}
        value={state.fieldValue?.toString() ?? ""}
        onChange={() => {}}
        onFocus={focusFirstSegment}
        className="astw:pointer-events-none astw:absolute astw:size-px astw:overflow-hidden astw:opacity-0"
      />
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
        ariaLabelledby={ariaLabelledby}
        ariaLabel={ariaLabel}
        describedById={ariaDescribedby}
        groupRef={groupRef}
        onGroupBlur={onBlur}
      />
    </div>
  );
}) as <T extends DateValue = DateValue>(
  props: DateFieldProps<T> & { ref?: React.Ref<HTMLInputElement> },
) => React.ReactElement;

/**
 * A date/time input with a popover calendar.
 *
 * Provide an accessible name with `aria-label` or `aria-labelledby`. For
 * visible labels / descriptions / errors, wire them manually with standard
 * HTML + ARIA attributes.
 */
const DatePicker = React.forwardRef(function DatePicker<T extends DateValue = DateValue>(
  {
    id,
    className,
    locale: localeProp,
    timeZone: timeZoneProp,
    value,
    defaultValue,
    onChange,
    onBlur,
    granularity,
    minValue,
    maxValue,
    isDateUnavailable,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    hourCycle,
    placeholderValue,
    autoFocus,
    firstDayOfWeek,
    name,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
  }: DatePickerProps<T>,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const { locale: shellLocale } = useResolvedLocale();
  const shellTz = useTimeZone();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedTz = timeZoneProp ?? shellTz.value;
  const t = useDateFieldT();

  const [open, setOpen] = React.useState(false);
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [val, setVal] = useControlledState<DateValue | null>(
    value,
    defaultValue ?? null,
    onChange as (v: DateValue | null) => void,
  );

  const fieldState = useDateFieldState({
    value: val,
    onChange: setVal,
    granularity,
    locale: resolvedLocale,
    timeZone: resolvedTz,
    hourCycle,
    placeholderValue,
    minValue,
    maxValue,
    isDateUnavailable: isDateUnavailable as ((date: DateValue) => boolean) | undefined,
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
    isDateUnavailable: isDateUnavailable as ((date: DateValue) => boolean) | undefined,
    isDisabled,
    isReadOnly,
    firstDayOfWeek,
    locale: resolvedLocale,
    timeZone: resolvedTz,
  });

  const localValidationMessage = React.useMemo(() => {
    const key = invalidMessageKey(fieldState.invalidReason);
    return key ? t(key) : "";
  }, [fieldState.invalidReason, t]);
  const derivedInvalid = !!isInvalid || !!localValidationMessage;

  const setProxyRef = useProxyInputRef(ref, localValidationMessage);

  const focusFirstSegment = React.useCallback(() => {
    const first = fieldRef.current?.querySelector<HTMLElement>('[role="spinbutton"]');
    first?.focus();
  }, []);

  return (
    <div data-slot="date-picker" className={cn("astw:relative", className)}>
      <input
        ref={setProxyRef}
        id={id}
        name={name}
        tabIndex={-1}
        aria-hidden="true"
        disabled={isDisabled}
        readOnly={isReadOnly}
        required={isRequired}
        value={fieldState.fieldValue?.toString() ?? ""}
        onChange={() => {}}
        onFocus={focusFirstSegment}
        className="astw:pointer-events-none astw:absolute astw:size-px astw:overflow-hidden astw:opacity-0"
      />
      <DatePopover
        open={open}
        onOpenChange={setOpen}
        ariaLabel={ariaLabel ? t("chooseDateFor", { name: ariaLabel }) : t("chooseDate")}
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
            ariaLabelledby={ariaLabelledby}
            ariaLabel={ariaLabel}
            describedById={ariaDescribedby}
            groupRef={fieldRef}
            trigger={<DatePickerPopoverTrigger disabled={isDisabled} />}
            onGroupBlur={onBlur}
          />
        }
      >
        <CalendarView state={calState} ariaLabel={ariaLabel ?? t("calendar")} inPopover />
      </DatePopover>
    </div>
  );
}) as <T extends DateValue = DateValue>(
  props: DatePickerProps<T> & { ref?: React.Ref<HTMLInputElement> },
) => React.ReactElement;

export { DateField, DatePicker };
