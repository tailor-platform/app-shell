import * as React from "react";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useRegisterFieldControl } from "@base-ui/react/internals/field-register-control";
import { useFormContext } from "@base-ui/react/internals/form-context";
import { useLabelableContext, useLabelableId } from "@base-ui/react/internals/labelable-provider";
import { assignRef, joinIds } from "@/lib/dom-utils";

/**
 * @internal
 * Bridges Tree into Base UI's `Field` / `Form`, the way the date
 * widgets do (see `use-date-field-bridge.ts`): a hidden, nameless proxy
 * `<input>` is registered as the field control, so `required`, `Field.Error`,
 * dirty/filled/touched state and `Form` submit-blocking all work. The field's
 * value is the array of submitted strings — that's what `Form` and a
 * `Field.Root` `validate` receive. The proxy's DOM value only tells native
 * validation whether anything is selected. The selection itself is submitted
 * through separate hidden inputs (one per value), rendered by the component.
 */

type UseTreeFieldOptions = {
  /** Only a checkbox tree is a form control; otherwise nothing registers with `Field`. */
  enabled: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** The submitted values for the current selection. */
  values: readonly string[];
  ariaLabelledBy?: string;
  onBlur?: () => void;
  rootRef: React.RefObject<HTMLElement | null>;
  inputRef?: React.Ref<HTMLInputElement>;
};

/** A stable string for comparing selections. JSON keeps values containing separators distinct. */
export function serializeValues(values: readonly string[]): string {
  return values.length === 0 ? "" : JSON.stringify(values);
}

export function useTreeField({
  enabled,
  id,
  name,
  disabled,
  values,
  ariaLabelledBy,
  onBlur,
  rootRef,
  inputRef,
}: UseTreeFieldOptions) {
  const fieldRoot = useFieldRootContext();
  const { clearErrors } = useFormContext();
  const { labelId, messageIds } = useLabelableContext();
  const controlId = useLabelableId({ id });
  const isDisabled = !!disabled || !!fieldRoot.disabled;
  const valueKey = serializeValues(values);

  const proxyRef = React.useRef<HTMLInputElement | null>(null);
  const latest = React.useRef({ enabled, fieldRoot, name, onBlur, values });
  latest.current = { enabled, fieldRoot, name, onBlur, values };
  // Base UI only records an initial value for its own controls, so dirty
  // tracking compares against the selection the tree mounted with.
  const initialKey = React.useRef(valueKey);

  const setProxyRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      proxyRef.current = node;
      fieldRoot.validation.inputRef.current = node;
      assignRef(inputRef, node);
    },
    [fieldRoot.validation.inputRef, inputRef],
  );

  const getValue = React.useCallback(() => [...latest.current.values], []);
  useRegisterFieldControl(proxyRef, controlId, valueKey, getValue, enabled && !isDisabled);

  // Keep filled/dirty in step with every value — on mount, after user changes,
  // and when a controlled value changes from outside (e.g. a form reset).
  const { setFilled, setDirty } = fieldRoot;
  React.useLayoutEffect(() => {
    if (!enabled) return;
    setFilled(valueKey !== "");
    setDirty(valueKey !== initialKey.current);
  }, [enabled, setFilled, setDirty, valueKey]);

  /** Call after every user change, with the new submitted values. */
  const handleChange = React.useCallback(
    (nextValues: readonly string[]) => {
      const root = latest.current.fieldRoot;
      latest.current.values = nextValues;
      // Native validity (`required`) reads the DOM value, which React only
      // updates on the next render — sync it now so validation sees the change.
      if (proxyRef.current) proxyRef.current.value = serializeValues(nextValues);
      const fieldName = root.name ?? latest.current.name;
      if (fieldName) clearErrors(fieldName);
      if (root.shouldValidateOnChange()) root.validation.commit([...nextValues]);
    },
    [clearErrors],
  );

  const handleFocus = React.useCallback(() => {
    if (latest.current.enabled) latest.current.fieldRoot.setFocused(true);
  }, []);

  /** Treats the tree as one control: only fires once focus leaves it entirely. */
  const handleBlur = React.useCallback(
    (event: React.FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && rootRef.current?.contains(next)) return;
      if (!latest.current.enabled) return;
      const root = latest.current.fieldRoot;
      root.setTouched(true);
      root.setFocused(false);
      latest.current.onBlur?.();
      if (root.validationMode === "onBlur") root.validation.commit([...latest.current.values]);
    },
    [rootRef],
  );

  return {
    controlId,
    /** Inside `Field.Root`, the field's name wins. */
    name: fieldRoot.name ?? name,
    isDisabled,
    isInvalid: enabled && fieldRoot.state.valid === false,
    labelledBy: joinIds(ariaLabelledBy, labelId),
    describedBy: joinIds(...messageIds),
    /** The proxy's DOM value: non-empty exactly when something is selected. */
    proxyValue: valueKey,
    proxyRef: setProxyRef,
    handleChange,
    handleFocus,
    handleBlur,
  };
}
