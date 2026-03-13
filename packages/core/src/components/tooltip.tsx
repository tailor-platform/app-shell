import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

/** Provides shared delay configuration for nested tooltips. */
function Provider({
  delayDuration = 0,
  children,
  ...props
}: Omit<React.ComponentProps<typeof BaseTooltip.Provider>, "delay"> & {
  delayDuration?: number;
  children: React.ReactNode;
}) {
  return (
    <BaseTooltip.Provider data-slot="tooltip-provider" delay={delayDuration} {...props}>
      {children}
    </BaseTooltip.Provider>
  );
}
Provider.displayName = "Tooltip.Provider";

// Only the props relevant to the Tooltip abstraction are picked from BaseTooltip.Root.
// Base UI-internal props (e.g. trackCursorAxis, hoverable) are intentionally excluded
// so that upstream changes don't leak as breaking changes to consumers.
type TooltipRootProps = Pick<
  React.ComponentProps<typeof BaseTooltip.Root>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  children: React.ReactNode;
};

/**
 * The root component that manages tooltip open/close state.
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger render={<Button variant="outline" />}>
 *     Hover me
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>Helpful information</Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
function Root({ children, ...props }: TooltipRootProps) {
  return (
    <BaseTooltip.Root data-slot="tooltip" {...props}>
      {children}
    </BaseTooltip.Root>
  );
}
Root.displayName = "Tooltip.Root";

/** The element that triggers the tooltip on hover or focus. */
function Trigger({ ...props }: React.ComponentProps<typeof BaseTooltip.Trigger>) {
  return <BaseTooltip.Trigger data-slot="tooltip-trigger" {...props} />;
}
Trigger.displayName = "Tooltip.Trigger";

/** The tooltip popup that displays additional information. */
function Content({
  className,
  sideOffset = 0,
  side = "top",
  align = "center",
  children,
  ...restProps
}: React.ComponentProps<typeof BaseTooltip.Popup> & {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
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
Content.displayName = "Tooltip.Content";

export const Tooltip = {
  Root,
  Trigger,
  Content,
  Provider,
};
