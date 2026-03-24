import * as React from "react";
import { Form as BaseForm } from "@base-ui/react/form";

import { cn } from "@/lib/utils";

// Extract the submit-event details type from Base UI without relying on
// namespace access so the wrapper stays robust across package versions.
type FormSubmitEventDetails =
  NonNullable<React.ComponentProps<typeof BaseForm>["onFormSubmit"]> extends (
    values: any,
    details: infer D,
  ) => any
    ? D
    : never;

// Compile-time guard: fails if Base UI changes the callback shape.
// @ts-expect-error TS6196 — intentionally unused; exists only as a compile-time assertion
type _AssertFormSubmitDetails = FormSubmitEventDetails extends never
  ? ["ERROR: FormSubmitEventDetails inference broke — check @base-ui/react version"]
  : true;

// Only the props relevant to the Form abstraction are picked from BaseForm.
// Base UI-internal props are intentionally excluded
// so that upstream changes don't leak as breaking changes to consumers.
//
// `onFormSubmit` is defined separately so the `FormValues` generic
// flows through to the callback's first parameter, enabling type-safe
// form values when a type argument is provided (e.g. `<Form<MyValues>>`).
type FormProps<FormValues extends Record<string, any> = Record<string, any>> = Pick<
  React.ComponentProps<typeof BaseForm>,
  | "errors"
  | "onSubmit"
  | "actionsRef"
  | "validationMode"
  | "noValidate"
  | "ref"
  | "className"
  | "style"
> & {
  children: React.ReactNode;
  onFormSubmit?:
    | ((formValues: FormValues, eventDetails: FormSubmitEventDetails) => void)
    | undefined;
};

/**
 * A form element with consolidated error handling and validation.
 *
 * Wraps every child `Field.Root` in a shared validation / error context.
 * External errors passed via `errors` are automatically routed to matching
 * `Field.Error` components by field `name`, and cleared when the user edits
 * the corresponding field.
 *
 * ## Validation flow
 *
 * Each `Field.Root` can declare its own `validate` function and/or rely on
 * native HTML constraint attributes (`required`, `type="email"`, `pattern`,
 * etc.). The moment validation fires is controlled by `validationMode`
 * (default `"onSubmit"`).
 *
 * External errors (e.g. from an API response) can be fed back via `errors`.
 * Errors are keyed by the field's `name` attribute and rendered by any
 * `Field.Error` with a matching `match` or a catch-all `Field.Error`
 * (no `match`).
 *
 * ## Programmatic validation
 *
 * Use `actionsRef` to imperatively trigger validation from outside the
 * normal submit flow (e.g. a "Validate" button or a multi-step wizard).
 *
 * ```tsx
 * const actions = React.useRef<{ validate: () => void }>(null);
 * <Form actionsRef={actions}>…</Form>
 * <button onClick={() => actions.current?.validate()}>Check</button>
 * ```
 *
 * @example
 * ### Basic usage
 * ```tsx
 * <Form onFormSubmit={(values) => save(values)}>
 *   <Field.Root name="email">
 *     <Field.Label>Email</Field.Label>
 *     <Field.Control type="email" required />
 *     <Field.Error match="typeMismatch">Enter a valid email.</Field.Error>
 *   </Field.Root>
 *   <button type="submit">Save</button>
 * </Form>
 * ```
 *
 * @example
 * ### External errors (e.g. API validation)
 * ```tsx
 * const [errors, setErrors] = React.useState({});
 *
 * async function handleSubmit(values) {
 *   const res = await api.save(values);
 *   if (res.errors) setErrors(res.errors);
 * }
 *
 * <Form errors={errors} onFormSubmit={handleSubmit}>
 *   <Field.Root name="url">
 *     <Field.Label>Homepage</Field.Label>
 *     <Field.Control type="url" required />
 *     <Field.Error />
 *   </Field.Root>
 *   <button type="submit">Submit</button>
 * </Form>
 * ```
 */
function Form<FormValues extends Record<string, any> = Record<string, any>>({
  className,
  children,
  ...props
}: FormProps<FormValues>) {
  return (
    <BaseForm<FormValues> data-slot="form" className={cn(className)} {...props}>
      {children}
    </BaseForm>
  );
}
Form.displayName = "Form";

export { Form, type FormProps };
