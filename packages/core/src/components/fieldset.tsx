import * as React from "react";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";

import { cn } from "@/lib/utils";

function FieldsetRoot({ className, ...props }: React.ComponentProps<typeof BaseFieldset.Root>) {
  return (
    <BaseFieldset.Root
      data-slot="fieldset"
      className={cn("astw:space-y-4", className)}
      {...props}
    />
  );
}

function FieldsetLegend({ className, ...props }: React.ComponentProps<typeof BaseFieldset.Legend>) {
  return (
    <BaseFieldset.Legend
      data-slot="fieldset-legend"
      className={cn(
        "astw:text-sm astw:font-medium astw:leading-none astw:peer-disabled:cursor-not-allowed astw:peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

const Fieldset = {
  Root: FieldsetRoot,
  Legend: FieldsetLegend,
};

export { Fieldset };
