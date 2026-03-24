import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/lib/input-classes";

// Only the props relevant to the Field abstraction are picked from BaseField.Root.
// Base UI-internal props (e.g. actionsRef) are intentionally excluded
// so that upstream changes don't leak as breaking changes to consumers.
//
// The field-state props (`isTouched`, `isDirty`, `invalid`, `error`) follow
// React Hook Form's `fieldState` shape so `<Field.Root {...fieldState}>` just works.
type FieldRootProps = Pick<
  React.ComponentProps<typeof BaseField.Root>,
  | "name"
  | "disabled"
  | "validate"
  | "validationMode"
  | "validationDebounceTime"
  | "className"
  | "style"
> & {
  children: React.ReactNode;
  /** Whether the field has been blurred. Maps to Base UI's `touched`. */
  isTouched?: boolean;
  /** Whether the field value differs from the default. Maps to Base UI's `dirty`. */
  isDirty?: boolean;
  /** When true, marks the field as invalid. Also set automatically when `error` is provided. */
  invalid?: boolean;
  /**
   * An error object (e.g. from React Hook Form's `fieldState.error`).
   * When provided, the field is marked invalid (`invalid={!!error}`).
   */
  error?: { message?: string };
};

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
 * ### With Field.Control (plain input)
 * ```tsx
 * <Field.Root name="email">
 *   <Field.Label>Email</Field.Label>
 *   <Field.Control type="email" required />
 *   <Field.Description>We'll never share your email.</Field.Description>
 *   <Field.Error match="typeMismatch">Please enter a valid email.</Field.Error>
 * </Field.Root>
 * ```
 *
 * @example
 * ### With React Hook Form (Controller spread)
 * ```tsx
 * <Controller
 *   name="email"
 *   control={control}
 *   rules={{ required: "Required" }}
 *   render={({ field, fieldState }) => (
 *     <Field.Root {...fieldState}>
 *       <Field.Label>Email</Field.Label>
 *       <Field.Control {...field} type="email" />
 *       <Field.Error match={fieldState.invalid}>{fieldState.error?.message}</Field.Error>
 *     </Field.Root>
 *   )}
 * />
 * ```
 *
 * > **Note:** When combining RHF with `Form`'s `errors` prop for server-side
 * > error routing, add `name={field.name}` to `Field.Root` so errors can be
 * > matched by field name.
 */
function Root({
  className,
  children,
  isTouched,
  isDirty,
  invalid,
  error,
  // Absorb RHF's isValidating so it doesn't leak to the DOM.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isValidating: _isValidating,
  ...props
}: FieldRootProps & { isValidating?: unknown }) {
  return (
    <BaseField.Root
      data-slot="field"
      className={cn("astw:flex astw:flex-col astw:items-start astw:gap-1", className)}
      touched={isTouched}
      dirty={isDirty}
      invalid={!!error || !!invalid}
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
        inputBaseClasses,
        "astw:data-invalid:ring-destructive/20 astw:dark:data-invalid:ring-destructive/40 astw:data-invalid:border-destructive",
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
  return <BaseField.Validity {...props} />;
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
