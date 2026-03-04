import * as React from "react";
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

function ScrollAreaRoot({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Root>) {
  return (
    <BaseScrollArea.Root
      data-slot="scroll-area"
      className={cn("astw:relative astw:overflow-hidden", className)}
      {...props}
    >
      <BaseScrollArea.Viewport
        data-slot="scroll-area-viewport"
        className="astw:h-full astw:w-full"
      >
        <BaseScrollArea.Content>{children}</BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" />
      <BaseScrollArea.Corner />
    </BaseScrollArea.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Scrollbar>) {
  return (
    <BaseScrollArea.Scrollbar
      data-slot="scroll-bar"
      orientation={orientation}
      className={cn(
        "astw:flex astw:touch-none astw:p-px astw:transition-colors",
        orientation === "vertical" &&
          "astw:h-full astw:w-2.5 astw:border-l astw:border-l-transparent",
        orientation === "horizontal" &&
          "astw:h-2.5 astw:flex-col astw:border-t astw:border-t-transparent",
        className,
      )}
      {...props}
    >
      <BaseScrollArea.Thumb
        data-slot="scroll-bar-thumb"
        className="astw:bg-border astw:relative astw:flex-1 astw:rounded-full"
      />
    </BaseScrollArea.Scrollbar>
  );
}

const ScrollArea = {
  Root: ScrollAreaRoot,
  ScrollBar,
};

export { ScrollArea };
