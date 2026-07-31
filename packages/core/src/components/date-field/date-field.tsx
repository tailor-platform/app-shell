import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type Ref,
  type RefObject,
} from "react";
import type { DateValue } from "@internationalized/date";
import { useRegisterFieldControl } from "@base-ui/react/internals/field-register-control";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useFormContext } from "@base-ui/react/internals/form-context";
import {
  useAriaLabelledBy,
  useLabelableContext,
  useLabelableId,
} from "@base-ui/react/internals/labelable-provider";
import { cn } from "@/lib/utils";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import {
  useDateFieldState,
  type Granularity,
  type HourCycle,
  type Segment,
} from "./use-date-field-state";
import { useCalendarState, type FirstDayOfWeek } from "../calendar/use-calendar-state";
import { CalendarView } from "../calendar/calendar-view";
import { DateInputGroup, DatePopover, DatePickerPopoverTrigger } from "./date-input-group";
import { useDateFieldT } from "./i18n";

/**
 * Public date controls.
 *
 * These are standalone composite widgets built from plain accessible markup:
 * the visible UI is a `role="group"` containing segment-level
 * `role="spinbutton"` elements rather than a single native `<input>`.
 *
 * Because of that, they also render a hidden **proxy input**.
 *
 * What the proxy input is:
 * - a real `<input>` that mirrors the composed date value as a string
 * - visually hidden and not used for direct text entry
 * - the native form/validation anchor that the composite widget can delegate to
 *
 * Why it exists:
 * - native form submission expects a real form control with `name` / `value`
 * - browser validity APIs such as `setCustomValidity()` only exist on native
 *   form controls
 * - `<label htmlFor>` and Base UI's `Field` / `Form` infrastructure need a
 *   concrete control element to point at / register
 * - native validation bubbles should anchor near the date widget rather than at
 *   some unrelated off-screen element
 *
 * When rendered inside `Field.Root`, the proxy input is also bridged into Base
 * UI's field/form wiring so `Field.Label`, `Field.Description`, `Field.Error`,
 * and form error routing work the same way they do for the other AppShell form
 * controls.
 */

function invalidMessageKey(
  reason: "range" | "unavailable" | null | undefined,
): "dateUnavailable" | "dateOutOfRange" | null {
  if (reason === "unavailable") return "dateUnavailable";
  if (reason === "range") return "dateOutOfRange";
  return null;
}

function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

/**
 * Produces the ref callback used by the hidden proxy input.
 *
 * The proxy input has two distinct consumers:
 * - Base UI field/form internals, which need the DOM node to register the
 *   control, run validation, and focus it from `Field.Label`
 * - the component's forwarded `ref`, so consumers can still receive the input
 *   element exposed by `DateField` / `DatePicker`
 *
 * It also applies the current custom validity message to the DOM node via
 * `setCustomValidity()`. That imperative step must happen on the actual
 * `<input>` element; it cannot be expressed declaratively in JSX props.
 *
 * In short: this hook is the small piece that turns the hidden input from
 * "just some DOM node" into the date widget's native form/validation bridge.
 */
function useProxyInputRef(
  fieldRef: Ref<HTMLInputElement> | undefined,
  forwardedRef: Ref<HTMLInputElement> | undefined,
  customValidity: string,
) {
  return useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.setCustomValidity(customValidity);
      assignRef(fieldRef, node);
      assignRef(forwardedRef, node);
    },
    [customValidity, fieldRef, forwardedRef],
  );
}

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

function isSameDateValue(a: DateValue | null | undefined, b: DateValue | null | undefined) {
  if (a == null || b == null) return a == null && b == null;
  return a.compare(b as never) === 0;
}

function isTargetWithin(
  target: EventTarget | null,
  ref: RefObject<HTMLElement | null>,
): target is Node {
  return target instanceof Node && ref.current?.contains(target) === true;
}

