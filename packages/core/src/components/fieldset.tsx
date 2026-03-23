import * as React from "react";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";

import { cn } from "@/lib/utils";

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
function Root({ className, ...props }: React.ComponentProps<typeof BaseFieldset.Root>) {
  return <BaseFieldset.Root data-slot="fieldset" className={cn(className)} {...props} />;
}
Root.displayName = "Fieldset.Root";

/** An accessible legend that is automatically associated with the fieldset. */
function Legend({ className, ...props }: React.ComponentProps<typeof BaseFieldset.Legend>) {
  return (
    <BaseFieldset.Legend
      data-slot="fieldset-legend"
      className={cn("astw:text-sm astw:font-medium", className)}
      {...props}
    />
  );
}
Legend.displayName = "Fieldset.Legend";

export const Fieldset = {
  Root,
  Legend,
};
