import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "astw:bg-primary astw:text-primary-foreground astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-[state=closed]:animate-out astw:data-[state=closed]:fade-out-0 astw:data-[state=closed]:zoom-out-95 astw:data-[side=bottom]:slide-in-from-top-2 astw:data-[side=left]:slide-in-from-right-2 astw:data-[side=right]:slide-in-from-left-2 astw:data-[side=top]:slide-in-from-bottom-2 astw:z-50 astw:w-fit astw:origin-(--radix-tooltip-content-transform-origin) astw:rounded-md astw:px-3 astw:py-1.5 astw:text-xs astw:text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="astw:bg-primary astw:fill-primary astw:z-50 astw:size-2.5 astw:translate-y-[calc(-50%_-_2px)] astw:rotate-45 astw:rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
