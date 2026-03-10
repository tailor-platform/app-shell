import * as React from "react";
import { Meter as BaseMeter } from "@base-ui/react/meter";

import { cn } from "@/lib/utils";

function MeterRoot({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof BaseMeter.Root>) {
  return (
    <BaseMeter.Root
      data-slot="meter"
      value={value}
      className={cn("astw:relative astw:w-full", className)}
      {...props}
    >
      {children ?? (
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      )}
    </BaseMeter.Root>
  );
}

function MeterTrack({ className, ...props }: React.ComponentProps<typeof BaseMeter.Track>) {
  return (
    <BaseMeter.Track
      data-slot="meter-track"
      className={cn(
        "astw:bg-primary/20 astw:relative astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function MeterIndicator({
  className,
  ...props
}: React.ComponentProps<typeof BaseMeter.Indicator>) {
  return (
    <BaseMeter.Indicator
      data-slot="meter-indicator"
      className={cn(
        "astw:bg-primary astw:h-full astw:rounded-full astw:transition-all",
        className,
      )}
      {...props}
    />
  );
}

const Meter = {
  Root: MeterRoot,
  Track: MeterTrack,
  Indicator: MeterIndicator,
};

export { Meter };
