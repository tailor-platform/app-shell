import * as React from "react";
import { Field } from "@base-ui/react/field";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof Field.Label>) {
  return (
    <Field.Label
      data-slot="label"
      className={cn(
        "astw:flex astw:items-center astw:gap-1 astw:text-sm astw:font-medium astw:leading-none astw:select-none astw:group-data-disabled:pointer-events-none astw:group-data-disabled:opacity-50 astw:peer-disabled:cursor-not-allowed astw:peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
