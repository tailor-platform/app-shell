import * as React from "react";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useRegisterFieldControl } from "@base-ui/react/internals/field-register-control";
import { useFormContext } from "@base-ui/react/internals/form-context";
import { useLabelableContext, useLabelableId } from "@base-ui/react/internals/labelable-provider";

/**
 * @internal
 * Bridges CheckboxTree into Base UI's `Field` / `Form`, the way the date
 * widgets do (see `use-date-field-bridge.ts`): a hidden, nameless proxy
 * `<input>` is registered as the field control. Its value is the selection
 * joined into one string — empty when nothing is selected — so `required`,
 * `Field.Error`, dirty/touched state and `Form` submit-blocking all work. The
 * selection itself is submitted through separate hidden inputs (one per
 * value), rendered by the component.
 */

type UseCheckboxTreeFieldOptions = {
  id?: string;
  name?: string;
  disabled?: boolean;
  /** The serialized selection (joined submitted values). Empty when nothing is selected. */
  inputValue: string;
  ariaLabelledBy?: string;
  onBlur?: () => void;
  rootRef: React.RefObject<HTMLElement | null>;
  inputRef?: React.Ref<HTMLInputElement>;
};

function joinIds(...ids: Array<string | null | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined;
}

function assignRef<V>(ref: React.Ref<V | null> | undefined, value: V | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else ref.current = value;
}

export function useCheckboxTreeField({
  id,
  name,
  disabled,
  inputValue,
  ariaLabelledBy,
  onBlur,
  rootRef,
  inputRef,
}: UseCheckboxTreeFieldOptions) {
  const fieldRoot = useFieldRootContext();
  const { clearErrors } = useFormContext();
  const { labelId, messageIds } = useLabelableContext();
  const controlId = useLabelableId({ id });
  const isDisabled = !!disabled || !!fieldRoot.disabled;

  const proxyRef = React.useRef<HTMLInputElement | null>(null);
  const latest = React.useRef({ fieldRoot, name, onBlur });
  latest.current = { fieldRoot, name, onBlur };

  const setProxyRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      proxyRef.current = node;
      fieldRoot.validation.inputRef.current = node;
      assignRef(inputRef, node);
    },
    [fieldRoot.validation.inputRef, inputRef],
  );

  useRegisterFieldControl(
    proxyRef,
    controlId,
    inputValue,
    () => proxyRef.current?.value ?? inputValue,
    !isDisabled,
  );

  /** Call after every user change, with the new serialized selection. */
  const handleChange = React.useCallback(
    (nextValue: string) => {
      const root = latest.current.fieldRoot;
      // Native validity (`required`) reads the DOM value, which React only
      // updates on the next render — sync it now so validation sees the change.
      if (proxyRef.current) proxyRef.current.value = nextValue;
      const initial =
        typeof root.validityData.initialValue === "string" ? root.validityData.initialValue : "";
      root.setFilled(nextValue !== "");
      root.setDirty(nextValue !== initial);
      const fieldName = root.name ?? latest.current.name;
      if (fieldName) clearErrors(fieldName);
      if (root.shouldValidateOnChange()) root.validation.commit(nextValue);
    },
    [clearErrors],
  );

  const handleFocus = React.useCallback(() => {
    latest.current.fieldRoot.setFocused(true);
  }, []);

  /** Treats the tree as one control: only fires once focus leaves it entirely. */
  const handleBlur = React.useCallback(
    (event: React.FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && rootRef.current?.contains(next)) return;
      const root = latest.current.fieldRoot;
      root.setTouched(true);
      root.setFocused(false);
      latest.current.onBlur?.();
      if (root.validationMode === "onBlur") root.validation.commit(proxyRef.current?.value ?? "");
    },
    [rootRef],
  );

  return {
    controlId,
    /** Inside `Field.Root`, the field's name wins. */
    name: fieldRoot.name ?? name,
    isDisabled,
    isInvalid: fieldRoot.state.valid === false,
    labelledBy: joinIds(ariaLabelledBy, labelId),
    describedBy: joinIds(...messageIds),
    proxyRef: setProxyRef,
    handleChange,
    handleFocus,
    handleBlur,
  };
}
