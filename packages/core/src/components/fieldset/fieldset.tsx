import * as React from "react";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";

import { cn } from "@/lib/utils";
import { Text } from "../text";

/**
 * Groups related fields with a shared legend for accessible form sectioning.
 *
 * @example
 * ```tsx
 * <Fieldset.Root>
 *   <Fieldset.Legend>Billing details</Fieldset.Legend>
 *   <Field.Root name="company">
 *     <Field.Label>Company</Field.Label>
 *     <Field.Control />
 *   </Field.Root>
 *   <Field.Root name="taxId">
 *     <Field.Label>Tax ID</Field.Label>
 *     <Field.Control />
 *   </Field.Root>
 * </Fieldset.Root>
 * ```
 */
type FieldsetRootProps = Pick<
  React.ComponentProps<typeof BaseFieldset.Root>,
  "disabled" | "className" | "style"
> & { children: React.ReactNode };

function Root({ className, ...props }: FieldsetRootProps) {
  return <BaseFieldset.Root data-slot="fieldset" className={className} {...props} />;
}
Root.displayName = "Fieldset.Root";

/** An accessible legend that is automatically associated with the fieldset. */
function Legend({ className, ...props }: React.ComponentProps<typeof BaseFieldset.Legend>) {
  return (
    <Text
      variant="label-md"
      className={cn(className)}
      render={<BaseFieldset.Legend data-slot="fieldset-legend" {...props} />}
    />
  );
}
Legend.displayName = "Fieldset.Legend";

export const Fieldset = {
  Root,
  Legend,
};
