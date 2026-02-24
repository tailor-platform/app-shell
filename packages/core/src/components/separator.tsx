import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <div
      data-slot="separator-root"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      className={cn(
        "astw:bg-border astw:shrink-0",
        orientation === "horizontal"
          ? "astw:h-px astw:w-full"
          : "astw:h-full astw:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
