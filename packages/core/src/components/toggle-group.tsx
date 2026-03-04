import * as React from "react";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/toggle";

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof BaseToggleGroup> &
  VariantProps<typeof toggleVariants>) {
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
