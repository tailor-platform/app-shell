import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

import { useOnceWarnings } from "@/hooks/use-once-warnings";
import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/lib/input-classes";
import { Text } from "../text";
import { Autocomplete } from "../autocomplete";
import { Checkbox } from "../checkbox";
import { Combobox } from "../combobox";
import { DateField, DatePicker, DateRangePicker } from "../date-field";
import { Select } from "../select";
import { Textarea } from "../textarea";
import { InsideFieldControlContext } from "./inside-field-control";

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
    <Text
      variant="label-md"
      className={cn(className)}
      render={<BaseField.Label data-slot="field-label" {...props} />}
    />
  );
}
Label.displayName = "Field.Label";

// Controls that draw their own frame and connect to `Field.Root` themselves.
// Passed to `Field.Control`'s `render`, they get a second frame plus `<input>`
// props they don't take (platform-planning#1977).
const selfWiredControls = new Map<unknown, string>([
  [Select, "Select"],
  [Select.Async, "Select.Async"],
  [Combobox, "Combobox"],
  [Combobox.Async, "Combobox.Async"],
  [Autocomplete, "Autocomplete"],
  [Autocomplete.Async, "Autocomplete.Async"],
  [Checkbox, "Checkbox"],
  [Textarea, "Textarea"],
  [DateField, "DateField"],
  [DatePicker, "DatePicker"],
  [DateRangePicker, "DateRangePicker"],
]);

function renderMisuseWarnings(render: unknown): string[] {
  if (!React.isValidElement(render)) return [];
  const name = selfWiredControls.get(render.type);
  if (!name) return [];
  return [
    `Field.Control: \`render={<${name} />}\` draws a second frame around ${name}. ${name} connects to Field.Root by itself — place it directly under <Field.Root> instead of inside Field.Control.`,
  ];
}

/**
 * A styled text input for the field.
 *
 * Use it for plain text-like inputs, or pass a native element to `render`
 * (e.g. `render={<textarea />}`). `Select`, `Combobox`, `Autocomplete`,
 * `Checkbox`, `Textarea`, `DateField`, `DatePicker` and `DateRangePicker` go
 * directly under `Field.Root` instead: each draws its own frame and registers
 * with the Field context itself. Passing one to `render` draws a second frame
 * and logs a warning. `Input` connects to `Field.Root` by itself too, so
 * `render={<Input />}` is redundant: it still works, but is deprecated.
 */
function Control({ className, ...props }: React.ComponentProps<typeof BaseField.Control>) {
  useOnceWarnings(renderMisuseWarnings(props.render));
  return (
    <InsideFieldControlContext.Provider value={true}>
      <BaseField.Control
        data-slot="field-control"
        className={cn(
          inputBaseClasses,
          "astw:data-invalid:ring-danger-solid/20 astw:dark:data-invalid:ring-danger-solid/40 astw:data-invalid:border-danger-solid",
          className,
        )}
        {...props}
      />
    </InsideFieldControlContext.Provider>
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
    <Text
      variant="body-md"
      className={cn("astw:text-muted-foreground", className)}
      render={<BaseField.Description data-slot="field-description" {...props} />}
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
 *
 * Multiple `Field.Error` elements can be placed in the same `Field.Root` to
 * handle different validation failures independently.
 *
 * @example
 * ### Single catch-all error
 * ```tsx
 * <Field.Root name="name">
 *   <Field.Label>Name</Field.Label>
 *   <Field.Control required />
 *   <Field.Error>This field is required.</Field.Error>
 * </Field.Root>
 * ```
 *
 * @example
 * ### Multiple errors for different validity states
 * ```tsx
 * <Field.Root name="email">
 *   <Field.Label>Email</Field.Label>
 *   <Field.Control type="email" required />
 *   <Field.Error match="valueMissing">Email is required.</Field.Error>
 *   <Field.Error match="typeMismatch">Please enter a valid email address.</Field.Error>
 * </Field.Root>
 * ```
 *
 * @example
 * ### With React Hook Form error
 * ```tsx
 * <Controller
 *   name="email"
 *   control={control}
 *   render={({ field, fieldState }) => (
 *     <Field.Root {...fieldState}>
 *       <Field.Label>Email</Field.Label>
 *       <Field.Control {...field} />
 *       <Field.Error match={!!fieldState.error}>
 *         {fieldState.error?.message}
 *       </Field.Error>
 *     </Field.Root>
 *   )}
 * />
 * ```
 */
function Error({ className, ...props }: React.ComponentProps<typeof BaseField.Error>) {
  return (
    <Text
      variant="label-md"
      className={cn("astw:text-danger-text", className)}
      render={<BaseField.Error data-slot="field-error" {...props} />}
    />
  );
}
Error.displayName = "Field.Error";

/**
 * Used to display a custom message based on the field's validity state.
 *
 * Requires `children` to be a render function that receives a
 * `FieldValidityState` object. The `validity` property within it mirrors the
 * browser's `ValidityState` (e.g. `valueMissing`, `tooShort`, `valid`),
 * enabling fully custom validation UI.
 *
 * @example
 * ### Checklist-style password requirements
 * ```tsx
 * <Field.Root name="password">
 *   <Field.Label>Password</Field.Label>
 *   <Field.Control type="password" required minLength={8} />
 *   <Field.Validity>
 *     {(state) => (
 *       <ul>
 *         <li>{state.validity.valueMissing ? "NG" : "OK"} Required</li>
 *         <li>{state.validity.tooShort ? "NG" : "OK"} At least 8 characters</li>
 *       </ul>
 *     )}
 *   </Field.Validity>
 * </Field.Root>
 * ```
 *
 * @example
 * ### Conditional styling based on validity
 * ```tsx
 * <Field.Root name="url">
 *   <Field.Label>Website</Field.Label>
 *   <Field.Control type="url" required />
 *   <Field.Validity>
 *     {(state) =>
 *       state.validity.valid === false && (
 *         <p className="text-danger-text text-sm">
 *           {state.validity.typeMismatch
 *             ? "Please enter a valid URL (e.g. https://example.com)"
 *             : "This field is required."}
 *         </p>
 *       )
 *     }
 *   </Field.Validity>
 * </Field.Root>
 * ```
 */
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
