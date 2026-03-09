import * as React from "react";
import { Meter as BaseMeter } from "@base-ui/react/meter";

import { cn } from "@/lib/utils";

function Meter({ className, value, ...props }: React.ComponentProps<typeof BaseMeter.Root>) {
  return (
    <BaseMeter.Root
      data-slot="meter"
      value={value}
      className={cn("astw:relative astw:w-full", className)}
      {...props}
    >
      <BaseMeter.Track
        data-slot="meter-track"
        className="astw:bg-primary/20 astw:relative astw:h-2 astw:w-full astw:overflow-hidden astw:rounded-full"
      >
        <BaseMeter.Indicator
          data-slot="meter-indicator"
          className="astw:bg-primary astw:h-full astw:rounded-full astw:transition-all"
        />
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}

export { Meter };
