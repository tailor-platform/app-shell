import { useCallback, useEffect, useRef, useState, type Ref, type RefObject } from "react";
import type { FieldValidityData } from "@base-ui/react/field";
import { DEFAULT_VALIDITY_STATE } from "@base-ui/react/internals/field-constants";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useRegisterFieldControl } from "@base-ui/react/internals/field-register-control";
import { useFormContext } from "@base-ui/react/internals/form-context";
import { useLabelableContext, useLabelableId } from "@base-ui/react/internals/labelable-provider";
import { useDateFieldT } from "./i18n";
import type { DateFieldInvalidReason, DateFieldStateChange } from "./use-date-field-state";

/**
 * The narrow bridge from the composite date widgets into Base UI's `Field` /
 * `Form` infrastructure. Shared by `DateField`/`DatePicker` (one control) and
 * `DateRangePicker` (one combined proxy over two segment engines), so all
 * coupling to Base UI's internal subpaths lives in exactly one module.
 *
 * Three layered hooks, each documenting what it does NOT do:
 * - `useDateFieldA11yLabeling` — labeling/A11y metadata only; no DOM, no registration.
 * - `useDateFieldProxyInput` — the hidden proxy `<input>` DOM mechanics only.
 * - `useDateFieldFieldBridge` — the form-state contract layered on top.
 */

/** Map a date-specific invalid reason to its built-in i18n message key. */
export function invalidMessageKey(
  reason: DateFieldInvalidReason | null | undefined,
): "dateUnavailable" | "dateOutOfRange" | null {
  if (reason === "unavailable") return "dateUnavailable";
  if (reason === "range") return "dateOutOfRange";
  return null;
}

export function joinIds(...ids: Array<string | null | undefined | false>) {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

export function assignRef<T>(ref: Ref<T | null> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

export function isTargetWithin(
  target: EventTarget | null,
  ref: RefObject<HTMLElement | null>,
): target is Node {
  return target instanceof Node && ref.current?.contains(target) === true;
}

export function useControlledState<V>(
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
 * merges explicit props, `Field.Root`/`Field.Label`/`Field.Description`/
 * `Field.Error` context, and the generated control id into one small object.
 *
 * Deliberately, this hook does **not** touch DOM nodes, register form fields, or
 * run validation.
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
 * Own the hidden proxy input that backs the composite date widget: keep its
 * serialized value + `setCustomValidity()` message in sync, attach it to Base
 * UI's validation input ref, forward it through the component ref, and focus the
 * first visible segment when the proxy receives focus (label click / form logic).
 *
 * Knows nothing of `Field.Root`, dirty/touched state, or form registration.
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
 * Registers the proxy input as the field control (so `Form.onFormSubmit()` and
 * field-level focus/validation see it), converts date-specific invalid states
 * into `FieldValidityData` (so submit blocking + `Field.Error` work), mirrors
 * field-state transitions (`filled`/`dirty`/`focused`/`touched`) into
 * `Field.Root`, and clears form errors on edit.
 *
 * The caller drives it via `handleStateChange()` fed from `useDateFieldState`'s
 * `onStateChange` — or, for the range picker, a synthesized combined change.
 * The change may carry a pre-resolved `localValidationMessage` (used verbatim);
 * otherwise the message is derived from `invalidReason`, so a caller with a
 * cross-field message (e.g. reversed range) controls it directly.
 */
export function useDateFieldFieldBridge({
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

  // Base UI registers / refreshes the field entry from layout effects, so patch
  // the registry after those writes settle whenever that entry's inputs change.
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
  }, [
    a11y.controlId,
    a11y.isDisabled,
    fieldRoot.state.valid,
    fieldRoot.validityData,
    formRef,
    inputValue,
  ]);

  const handleStateChange = useCallback(
    ({
      source,
      inputValue: nextInputValue,
      hasInput: nextHasInput,
      invalidReason,
      localValidationMessage: providedMessage,
    }: DateFieldStateChange) => {
      // A caller-provided message (e.g. the range picker's reversed-range /
      // combined message) wins; otherwise derive from the reason.
      const validationKey = invalidMessageKey(invalidReason);
      const message = providedMessage ?? (validationKey ? t(validationKey) : undefined);
      const snapshot = {
        inputValue: nextInputValue,
        hasInput: nextHasInput,
        localValidationMessage: message,
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
