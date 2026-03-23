import * as React from "react";
import { Form as BaseForm } from "@base-ui/react/form";

import { cn } from "@/lib/utils";

// Only the props relevant to the Form abstraction are picked from BaseForm.
// Base UI-internal props are intentionally excluded
// so that upstream changes don't leak as breaking changes to consumers.
type FormProps = Pick<
  React.ComponentProps<typeof BaseForm>,
  | "errors"
  | "onSubmit"
  | "onFormSubmit"
  | "actionsRef"
  | "validationMode"
  | "action"
  | "className"
  | "style"
> & { children: React.ReactNode };

/**
 * A form element with consolidated error handling and validation.
 *
 * @example
 * ```tsx
 * <Form errors={serverErrors} onSubmit={handleSubmit}>
 *   <Field.Root name="url">
 *     <Field.Label>Homepage</Field.Label>
 *     <Field.Control type="url" required />
 *     <Field.Error />
 *   </Field.Root>
 *   <Button type="submit">Submit</Button>
 * </Form>
 * ```
 */
function Form({ className, children, ...props }: FormProps) {
  return (
    <BaseForm data-slot="form" className={cn(className)} {...props}>
      {children}
    </BaseForm>
  );
}
Form.displayName = "Form";

export { Form, type FormProps };
