import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

import { cn } from "@/lib/utils";

// Only the props relevant to the Field abstraction are picked from BaseField.Root.
// Base UI-internal props (e.g. actionsRef) are intentionally excluded
// so that upstream changes don't leak as breaking changes to consumers.
type FieldRootProps = Pick<
  React.ComponentProps<typeof BaseField.Root>,
  | "name"
  | "invalid"
  | "dirty"
  | "touched"
  | "disabled"
  | "validate"
  | "validationMode"
  | "validationDebounceTime"
  | "className"
  | "style"
> & { children: React.ReactNode };

/**
 * Groups all parts of a form field and manages its validation state.
 *
 * Provides a `LabelableContext` and `FieldRootContext` that Base UI controls
 * automatically connect to. Any Base UI-backed control placed as a child
 * (e.g. Select, Combobox, Autocomplete, Field.Control) will:
 *
 * - Register its ID so that `Field.Label` receives the correct `htmlFor`
 * - Receive `aria-describedby` linking to `Field.Description` and `Field.Error`
 * - Inherit the `disabled` state from this root
 * - Participate in the validation system (`invalid`, `dirty`, `touched`)
 *
 * This means `Field.Control` can be omitted when using another AppShell input
 * component — the wiring happens automatically through Base UI's context.
 *
 * @example
 * ```tsx
 * // With Field.Control (plain input)
 * <Field.Root name="email">
 *   <Field.Label>Email</Field.Label>
 *   <Field.Control type="email" required />
 *   <Field.Description>We'll never share your email.</Field.Description>
 *   <Field.Error match="typeMismatch">Please enter a valid email.</Field.Error>
 * </Field.Root>
 *
 * // With Select (auto-wired via Base UI context)
 * <Field.Root name="fruit">
 *   <Field.Label>Fruit</Field.Label>
 *   <Select items={fruits} mapItem={mapFruit} />
 *   <Field.Description>Pick one.</Field.Description>
 * </Field.Root>
 * ```
 */
function Root({ className, children, ...props }: FieldRootProps) {
  return (
    <BaseField.Root
      data-slot="field"
      className={cn("astw:flex astw:flex-col astw:items-start astw:gap-1", className)}
      {...props}
    >
      {children}
    </BaseField.Root>
  );
}
Root.displayName = "Field.Root";

/**
 * An accessible label that is automatically associated with the field control.
 *
 * Uses the `LabelableContext` provided by `Field.Root` to resolve `htmlFor`.
 * Any Base UI control inside the same `Field.Root` (Field.Control, Select,
 * Combobox, Autocomplete) registers its ID with the context, so clicking
 * this label will focus the correct control.
 */
function Label({ className, ...props }: React.ComponentProps<typeof BaseField.Label>) {
  return (
    <BaseField.Label
      data-slot="field-label"
      className={cn("astw:text-sm astw:font-medium", className)}
      {...props}
    />
  );
}
Label.displayName = "Field.Label";

/**
 * A styled input control for the field.
 *
 * Can be omitted when using another Base UI-backed AppShell input component
 * (e.g. Select, Combobox, Autocomplete) as a sibling — those components
 * register themselves with the Field context automatically.
 */
function Control({ className, ...props }: React.ComponentProps<typeof BaseField.Control>) {
  return (
    <BaseField.Control
      data-slot="field-control"
      className={cn(
        "astw:border-input astw:flex astw:h-9 astw:w-full astw:min-w-0 astw:rounded-md astw:border astw:bg-transparent astw:px-3 astw:py-1 astw:text-base astw:shadow-xs astw:outline-none astw:md:text-sm",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:data-invalid:ring-destructive/20 astw:data-invalid:border-destructive",
        "astw:disabled:pointer-events-none astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        "astw:placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
Control.displayName = "Field.Control";

/**
 * A paragraph with additional information about the field.
 *
 * Its ID is registered with the Field context so that the control
 * automatically receives a matching `aria-describedby` attribute.
 */
function Description({ className, ...props }: React.ComponentProps<typeof BaseField.Description>) {
  return (
    <BaseField.Description
      data-slot="field-description"
      className={cn("astw:text-muted-foreground astw:text-sm", className)}
      {...props}
    />
  );
}
Description.displayName = "Field.Description";

/**
 * An error message displayed if the field control fails validation.
 *
 * Its ID is registered with the Field context and appended to the control's
 * `aria-describedby`. Use the `match` prop to show the message only for a
 * specific `ValidityState` key (e.g. `"valueMissing"`, `"typeMismatch"`).
 * Omitting `match` shows the browser's default validation message.
 */
function Error({ className, ...props }: React.ComponentProps<typeof BaseField.Error>) {
  return (
    <BaseField.Error
      data-slot="field-error"
      className={cn("astw:text-destructive astw:text-sm astw:font-medium", className)}
      {...props}
    />
  );
}
Error.displayName = "Field.Error";

/** Used to display a custom message based on the field's validity state. */
function Validity({ ...props }: React.ComponentProps<typeof BaseField.Validity>) {
  return <BaseField.Validity data-slot="field-validity" {...props} />;
}
Validity.displayName = "Field.Validity";

export const Field = {
  Root,
  Label,
  Control,
  Description,
  Error,
  Validity,
};
