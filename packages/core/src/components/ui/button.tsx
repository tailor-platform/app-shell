import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { renderOrDefault } from "@/lib/render-utils";

const buttonVariants = cva(
  "astw:inline-flex astw:items-center astw:justify-center astw:gap-2 astw:whitespace-nowrap astw:rounded-md astw:text-sm astw:font-medium astw:transition-all astw:disabled:pointer-events-none astw:disabled:opacity-50 astw:[&_svg]:pointer-events-none astw:[&_svg:not([class*='size-'])]:size-4 astw:shrink-0 astw:[&_svg]:shrink-0 astw:outline-none astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px] astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40 astw:aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "astw:bg-primary astw:text-primary-foreground astw:shadow-xs astw:hover:bg-primary/90",
        destructive:
          "astw:bg-destructive astw:text-white astw:shadow-xs astw:hover:bg-destructive/90 astw:focus-visible:ring-destructive/20 astw:dark:focus-visible:ring-destructive/40 astw:dark:bg-destructive/60",
        outline:
          "astw:border astw:bg-background astw:shadow-xs astw:hover:bg-accent astw:hover:text-accent-foreground astw:dark:bg-input/30 astw:dark:border-input astw:dark:hover:bg-input/50",
        secondary:
          "astw:bg-secondary astw:text-secondary-foreground astw:shadow-xs astw:hover:bg-secondary/80",
        ghost:
          "astw:hover:bg-accent astw:hover:text-accent-foreground astw:dark:hover:bg-accent/50",
        link: "astw:text-primary astw:underline-offset-4 astw:hover:underline",
      },
      size: {
        default: "astw:h-9 astw:px-4 astw:py-2 astw:has-[>svg]:px-3",
        sm: "astw:h-8 astw:rounded-md astw:gap-1.5 astw:px-3 astw:has-[>svg]:px-2.5",
        lg: "astw:h-10 astw:rounded-md astw:px-6 astw:has-[>svg]:px-4",
        icon: "astw:size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  render,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    render?: React.ReactElement;
  }) {
  return renderOrDefault(
    render,
    "button",
    {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...props,
    },
    children,
  );
}

export { Button, buttonVariants };
