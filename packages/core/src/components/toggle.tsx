import * as React from "react";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { ToggleGroup } from "@/components/toggle-group";

const toggleVariants = cva(
  "astw:inline-flex astw:items-center astw:justify-center astw:gap-2 astw:rounded-md astw:text-sm astw:font-medium astw:outline-none astw:transition-all astw:disabled:pointer-events-none astw:disabled:opacity-50 astw:[&_svg]:pointer-events-none astw:[&_svg:not([class*='size-'])]:size-4 astw:[&_svg]:shrink-0 astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "astw:bg-transparent astw:hover:bg-muted astw:hover:text-muted-foreground astw:data-[pressed]:bg-accent astw:data-[pressed]:text-accent-foreground",
        outline:
          "astw:border astw:border-input astw:bg-transparent astw:shadow-xs astw:hover:bg-accent astw:hover:text-accent-foreground astw:data-[pressed]:bg-accent astw:data-[pressed]:text-accent-foreground",
      },
      size: {
        default: "astw:h-9 astw:px-2 astw:min-w-9",
        sm: "astw:h-8 astw:px-1.5 astw:min-w-8",
        lg: "astw:h-10 astw:px-2.5 astw:min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleProps = React.ComponentProps<typeof BaseToggle> & VariantProps<typeof toggleVariants>;

function Toggle({ className, variant, size, ...props }: ToggleProps) {
  return (
    <BaseToggle
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

const ToggleNamespace = {
  Root: Toggle,
  Group: ToggleGroup,
};

export { ToggleNamespace as Toggle, toggleVariants, type ToggleProps };