interface DateFieldBridgeOptions {
  id?: string;
  name?: string;
  value: DateValue | null;
  hasValue: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  customValidity: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Adapts the standalone date widgets to Base UI's `Field` / `Form` contract.
 *
 * Why this exists:
 * - `DateField` / `DatePicker` are hand-rolled composite widgets made of a
 *   labelled `role="group"` plus per-segment `role="spinbutton"` elements.
 * - Base UI's form ecosystem (`Field.Root`, `Field.Label`, `Field.Description`,
 *   `Field.Error`, `Form`) is built around a *registered control* that exposes
 *   an id, name, ref, value, validation lifecycle, and field state updates.
 * - The date widgets already render a hidden proxy `<input>` for native form
 *   submission and validity bubbles, but without this bridge that input is just
 *   a DOM detail — Base UI wouldn't know to associate labels/descriptions with
 *   it, treat it as the field's control, or drive dirty/touched/focused state.
 *
 * What this hook does:
 * - resolves the effective control `id` / `name`
 * - derives `aria-labelledby` / `aria-describedby` from Base UI's labelable
 *   context so `Field.Label` / `Field.Description` / `Field.Error` work
 * - registers the hidden proxy input as the field control via
 *   `useRegisterFieldControl`
 * - mirrors Base UI field state onto the visual date group (`disabled`,
 *   `invalid`) so styling and accessibility stay in sync
 * - updates form state (`filled`, `dirty`, `focused`, `touched`) and triggers
 *   validation / server-error clearing on change and blur
 *
 * Standalone safety:
 * Base UI's internals fall back to inert default contexts outside `Field.Root`
 * / `Form`, so this hook becomes a no-op bridge and the date widgets continue
 * to work as plain standalone controls.
 *
 * We keep all Base UI internals usage here so the dependency surface is narrow:
 * if Base UI changes these internals in the future, this is the one place to
 * adjust rather than spreading the coupling throughout both date components.
 */
