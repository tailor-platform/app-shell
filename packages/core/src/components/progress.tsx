import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

function ProgressRoot({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof BaseProgress.Root>) {
  return (
    <BaseProgress.Root
      data-slot="progress"
      value={value}
      className={cn("astw:relative astw:w-full", className)}
      {...props}
    >
      {children ?? (
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      )}
    </BaseProgress.Root>
  );
}

function ProgressTrack({
  className,
  ...props
}: React.ComponentProps<typeof BaseProgress.Track>) {
  return (
    <BaseProgress.Track
      data-slot="progress-track"
      className={cn(
        "astw:bg-primary/20 astw:relative astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function ProgressIndicator({
  className,
  ...props
}: React.ComponentProps<typeof BaseProgress.Indicator>) {
  return (
    <BaseProgress.Indicator
      data-slot="progress-indicator"
      className={cn(
        "astw:bg-primary astw:h-full astw:rounded-full astw:transition-all",
        className,
      )}
      {...props}
    />
  );
}

const Progress = {
  Root: ProgressRoot,
  Track: ProgressTrack,
  Indicator: ProgressIndicator,
};

export { Progress };
