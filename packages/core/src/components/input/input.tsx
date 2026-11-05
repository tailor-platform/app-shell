import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/lib/input-classes";
import { useInsideFieldControl } from "../field/inside-field-control";
import { mergeRefs, useToolbarItem } from "../toolbar/toolbar";

type InputProps = React.ComponentProps<"input">;

// Once per page load, not per instance: a form can hold dozens of these.
let warnedRenderedByFieldControl = false;

const RENDERED_BY_FIELD_CONTROL_WARNING =
  "Input: `<Field.Control render={<Input />} />` is deprecated. Input connects to Field.Root by itself — place `<Input />` directly under <Field.Root>. The Field.Control wrapper will stop being supported in v2.";

/**
 * A styled text input.
 *
 * Inside a `Field.Root` it connects to the field like every other AppShell
 * control: the label, description and error are linked, and it takes the
 * field's `name`, `disabled` and validation state. Outside a `Field.Root` it is
 * a plain standalone input.
 *
 * @example
 * ```tsx
 * import { Field, Input } from "@tailor-platform/app-shell";
 *
 * <Input type="search" placeholder="Search orders" />
 *
 * <Field.Root name="email">
 *   <Field.Label>Email</Field.Label>
 *   <Input type="email" required />
 *   <Field.Error match="valueMissing">Email is required.</Field.Error>
 * </Field.Root>
 * ```
 */
function Input({ className, type, ref: forwardedRef, ...props }: InputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  useToolbarItem(ref, { handlesDirectionalKeys: true });
  // Rendered by `Field.Control`, which already wires the field: keep the old
  // native element so the field doesn't get a second control.
  const renderedByFieldControl = useInsideFieldControl();
  React.useEffect(() => {
    if (!renderedByFieldControl || warnedRenderedByFieldControl) return;
    warnedRenderedByFieldControl = true;
    console.warn(RENDERED_BY_FIELD_CONTROL_WARNING);
  }, [renderedByFieldControl]);

  const inputProps = {
    ref: mergeRefs(ref, forwardedRef),
    type,
    "data-slot": "input",
    className: cn(
      inputBaseClasses,
      "astw:file:text-foreground astw:file:inline-flex astw:file:h-7 astw:file:border-0 astw:file:bg-transparent astw:file:text-label-md",
      "astw:aria-invalid:ring-danger-solid/20 astw:dark:aria-invalid:ring-danger-solid/40 astw:aria-invalid:border-danger-solid",
      "astw:data-invalid:ring-danger-solid/20 astw:dark:data-invalid:ring-danger-solid/40 astw:data-invalid:border-danger-solid",
      className,
    ),
    ...props,
  };

  if (renderedByFieldControl) return <input {...inputProps} />;
  return <BaseField.Control {...inputProps} />;
}

export { Input, type InputProps };
