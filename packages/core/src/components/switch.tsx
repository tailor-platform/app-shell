import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      className={cn(
        "astw:peer astw:inline-flex astw:h-5 astw:w-9 astw:shrink-0 astw:items-center astw:rounded-full astw:border-2 astw:border-transparent astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px] astw:focus-visible:border-ring",
        "astw:bg-input astw:data-checked:bg-primary",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        "astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40 astw:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        data-slot="switch-thumb"
        className={cn(
          "astw:pointer-events-none astw:block astw:size-4 astw:rounded-full astw:bg-background astw:shadow-lg astw:ring-0 astw:transition-transform",
          "astw:translate-x-0 astw:data-checked:translate-x-4",
        )}
      />
    </BaseSwitch.Root>
  );
}

export { Switch };