function useDateFieldFieldBridge({
  id: idProp,
  name: nameProp,
  value,
  hasValue,
  isDisabled,
  isInvalid,
  customValidity,
  "aria-labelledby": ariaLabelledbyProp,
  "aria-describedby": ariaDescribedbyProp,
  ref,
}: DateFieldBridgeOptions) {
  const { clearErrors, errors } = useFormContext();
  const {
    name: fieldName,
    disabled: fieldDisabled,
    invalid: fieldInvalid,
    state: fieldState,
    validityData,
    setTouched,
    setDirty,
    setFilled,
    setFocused,
    validationMode,
    validation,
    shouldValidateOnChange,
  } = useFieldRootContext();
  const { labelId, messageIds } = useLabelableContext();

  const needsRegisteredId = idProp != null || fieldName != null || labelId != null;
  const generatedId = useLabelableId({ id: idProp });
  const id = needsRegisteredId ? generatedId : idProp;
  const ariaLabelledby = useAriaLabelledBy(
    ariaLabelledbyProp,
    labelId,
    validation.inputRef,
    true,
    id,
  );
  const describedById = [ariaDescribedbyProp, ...messageIds].filter(Boolean).join(" ") || undefined;

  const resolvedDisabled = fieldDisabled || isDisabled;
  const resolvedName = fieldName ?? nameProp;
  const hasFormError =
    !!resolvedName && Object.hasOwn(errors, resolvedName) && errors[resolvedName] !== undefined;
  const resolvedInvalid =
    !!isInvalid || fieldInvalid === true || fieldState.valid === false || hasFormError;

  const setProxyRef = useProxyInputRef(validation.inputRef, ref, customValidity);
  const getFormValue = useCallback(() => value?.toString() ?? "", [value]);
  useRegisterFieldControl(validation.inputRef, id, value, getFormValue, id != null);

  const latestValueRef = useRef<DateValue | null>(value);
  latestValueRef.current = value;

  const didMountRef = useRef(false);
  const pendingBlurValidationRef = useRef(false);

  useEffect(() => {
    const initialValue = validityData.initialValue as DateValue | null;
    const isDirty =
      value != null && initialValue != null
        ? !isSameDateValue(value, initialValue)
        : hasValue || initialValue != null;

    setFilled(hasValue);
    setDirty(isDirty);

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (resolvedName) clearErrors(resolvedName);

    if (pendingBlurValidationRef.current) {
      pendingBlurValidationRef.current = false;
      validation.commit(latestValueRef.current);
      return;
    }

    if (shouldValidateOnChange() && (value != null || !hasValue)) {
      validation.commit(latestValueRef.current);
    }
  }, [
    clearErrors,
    hasValue,
    resolvedName,
    setDirty,
    setFilled,
    shouldValidateOnChange,
    validation,
    validityData.initialValue,
    value,
  ]);

  const handleGroupFocus = useCallback(() => {
    setFocused(true);
  }, [setFocused]);

  const handleGroupBlur = useCallback(() => {
    setTouched(true);
    setFocused(false);

    if (validationMode === "onBlur") {
      pendingBlurValidationRef.current = true;
      queueMicrotask(() => {
        if (!pendingBlurValidationRef.current) return;
        pendingBlurValidationRef.current = false;
        validation.commit(latestValueRef.current);
      });
    }
  }, [setFocused, setTouched, validation, validationMode]);

  return {
    id,
    name: resolvedName,
    isDisabled: resolvedDisabled,
    isInvalid: resolvedInvalid,
    ariaLabelledby,
    describedById,
    setProxyRef,
    onGroupFocus: handleGroupFocus,
    onGroupBlur: handleGroupBlur,
  };
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

function hasSegmentValue(segments: Segment[]) {
  return segments.some((segment) => segment.type !== "literal" && !segment.isPlaceholder);
}

/**
 * A segmented date/time input field with no popover.
 *
 * Provide an accessible name with `aria-label` or `aria-labelledby`. When used
 * inside `Field.Root`, `Field.Label` / `Field.Description` / `Field.Error`
 * wiring is automatic.
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
  const { locale: shellLocale } = useResolvedLocale();
  const resolvedLocale = localeProp ?? shellLocale;
  const groupRef = useRef<HTMLDivElement>(null);
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

  const localValidationMessage = useMemo(() => {
    const key = invalidMessageKey(state.invalidReason);
    return key ? t(key) : "";
  }, [state.invalidReason, t]);

  const bridge = useDateFieldFieldBridge({
    id,
    name,
    value: state.fieldValue,
    hasValue: hasSegmentValue(state.segments),
    isDisabled,
    isInvalid: !!isInvalid || !!localValidationMessage,
    customValidity: localValidationMessage,
    ref,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
  });

  const focusFirstSegment = useCallback(() => {
    const first = groupRef.current?.querySelector<HTMLElement>('[role="spinbutton"]');
    first?.focus();
  }, []);

  return (
    <div data-slot="date-field" className={cn("astw:relative", className)}>
      {/*
        Hidden proxy input:
        - carries the serialized form value
        - receives native/custom validity
        - is the target for external labels / Base UI Field wiring
        - forwards focus into the first visible date segment
      */}
      <input
        ref={bridge.setProxyRef}
        id={bridge.id}
        name={bridge.name}
        tabIndex={-1}
        aria-hidden="true"
        disabled={bridge.isDisabled}
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
        isDisabled={bridge.isDisabled}
        isReadOnly={isReadOnly}
        isInvalid={bridge.isInvalid}
        isRequired={isRequired}
        autoFocus={autoFocus}
        ariaLabelledby={bridge.ariaLabelledby}
        ariaLabel={ariaLabel}
        describedById={bridge.describedById}
        groupRef={groupRef}
        onGroupFocus={bridge.onGroupFocus}
        onGroupBlur={() => {
          bridge.onGroupBlur();
          onBlur?.();
        }}
      />
    </div>
  );
}) as <T extends DateValue = DateValue>(
  props: DateFieldProps<T> & { ref?: Ref<HTMLInputElement> },
) => ReactElement;

