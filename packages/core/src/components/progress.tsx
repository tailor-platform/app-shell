import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

function Progress({ className, value, ...props }: React.ComponentProps<typeof BaseProgress.Root>) {
  return (
    <BaseProgress.Root
      data-slot="progress"
      value={value}
      className={cn("astw:relative astw:w-full", className)}
      {...props}
    >
      <BaseProgress.Track
        data-slot="progress-track"
        className="astw:bg-primary/20 astw:relative astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full"
      >
        <BaseProgress.Indicator
          data-slot="progress-indicator"
          className="astw:bg-primary astw:h-full astw:rounded-full astw:transition-all"
        />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

export { Progress };
