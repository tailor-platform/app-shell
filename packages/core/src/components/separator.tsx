import * as React from "react";
import { Separator as BaseSeparator } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

function Separator({
  className,
  ...props
}: React.ComponentProps<typeof BaseSeparator>) {
  return (
    <BaseSeparator
      data-slot="separator-root"
      className={cn(
        "astw:bg-border astw:shrink-0",
        "astw:data-[orientation=horizontal]:h-px astw:data-[orientation=horizontal]:w-full",
        "astw:data-[orientation=vertical]:h-full astw:data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
