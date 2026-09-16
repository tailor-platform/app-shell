import * as React from "react";

import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/lib/input-classes";

type InputProps = React.ComponentProps<"input">;

/**
 * A styled input component.
 *
 * @example
 * ```tsx
 * import { Input } from "@tailor-platform/app-shell";
 *
 * <Input type="text" placeholder="Enter your name" />
 * <Input type="email" disabled />
 * ```
 */
function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputBaseClasses,
        "astw:file:text-foreground astw:file:inline-flex astw:file:h-7 astw:file:border-0 astw:file:bg-transparent astw:file:text-sm astw:file:font-medium",
        "astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40 astw:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input, type InputProps };
