import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 0,
  children,
  ...props
}: {
  delayDuration?: number;
  children: React.ReactNode;
}) {
  return (
    <BaseTooltip.Provider
      data-slot="tooltip-provider"
      delay={delayDuration}
      {...props}
    >
      {children}
    </BaseTooltip.Provider>
  );
}

function Tooltip({ children, ...props }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <BaseTooltip.Root data-slot="tooltip" {...props}>
        {children}
      </BaseTooltip.Root>
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof BaseTooltip.Trigger>) {
  return <BaseTooltip.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Popup> & {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const { side = "top", align = "center", ...restProps } = props as {
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
  };
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={sideOffset} side={side} align={align}>
        <BaseTooltip.Popup
          data-slot="tooltip-content"
          className={cn(
            "astw:bg-primary astw:text-primary-foreground astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95 astw:data-[side=bottom]:slide-in-from-top-2 astw:data-[side=left]:slide-in-from-right-2 astw:data-[side=right]:slide-in-from-left-2 astw:data-[side=top]:slide-in-from-bottom-2 astw:z-50 astw:w-fit astw:origin-(--transform-origin) astw:rounded-md astw:px-3 astw:py-1.5 astw:text-xs astw:text-balance",
            className,
          )}
          {...restProps}
        >
          {children}
          <BaseTooltip.Arrow className="astw:bg-primary astw:fill-primary astw:z-50 astw:size-2.5 astw:translate-y-[calc(-50%_-_2px)] astw:rotate-45 astw:rounded-[2px]" />
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
