import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import type { DateValue } from "@internationalized/date";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { cn } from "@/lib/utils";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import {
  useDateFieldState,
  type DateFieldStateChange,
  type Granularity,
  type HourCycle,
} from "./use-date-field-state";
import { useCalendarState, type FirstDayOfWeek } from "../calendar/use-calendar-state";
import { CalendarView } from "../calendar/calendar-view";
import { DateInputGroup, DatePopover, DatePickerPopoverTrigger } from "./date-input-group";
import { useDateFieldT } from "./i18n";
import {
  invalidMessageKey,
  isTargetWithin,
  useControlledState,
  useDateFieldFieldBridge,
} from "./use-date-field-bridge";

/**
 * Public date controls.
 *
 * These are standalone composite widgets built on plain accessible markup and a
 * proxy input for form value / native validity. Inside `Field.Root`, they also
 * register with Base UI's label, description, and validation plumbing. All of
 * that coupling lives in `useDateFieldFieldBridge` (see `./use-date-field-bridge`).
 */

interface DateControlProps<T extends DateValue> {
  value?: T | null;
  defaultValue?: T | null;
  onChange?: (value: T | null) => void;
  onBlur?: () => void;
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
 * Compose with `Field.Root` for label / description / error presentation, or
 * provide standalone ARIA wiring yourself.
 */
const DateField = forwardRef(function DateField<T extends DateValue = DateValue>(
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
  ref: ForwardedRef<HTMLInputElement>,
) {
  const fieldRoot = useFieldRootContext();
  const { locale: shellLocale } = useResolvedLocale();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedDisabled = fieldRoot.disabled || !!isDisabled;
  const resolvedReadOnly = !!isReadOnly;
  const groupRef = useRef<HTMLDivElement>(null);
  const t = useDateFieldT();
  const handleStateChangeRef = useRef<(change: DateFieldStateChange) => void>(() => {});

  const state = useDateFieldState({
    value,
    defaultValue,
    onChange: onChange as (v: DateValue | null) => void,
    onStateChange: (change) => handleStateChangeRef.current(change),
    granularity,
    locale: resolvedLocale,
    hourCycle,
    placeholderValue,
    minValue,
    maxValue,
    isDateUnavailable,
    firstDayOfWeek,
    isReadOnly: resolvedReadOnly,
  });

  const localValidationMessage = useMemo(() => {
    const key = invalidMessageKey(state.invalidReason);
    return key ? t(key) : undefined;
  }, [state.invalidReason, t]);
  const bindings = useDateFieldFieldBridge({
    id,
    name,
    inputValue: state.fieldValue?.toString() ?? "",
    hasInput: state.hasInput,
    localValidationMessage,
    isDisabled: resolvedDisabled,
    isReadOnly: resolvedReadOnly,
    isRequired,
    isInvalid,
    labelledBy: ariaLabelledby,
    describedBy: ariaDescribedby,
    ariaLabel,
    onBlur,
    groupRef,
    forwardedRef: ref,
  });
  handleStateChangeRef.current = bindings.handleStateChange;

  return (
    <div data-slot="date-field" className={cn("astw:relative", className)}>
      <input
        ref={bindings.proxyRef}
        id={bindings.controlId}
        name={bindings.name}
        tabIndex={-1}
        aria-hidden="true"
        disabled={bindings.isDisabled}
        readOnly={bindings.isReadOnly}
        required={bindings.isRequired}
        value={state.fieldValue?.toString() ?? ""}
        onChange={() => {}}
        onFocus={bindings.focusFirstSegment}
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
        isDisabled={bindings.isDisabled}
        isReadOnly={bindings.isReadOnly}
        isInvalid={bindings.isInvalid}
        isRequired={bindings.isRequired}
        autoFocus={autoFocus}
        ariaLabelledby={bindings.labelledBy}
        ariaLabel={bindings.ariaLabel}
        describedById={bindings.describedBy}
        groupRef={groupRef}
        onGroupFocus={bindings.handleGroupFocus}
        onGroupBlur={bindings.handleGroupBlur}
      />
    </div>
  );
}) as <T extends DateValue = DateValue>(
  props: DateFieldProps<T> & { ref?: Ref<HTMLInputElement> },
) => ReactElement;

/**
 * A date/time input with a popover calendar.
 *
 * Compose with `Field.Root` for label / description / error presentation, or
 * provide standalone ARIA wiring yourself.
 */
const DatePicker = forwardRef(function DatePicker<T extends DateValue = DateValue>(
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
  ref: ForwardedRef<HTMLInputElement>,
) {
  const fieldRoot = useFieldRootContext();
  const { locale: shellLocale } = useResolvedLocale();
  const shellTz = useTimeZone();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedTz = timeZoneProp ?? shellTz.value;
  const resolvedDisabled = fieldRoot.disabled || !!isDisabled;
  const resolvedReadOnly = !!isReadOnly;
  const t = useDateFieldT();

  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hasFocusWithinRef = useRef(false);
  const handleStateChangeRef = useRef<(change: DateFieldStateChange) => void>(() => {});
  const [val, setVal] = useControlledState<DateValue | null>(
    value,
    defaultValue ?? null,
    onChange as (v: DateValue | null) => void,
  );

  const fieldState = useDateFieldState({
    value: val,
    onChange: setVal,
    onStateChange: (change) => handleStateChangeRef.current(change),
    granularity,
    locale: resolvedLocale,
    timeZone: resolvedTz,
    hourCycle,
    placeholderValue,
    minValue,
    maxValue,
    isDateUnavailable,
    firstDayOfWeek,
    isReadOnly: resolvedReadOnly,
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
    isDisabled: resolvedDisabled,
    isReadOnly: resolvedReadOnly,
    firstDayOfWeek,
    locale: resolvedLocale,
    timeZone: resolvedTz,
  });

  const localValidationMessage = useMemo(() => {
    const key = invalidMessageKey(fieldState.invalidReason);
    return key ? t(key) : undefined;
  }, [fieldState.invalidReason, t]);
  const bindings = useDateFieldFieldBridge({
    id,
    name,
    inputValue: fieldState.fieldValue?.toString() ?? "",
    hasInput: fieldState.hasInput,
    localValidationMessage,
    isDisabled: resolvedDisabled,
    isReadOnly: resolvedReadOnly,
    isRequired,
    isInvalid,
    labelledBy: ariaLabelledby,
    describedBy: ariaDescribedby,
    ariaLabel,
    onBlur,
    groupRef: fieldRef,
    forwardedRef: ref,
  });
  handleStateChangeRef.current = bindings.handleStateChange;

  const handleCompositeFocus = useCallback(() => {
    hasFocusWithinRef.current = true;
    bindings.handleGroupFocus();
  }, [bindings]);

  const handleCompositeBlur = useCallback(() => {
    if (!hasFocusWithinRef.current) return;
    hasFocusWithinRef.current = false;
    bindings.handleGroupBlur();
  }, [bindings]);

  const handleGroupBlur = useCallback(
    (nextFocused: EventTarget | null) => {
      if (isTargetWithin(nextFocused, popupRef)) return;
      handleCompositeBlur();
    },
    [handleCompositeBlur],
  );

  const handlePopupBlur = useCallback(
    (nextFocused: EventTarget | null) => {
      if (isTargetWithin(nextFocused, fieldRef) || isTargetWithin(nextFocused, popupRef)) return;
      handleCompositeBlur();
    },
    [handleCompositeBlur],
  );

  let popoverAriaLabel: string | undefined;
  if (bindings.labelledBy == null) {
    popoverAriaLabel = ariaLabel ? t("chooseDateFor", { name: ariaLabel }) : t("chooseDate");
  }

  return (
    <div data-slot="date-picker" className={cn("astw:relative", className)}>
      <input
        ref={bindings.proxyRef}
        id={bindings.controlId}
        name={bindings.name}
        tabIndex={-1}
        aria-hidden="true"
        disabled={bindings.isDisabled}
        readOnly={bindings.isReadOnly}
        required={bindings.isRequired}
        value={fieldState.fieldValue?.toString() ?? ""}
        onChange={() => {}}
        onFocus={bindings.focusFirstSegment}
        className="astw:pointer-events-none astw:absolute astw:size-px astw:overflow-hidden astw:opacity-0"
      />
      <DatePopover
        open={open}
        onOpenChange={setOpen}
        ariaLabel={popoverAriaLabel}
        ariaLabelledby={bindings.labelledBy}
        popupRef={popupRef}
        onPopupBlur={handlePopupBlur}
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
            isDisabled={bindings.isDisabled}
            isReadOnly={bindings.isReadOnly}
            isInvalid={bindings.isInvalid}
            isRequired={bindings.isRequired}
            autoFocus={autoFocus}
            ariaLabelledby={bindings.labelledBy}
            ariaLabel={bindings.ariaLabel}
            describedById={bindings.describedBy}
            groupRef={fieldRef}
            trigger={<DatePickerPopoverTrigger disabled={bindings.isDisabled} />}
            onGroupFocus={handleCompositeFocus}
            onGroupBlur={handleGroupBlur}
          />
        }
      >
        <CalendarView
          state={calState}
          ariaLabel={bindings.labelledBy ? undefined : (ariaLabel ?? t("calendar"))}
          ariaLabelledBy={bindings.labelledBy}
          inPopover
        />
      </DatePopover>
    </div>
  );
}) as <T extends DateValue = DateValue>(
  props: DatePickerProps<T> & { ref?: Ref<HTMLInputElement> },
) => ReactElement;

export { DateField, DatePicker };
export type { DateControlProps };
