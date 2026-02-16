import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "astw:file:text-foreground astw:placeholder:text-muted-foreground astw:selection:bg-primary astw:selection:text-primary-foreground astw:dark:bg-input/30 astw:border-input astw:flex astw:h-9 astw:w-full astw:min-w-0 astw:rounded-md astw:border astw:bg-transparent astw:px-3 astw:py-1 astw:text-base astw:shadow-xs astw:transition-[color,box-shadow] astw:outline-none astw:file:inline-flex astw:file:h-7 astw:file:border-0 astw:file:bg-transparent astw:file:text-sm astw:file:font-medium astw:disabled:pointer-events-none astw:disabled:cursor-not-allowed astw:disabled:opacity-50 astw:md:text-sm",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40 astw:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