/**
 * A date/time input with a popover calendar.
 *
 * Provide an accessible name with `aria-label` or `aria-labelledby`. When used
 * inside `Field.Root`, `Field.Label` / `Field.Description` / `Field.Error`
 * wiring is automatic.
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
  const { locale: shellLocale } = useResolvedLocale();
  const shellTz = useTimeZone();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedTz = timeZoneProp ?? shellTz.value;
  const t = useDateFieldT();

  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hasFocusWithinRef = useRef(false);
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

  const localValidationMessage = useMemo(() => {
    const key = invalidMessageKey(fieldState.invalidReason);
    return key ? t(key) : "";
  }, [fieldState.invalidReason, t]);

  const bridge = useDateFieldFieldBridge({
    id,
    name,
    value: fieldState.fieldValue,
    hasValue: hasSegmentValue(fieldState.segments),
    isDisabled,
    isInvalid: !!isInvalid || !!localValidationMessage,
    customValidity: localValidationMessage,
    ref,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
  });

  const focusFirstSegment = useCallback(() => {
    const first = fieldRef.current?.querySelector<HTMLElement>('[role="spinbutton"]');
    first?.focus();
  }, []);

  const handleCompositeFocus = useCallback(() => {
    hasFocusWithinRef.current = true;
    bridge.onGroupFocus();
  }, [bridge]);

  const handleCompositeBlur = useCallback(() => {
    if (!hasFocusWithinRef.current) return;
    hasFocusWithinRef.current = false;
    bridge.onGroupBlur();
    onBlur?.();
  }, [bridge, onBlur]);

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

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) return;
      queueMicrotask(() => {
        if (isTargetWithin(document.activeElement, fieldRef)) return;
        if (isTargetWithin(document.activeElement, popupRef)) return;
        handleCompositeBlur();
      });
    },
    [handleCompositeBlur],
  );

  const calState = useCalendarState({
    value: val,
    onChange: (d) => {
      setVal(d);
      handleOpenChange(false);
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

  return (
    <div data-slot="date-picker" className={cn("astw:relative", className)}>
      {/*
        Hidden proxy input:
        - carries the serialized form value
        - receives native/custom validity
        - is the target for external labels / Base UI Field wiring
        - forwards focus into the first visible date segment
      */}
      <input
        ref={bridge.setProxyRef}
        id={bridge.id}
        name={bridge.name}
        tabIndex={-1}
        aria-hidden="true"
        disabled={bridge.isDisabled}
        readOnly={isReadOnly}
        required={isRequired}
        value={fieldState.fieldValue?.toString() ?? ""}
        onChange={() => {}}
        onFocus={focusFirstSegment}
        className="astw:pointer-events-none astw:absolute astw:size-px astw:overflow-hidden astw:opacity-0"
      />
      <DatePopover
        open={open}
        onOpenChange={handleOpenChange}
        ariaLabel={
          bridge.ariaLabelledby
            ? undefined
            : ariaLabel
              ? t("chooseDateFor", { name: ariaLabel })
              : t("chooseDate")
        }
        ariaLabelledby={bridge.ariaLabelledby}
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
            onOpenCalendar={() => handleOpenChange(true)}
            isDisabled={bridge.isDisabled}
            isReadOnly={isReadOnly}
            isInvalid={bridge.isInvalid}
            isRequired={isRequired}
            autoFocus={autoFocus}
            ariaLabelledby={bridge.ariaLabelledby}
            ariaLabel={ariaLabel}
            describedById={bridge.describedById}
            groupRef={fieldRef}
            trigger={<DatePickerPopoverTrigger disabled={bridge.isDisabled} />}
            onGroupFocus={handleCompositeFocus}
            onGroupBlur={handleGroupBlur}
          />
        }
      >
        <CalendarView
          state={calState}
          ariaLabel={bridge.ariaLabelledby ? undefined : (ariaLabel ?? t("calendar"))}
          ariaLabelledBy={bridge.ariaLabelledby}
          inPopover
        />
      </DatePopover>
    </div>
  );
}) as <T extends DateValue = DateValue>(
  props: DatePickerProps<T> & { ref?: Ref<HTMLInputElement> },
) => ReactElement;

export { DateField, DatePicker };
