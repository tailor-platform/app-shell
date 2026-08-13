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
import type { FieldValidityData } from "@base-ui/react/field";
import { DEFAULT_VALIDITY_STATE } from "@base-ui/react/internals/field-constants";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useRegisterFieldControl } from "@base-ui/react/internals/field-register-control";
import { useFormContext } from "@base-ui/react/internals/form-context";
import { useLabelableContext, useLabelableId } from "@base-ui/react/internals/labelable-provider";
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

/**
 * Public date controls.
 *
 * These are standalone composite widgets built on plain accessible markup and a
 * proxy input for form value / native validity. Inside `Field.Root`, they also
 * register with Base UI's label, description, and validation plumbing.
 */

function invalidMessageKey(
  reason: "range" | "unavailable" | null | undefined,
): "dateUnavailable" | "dateOutOfRange" | null {
  if (reason === "unavailable") return "dateUnavailable";
  if (reason === "range") return "dateOutOfRange";
  return null;
}

function joinIds(...ids: Array<string | null | undefined | false>) {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

function isTargetWithin(
  target: EventTarget | null,
  ref: RefObject<HTMLElement | null>,
): target is Node {
  return target instanceof Node && ref.current?.contains(target) === true;
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

interface DateFieldA11yLabelingOptions {
  id?: string;
  name?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  proxyRef: RefObject<HTMLInputElement | null>;
}

interface DateFieldFieldBridgeOptions {
  id?: string;
  name?: string;
  inputValue: string;
  hasInput: boolean;
  localValidationMessage?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  onBlur?: () => void;
  groupRef: RefObject<HTMLDivElement | null>;
  forwardedRef?: Ref<HTMLInputElement>;
}

interface DateFieldProxyInputOptions {
  inputValue: string;
  localValidationMessage?: string;
  groupRef: RefObject<HTMLDivElement | null>;
  forwardedRef?: Ref<HTMLInputElement>;
  validationInputRef: RefObject<HTMLInputElement | null>;
}

interface DateFieldProxyInputState {
  inputValue: string;
  localValidationMessage?: string;
}

interface DateFieldBridgeState extends DateFieldProxyInputState {
  hasInput: boolean;
}

/**
 * Resolve the labeling/accessibility contract for the date widgets.
 *
 * The visible control is not a native `<input>`; it is a `role="group"` with
 * per-segment `role="spinbutton"` children plus a hidden proxy input. This hook
 * answers the “what should this control be called and described by?” part of the
 * problem by merging three sources of metadata into one small object:
 *
 * - explicit props passed to `DateField` / `DatePicker`
 * - `Field.Root` / `Field.Label` / `Field.Description` / `Field.Error` context
 * - the generated control id used by Base UI's labelable system
 *
 * Concretely it computes:
 * - the control id that labels point at
 * - the effective field `name`
 * - merged `aria-labelledby` and `aria-describedby` ids
 * - the externally-derived invalid state coming from `Field.Root`
 *
 * Deliberately, this hook does **not** touch DOM nodes, register form fields, or
 * run validation. It is the narrow “A11y + labeling metadata” layer that the
 * heavier field/form bridge builds on top of.
 */
function useDateFieldA11yLabeling({
  id: idProp,
  name: nameProp,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  labelledBy: labelledByProp,
  describedBy: describedByProp,
  ariaLabel,
  proxyRef,
}: DateFieldA11yLabelingOptions) {
  const fieldRoot = useFieldRootContext();
  const { labelId, messageIds } = useLabelableContext();
  const controlId = useLabelableId({ id: idProp, controlRef: proxyRef });
  const name = fieldRoot.name ?? nameProp;
  const externalInvalid = fieldRoot.state.valid === false;

  return {
    controlId,
    name,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid: !!externalInvalid || !!isInvalid,
    labelledBy: joinIds(labelledByProp, labelId),
    describedBy: joinIds(describedByProp, ...messageIds),
    ariaLabel,
  };
}

/**
 * Own the hidden proxy input that backs the composite date widget.
 *
 * The visible date UI is a segmented `role="group"`, but form systems and the
 * browser's validity APIs still need a real `<input>`. This hook centralizes the
 * DOM-level work for that hidden proxy input:
 *
 * - keep the current serialized value and `setCustomValidity()` message in sync
 * - attach the proxy node to Base UI's validation input ref
 * - forward the proxy node through the component ref
 * - provide a helper that focuses the first visible date segment when the proxy
 *   input receives focus from a label or form logic
 *
 * Importantly, this hook does not know about `Field.Root`, dirty/touched state,
 * or form registration. It is only the DOM bridge for the backing input so the
 * field/form adapter can stay focused on higher-level state integration.
 */
function useDateFieldProxyInput({
  inputValue,
  localValidationMessage,
  groupRef,
  forwardedRef,
  validationInputRef,
}: DateFieldProxyInputOptions) {
  const proxyRef = useRef<HTMLInputElement>(null);

  const syncProxyInput = useCallback(
    (
      snapshot: DateFieldProxyInputState = {
        inputValue,
        localValidationMessage,
      },
      node: HTMLInputElement | null = proxyRef.current,
    ) => {
      if (!node) return;
      if (node.value !== snapshot.inputValue) node.value = snapshot.inputValue;
      node.setCustomValidity(snapshot.localValidationMessage ?? "");
    },
    [inputValue, localValidationMessage],
  );

  const setProxyState = useCallback(
    (snapshot: DateFieldProxyInputState) => {
      syncProxyInput(snapshot);
    },
    [syncProxyInput],
  );

  const setProxyRef = useCallback(
    (node: HTMLInputElement | null) => {
      proxyRef.current = node;
      validationInputRef.current = node;
      syncProxyInput(undefined, node);
      assignRef(forwardedRef, node);
    },
    [forwardedRef, syncProxyInput, validationInputRef],
  );

  const focusFirstSegment = useCallback(() => {
    const first = groupRef.current?.querySelector<HTMLElement>('[role="spinbutton"]');
    first?.focus();
  }, [groupRef]);

  const getValue = useCallback(() => proxyRef.current?.value ?? inputValue, [inputValue]);

  return {
    proxyRef,
    setProxyRef,
    setProxyState,
    syncProxyInput,
    focusFirstSegment,
    getValue,
  };
}

/**
 * Bridge the date widgets into Base UI's `Field` / `Form` infrastructure.
 *
 * `DateField` and `DatePicker` are composite controls with a hidden proxy input,
 * so Base UI cannot treat them like a normal text input automatically. This hook
 * is the adapter that makes them behave like one field from the form system's
 * perspective.
 *
 * Responsibilities:
 * - register the proxy input as the field control so `Form.onFormSubmit()` and
 *   field-level focus/validation logic can see it
 * - convert date-specific invalid states (range/unavailable) into Base UI
 *   `FieldValidityData` so submit blocking and `Field.Error` work
 * - mirror field state transitions (`filled`, `dirty`, `focused`, `touched`)
 *   into `Field.Root`
 * - clear form errors on user edits and trigger validation on change / blur
 *
 * The hook consumes state transitions emitted by `useDateFieldState` via
 * `handleStateChange()`. That keeps the date engine as the single source of
 * truth and makes the field bridge react to explicit edit/clear/external-sync
 * events instead of inferring them later from effects.
 *
 * `useDateFieldProxyInput()` handles the DOM-facing hidden-input mechanics;
 * this hook stays focused on the form-state contract layered on top of it.
 *
 * One `useEffect` remains intentionally: Base UI creates the form-registry
 * entry after registration, so we replace its `validate` handler once that
 * entry exists.
 */
function useDateFieldFieldBridge({
  id: idProp,
  name: nameProp,
  inputValue,
  hasInput,
  localValidationMessage,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  labelledBy: labelledByProp,
  describedBy: describedByProp,
  ariaLabel,
  onBlur,
  groupRef,
  forwardedRef,
}: DateFieldFieldBridgeOptions) {
  const fieldRoot = useFieldRootContext();
  const { formRef, clearErrors } = useFormContext();
  const t = useDateFieldT();
  const proxyInput = useDateFieldProxyInput({
    inputValue,
    localValidationMessage,
    groupRef,
    forwardedRef,
    validationInputRef: fieldRoot.validation.inputRef,
  });
  const a11y = useDateFieldA11yLabeling({
    id: idProp,
    name: nameProp,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    labelledBy: labelledByProp,
    describedBy: describedByProp,
    ariaLabel,
    proxyRef: proxyInput.proxyRef,
  });

  const bridgeRef = useRef({
    fieldRoot,
    fieldName: nameProp,
    state: {
      inputValue,
      hasInput,
      localValidationMessage,
    } as DateFieldBridgeState,
    nativeValidate: null as (() => void) | null,
  });
  bridgeRef.current.fieldRoot = fieldRoot;
  bridgeRef.current.fieldName = nameProp;
  bridgeRef.current.state = {
    inputValue,
    hasInput,
    localValidationMessage,
  };

  const updateRegisteredValidity = useCallback(
    (nextValidityData: FieldValidityData) => {
      if (!a11y.controlId) return;
      const field = formRef.current.fields.get(a11y.controlId);
      if (!field) return;
      formRef.current.fields.set(a11y.controlId, {
        ...field,
        validityData: nextValidityData,
      });
    },
    [a11y.controlId, formRef],
  );

  const commitLocalValidation = useCallback(
    (snapshot: DateFieldBridgeState = bridgeRef.current.state) => {
      const message = snapshot.localValidationMessage;
      if (!message) return false;

      const root = bridgeRef.current.fieldRoot;
      const nextValidityData: FieldValidityData = {
        value: snapshot.inputValue,
        state: {
          ...DEFAULT_VALIDITY_STATE,
          customError: true,
          valid: false,
        },
        error: message,
        errors: [message],
        initialValue: root.validityData.initialValue,
      };

      root.setValidityData(nextValidityData);
      updateRegisteredValidity(nextValidityData);
      return true;
    },
    [updateRegisteredValidity],
  );

  const wrappedValidateRef = useRef<(() => void) | undefined>(undefined);
  if (!wrappedValidateRef.current) {
    wrappedValidateRef.current = () => {
      const snapshot = bridgeRef.current.state;
      proxyInput.syncProxyInput(snapshot);
      if (commitLocalValidation(snapshot)) return;
      bridgeRef.current.nativeValidate?.();
    };
  }

  useRegisterFieldControl(
    proxyInput.proxyRef,
    a11y.controlId,
    inputValue,
    proxyInput.getValue,
    !a11y.isDisabled,
  );

  // Base UI creates the form-registry entry after control registration, so we
  // replace `field.validate` here once that entry exists.
  useEffect(() => {
    if (!a11y.controlId) return;

    const field = formRef.current.fields.get(a11y.controlId);
    if (!field) return;
    if (field.validate === wrappedValidateRef.current) return;

    bridgeRef.current.nativeValidate = field.validate;
    formRef.current.fields.set(a11y.controlId, {
      ...field,
      validate: wrappedValidateRef.current!,
    });
  });

  const handleStateChange = useCallback(
    ({
      source,
      inputValue: nextInputValue,
      hasInput: nextHasInput,
      invalidReason,
    }: DateFieldStateChange) => {
      const validationKey = invalidMessageKey(invalidReason);
      const snapshot = {
        inputValue: nextInputValue,
        hasInput: nextHasInput,
        localValidationMessage: validationKey ? t(validationKey) : undefined,
      } satisfies DateFieldBridgeState;
      bridgeRef.current.state = snapshot;
      proxyInput.setProxyState(snapshot);

      const root = bridgeRef.current.fieldRoot;
      const initialValue =
        typeof root.validityData.initialValue === "string" ? root.validityData.initialValue : "";

      root.setFilled(snapshot.hasInput);
      root.setDirty(
        snapshot.inputValue !== initialValue || (snapshot.hasInput && snapshot.inputValue === ""),
      );

      if (source === "external") return;

      const fieldName = root.name ?? bridgeRef.current.fieldName;
      if (fieldName) clearErrors(fieldName);
      if (!root.shouldValidateOnChange()) return;
      if (commitLocalValidation(snapshot)) return;
      root.validation.commit(snapshot.inputValue);
    },
    [clearErrors, commitLocalValidation, proxyInput, t],
  );

  const handleGroupFocus = useCallback(() => {
    bridgeRef.current.fieldRoot.setFocused(true);
  }, []);

  const handleGroupBlur = useCallback(() => {
    const root = bridgeRef.current.fieldRoot;
    root.setTouched(true);
    root.setFocused(false);
    onBlur?.();

    if (root.validationMode !== "onBlur") return;
    proxyInput.syncProxyInput();
    if (commitLocalValidation()) return;
    root.validation.commit(bridgeRef.current.state.inputValue);
  }, [commitLocalValidation, onBlur, proxyInput]);

  return {
    ...a11y,
    isInvalid: a11y.isInvalid || !!localValidationMessage,
    proxyRef: proxyInput.setProxyRef,
    focusFirstSegment: proxyInput.focusFirstSegment,
    handleGroupFocus,
    handleGroupBlur,
    handleStateChange,
  };
}

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
    isDateUnavailable: isDateUnavailable as ((date: DateValue) => boolean) | undefined,
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
    isDateUnavailable: isDateUnavailable as ((date: DateValue) => boolean) | undefined,
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
    isDateUnavailable: isDateUnavailable as ((date: DateValue) => boolean) | undefined,
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
