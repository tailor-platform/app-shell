import * as React from "react";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";

import { cn } from "@/lib/utils";

function ToggleGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseToggleGroup>) {
  return (
    <BaseToggleGroup
      data-slot="toggle-group"
      className={cn("astw:flex astw:items-center astw:gap-1", className)}
      {...props}
    >
      {children}
    </BaseToggleGroup>
  );
}

export { ToggleGroup };
