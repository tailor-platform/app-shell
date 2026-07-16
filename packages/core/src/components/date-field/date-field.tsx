import * as React from "react";
import type { DateValue } from "@internationalized/date";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useRegisterFieldControl } from "@base-ui/react/internals/field-register-control";
import { useLabelableContext, useLabelableId } from "@base-ui/react/internals/labelable-provider";
import { cn } from "@/lib/utils";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import { useDateFieldState, type Granularity, type HourCycle } from "./use-date-field-state";
import { useCalendarState, type FirstDayOfWeek } from "../calendar/use-calendar-state";
import { CalendarView } from "../calendar/calendar-view";
import { DateInputGroup, DatePopover, DatePickerPopoverTrigger } from "./date-input-group";
import { useDateFieldT } from "./i18n";

/**
 * Public, control-first date components.
 *
 * Like Select / Combobox / Autocomplete, these own value entry + interaction,
 * and compose with Field.Root for label / description / error presentation.
 */

type DateControlMode = "editable" | "readonly" | "disabled";

interface DateConstraints<T extends DateValue> {
  required?: true;
  min?: DateValue;
  max?: DateValue;
  unavailable?: (date: T) => boolean;
}

function joinIds(...ids: Array<string | null | undefined | false>) {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

// Small controlled-state helper.
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
  constraints?: DateConstraints<T>;
  mode?: DateControlMode;
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
  /** BCP-47 locale override; defaults to the AppShell formatting locale. */
  locale?: string;
}

export type DateFieldProps<T extends DateValue = DateValue> = DateControlProps<T>;

export type DatePickerProps<T extends DateValue = DateValue> = DateControlProps<T> & {
  /** IANA timezone; defaults to the AppShell `timeZone`. */
  timeZone?: string;
};

interface DateFieldA11yOptions {
  id?: string;
  name?: string;
  mode?: DateControlMode;
  fieldValue: string;
  hasInput: boolean;
  localInvalid: boolean;
  labelledBy?: string;
  ariaLabel?: string;
  onBlur?: () => void;
  groupRef: React.RefObject<HTMLDivElement | null>;
  forwardedRef?: React.Ref<HTMLInputElement>;
}

function useDateFieldA11y({
  id: idProp,
  name: nameProp,
  mode,
  fieldValue,
  hasInput,
  localInvalid,
  labelledBy: labelledByProp,
  ariaLabel,
  onBlur,
  groupRef,
  forwardedRef,
}: DateFieldA11yOptions) {
  const fieldRoot = useFieldRootContext();
  const { labelId, messageIds } = useLabelableContext();
  const proxyRef = React.useRef<HTMLInputElement>(null);
  const controlId = useLabelableId({ id: idProp, controlRef: proxyRef });

  useRegisterFieldControl(proxyRef, controlId, fieldValue, () => proxyRef.current?.value ?? "");

  const setProxyRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      proxyRef.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  const focusFirstSegment = React.useCallback(() => {
    const first = groupRef.current?.querySelector<HTMLElement>('[role="spinbutton"]');
    first?.focus();
  }, [groupRef]);

  const name = fieldRoot?.name ?? nameProp;
  const isDisabled = fieldRoot?.disabled || mode === "disabled";
  const isReadOnly = mode === "readonly";
  const externalInvalid = fieldRoot?.state.valid === false;
  const derivedInvalid = !!externalInvalid || localInvalid;
  const labelledBy = joinIds(labelledByProp, labelId);
  const describedBy = joinIds(...messageIds);
  const initialValue =
    typeof fieldRoot?.validityData.initialValue === "string"
      ? fieldRoot.validityData.initialValue
      : "";

  React.useEffect(() => {
    fieldRoot?.setFilled(hasInput);
    fieldRoot?.setDirty(fieldValue !== initialValue || (hasInput && fieldValue === ""));

    if (!fieldRoot?.shouldValidateOnChange()) return;
    queueMicrotask(() => {
      fieldRoot.validation.commit(proxyRef.current?.value ?? "");
    });
  }, [fieldRoot, hasInput, fieldValue, initialValue]);

  const handleGroupFocus = React.useCallback(() => {
    fieldRoot?.setFocused(true);
  }, [fieldRoot]);

  const handleGroupBlur = React.useCallback(() => {
    fieldRoot?.setTouched(true);
    fieldRoot?.setFocused(false);
    onBlur?.();

    if (fieldRoot?.validationMode !== "onBlur") return;
    queueMicrotask(() => {
      fieldRoot.validation.commit(proxyRef.current?.value ?? "");
    });
  }, [fieldRoot, onBlur]);

  return {
    controlId,
    name,
    isDisabled,
    isReadOnly,
    isInvalid: derivedInvalid,
    labelledBy,
    describedBy,
    proxyRef: setProxyRef,
    focusFirstSegment,
    handleGroupFocus,
    handleGroupBlur,
    ariaLabel,
  };
}

