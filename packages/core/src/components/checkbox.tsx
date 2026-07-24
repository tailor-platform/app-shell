import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

// `children` and `render` are intentionally excluded: the component owns the
// box + indicator structure so the visual stays stable, and consumers get a
// narrow, predictable surface. Every other Base UI Checkbox.Root prop
// (`checked`, `defaultChecked`, `onCheckedChange`, `indeterminate`, `disabled`,
// `required`, `readOnly`, `name`, `value`, `inputRef`, `id`, aria-*, …) is
// forwarded so the control drops straight into `Field` / React Hook Form.
type CheckboxProps = Omit<React.ComponentProps<typeof BaseCheckbox.Root>, "children" | "render"> & {
  /**
   * Optional inline label rendered next to the box. When provided, the box and
   * text are wrapped in an enclosing `<label>` so clicking the text toggles the
   * checkbox. Omit it to render the bare box (e.g. a row-select cell with an
   * `aria-label`, or a `Field.Label` sibling for the stacked form layout).
   */
  label?: React.ReactNode;
};

// The box itself. `data-checked` / `data-indeterminate` fill it with the
// primary colour; `data-invalid` (inherited from a surrounding `Field.Root`)
// switches it to the destructive colour, matching `Field.Control` / `Input`.
const checkboxBoxClasses = cn(
  "astw:peer astw:flex astw:size-4 astw:shrink-0 astw:cursor-pointer astw:items-center astw:justify-center astw:rounded-xs astw:border astw:border-input astw:shadow-xs astw:outline-none astw:transition-[color,box-shadow]",
  "astw:data-checked:bg-primary astw:data-checked:border-primary astw:data-checked:text-primary-foreground",
  "astw:data-indeterminate:bg-primary astw:data-indeterminate:border-primary astw:data-indeterminate:text-primary-foreground",
  "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
  "astw:data-invalid:border-destructive astw:data-invalid:ring-destructive/20 astw:dark:data-invalid:ring-destructive/40",
  "astw:data-disabled:cursor-not-allowed astw:data-disabled:opacity-50",
);

/**
 * A styled checkbox for boolean form fields.
 *
 * Wraps Base UI's `Checkbox`, so it works with `Field` and React Hook Form the
 * same way `Input`, `Select`, and `Combobox` do — placed inside a `Field.Root`
 * it inherits label association, `aria-describedby`, `disabled`, and the
 * `data-invalid` error state automatically (no `error` prop of its own).
 *
 * Supports controlled (`checked`) and uncontrolled (`defaultChecked`) use, plus
 * an `indeterminate` "partially selected" state.
 *
 * @example
 * ### Standalone with an inline label
 * ```tsx
 * const [checked, setChecked] = React.useState(false);
 *
 * <Checkbox label="Subscribe to updates" checked={checked} onCheckedChange={setChecked} />
 * ```
 *
 * @example
 * ### Inside a Field with React Hook Form
 * ```tsx
 * <Controller
 *   name="acceptTerms"
 *   control={control}
 *   rules={{ required: "You must accept the terms." }}
 *   render={({ field, fieldState }) => (
 *     <Field.Root name={field.name} {...fieldState}>
 *       <Checkbox
 *         label="I accept the terms and conditions"
 *         checked={field.value}
 *         onCheckedChange={field.onChange}
 *         onBlur={field.onBlur}
 *         inputRef={field.ref}
 *       />
 *       <Field.Error />
 *     </Field.Root>
 *   )}
 * />
 * ```
 *
 * @example
 * ### Indeterminate ("select all")
 * ```tsx
 * <Checkbox
 *   aria-label="Select all rows"
 *   checked={allSelected}
 *   indeterminate={someSelected && !allSelected}
 *   onCheckedChange={(checked) => (checked ? selectAll() : clearAll())}
 * />
 * ```
 */
function Checkbox({ className, label, ...props }: CheckboxProps) {
  const box = (
    <BaseCheckbox.Root
      data-slot="checkbox"
      className={cn(checkboxBoxClasses, !label && className)}
      {...props}
    >
      <BaseCheckbox.Indicator
        data-slot="checkbox-indicator"
        className="astw:flex astw:items-center astw:justify-center astw:text-current astw:data-unchecked:hidden"
      >
        {/* `indeterminate` takes visual priority over `checked`, matching the
            native tri-state control. */}
        {props.indeterminate ? (
          <Minus className="astw:size-3" />
        ) : (
          <Check className="astw:size-3" />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );

  if (label == null) return box;

  return (
    <label
      data-slot="checkbox-label"
      className={cn(
        "astw:inline-flex astw:cursor-pointer astw:items-center astw:gap-2 astw:text-sm astw:select-none",
        "astw:has-data-disabled:cursor-not-allowed astw:has-data-disabled:opacity-50",
        className,
      )}
    >
      {box}
      {label}
    </label>
  );
}

export { Checkbox, type CheckboxProps };