/**
 * A segmented date/time input field with no popover.
 *
 * Compose with `Field.Root` for label / description / error presentation, or
 * provide `aria-label` / `aria-labelledby` for standalone usage.
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
    constraints,
    mode,
    hourCycle,
    placeholderValue,
    autoFocus,
    firstDayOfWeek,
    name,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
  }: DateFieldProps<T>,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const { locale: shellLocale } = useResolvedLocale();
  const resolvedLocale = localeProp ?? shellLocale;
  const groupRef = React.useRef<HTMLDivElement>(null);

  const state = useDateFieldState({
    value,
    defaultValue,
    onChange: onChange as (v: DateValue | null) => void,
    granularity,
    locale: resolvedLocale,
    hourCycle,
    placeholderValue,
    minValue: constraints?.min,
    maxValue: constraints?.max,
    isDateUnavailable: constraints?.unavailable as ((date: DateValue) => boolean) | undefined,
    firstDayOfWeek,
    isReadOnly: mode === "readonly",
  });

  const hasInput = React.useMemo(
    () => state.segments.some((segment) => segment.isEditable && !segment.isPlaceholder),
    [state.segments],
  );
  const bindings = useDateFieldA11y({
    id,
    name,
    mode,
    fieldValue: state.fieldValue?.toString() ?? "",
    hasInput,
    localInvalid: state.isInvalid,
    labelledBy: ariaLabelledby,
    ariaLabel,
    onBlur,
    groupRef,
    forwardedRef: ref,
  });

  return (
    <div data-slot="date-field" className={cn("astw:relative", className)}>
      <input
        ref={bindings.proxyRef}
        id={bindings.controlId}
        name={bindings.name}
        tabIndex={-1}
        readOnly
        aria-hidden="true"
        value={state.fieldValue?.toString() ?? ""}
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
        isRequired={constraints?.required}
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
  props: DateFieldProps<T> & { ref?: React.Ref<HTMLInputElement> },
) => React.ReactElement;

/**
 * A date/time input with a popover calendar.
 *
 * Compose with `Field.Root` for label / description / error presentation, or
 * provide `aria-label` / `aria-labelledby` for standalone usage.
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
    constraints,
    mode,
    hourCycle,
    placeholderValue,
    autoFocus,
    firstDayOfWeek,
    name,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
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
    minValue: constraints?.min,
    maxValue: constraints?.max,
    isDateUnavailable: constraints?.unavailable as ((date: DateValue) => boolean) | undefined,
    firstDayOfWeek,
    isReadOnly: mode === "readonly",
  });

  const calState = useCalendarState({
    value: val,
    onChange: (d) => {
      setVal(d);
      setOpen(false);
    },
    minValue: constraints?.min,
    maxValue: constraints?.max,
    isDateUnavailable: constraints?.unavailable as ((date: DateValue) => boolean) | undefined,
    isDisabled: mode === "disabled",
    isReadOnly: mode === "readonly",
    firstDayOfWeek,
    locale: resolvedLocale,
    timeZone: resolvedTz,
  });

  const hasInput = React.useMemo(
    () => fieldState.segments.some((segment) => segment.isEditable && !segment.isPlaceholder),
    [fieldState.segments],
  );
  const bindings = useDateFieldA11y({
    id,
    name,
    mode,
    fieldValue: fieldState.fieldValue?.toString() ?? "",
    hasInput,
    localInvalid: fieldState.isInvalid,
    labelledBy: ariaLabelledby,
    ariaLabel,
    onBlur,
    groupRef: fieldRef,
    forwardedRef: ref,
  });

  return (
    <div data-slot="date-picker" className={cn("astw:relative", className)}>
      <input
        ref={bindings.proxyRef}
        id={bindings.controlId}
        name={bindings.name}
        tabIndex={-1}
        readOnly
        aria-hidden="true"
        value={fieldState.fieldValue?.toString() ?? ""}
        onFocus={bindings.focusFirstSegment}
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
            isDisabled={bindings.isDisabled}
            isReadOnly={bindings.isReadOnly}
            isInvalid={bindings.isInvalid}
            isRequired={constraints?.required}
            autoFocus={autoFocus}
            ariaLabelledby={bindings.labelledBy}
            ariaLabel={bindings.ariaLabel}
            describedById={bindings.describedBy}
            groupRef={fieldRef}
            trigger={<DatePickerPopoverTrigger disabled={bindings.isDisabled} />}
            onGroupFocus={bindings.handleGroupFocus}
            onGroupBlur={bindings.handleGroupBlur}
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
