import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";
import type { PositionProps } from "@/lib/position";

// Only the props relevant to the Provider abstraction are picked.
// Base UI-internal props are intentionally excluded so that
// upstream changes don't leak as breaking changes to consumers.
type ProviderProps = Pick<
  React.ComponentProps<typeof BaseTooltip.Provider>,
  "delay" | "closeDelay" | "timeout"
> & {
  children: React.ReactNode;
};

/** Provides shared delay configuration for nested tooltips. */
function Provider({ delay = 0, children, ...props }: ProviderProps) {
  return (
    <BaseTooltip.Provider data-slot="tooltip-provider" delay={delay} {...props}>
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
  position,
  side: _side,
  align: _align,
  sideOffset: _sideOffset,
  children,
  ...restProps
}: React.ComponentProps<typeof BaseTooltip.Popup> & {
  position?: PositionProps;
  /** @deprecated Use `position={{ side }}` instead. */
  side?: PositionProps["side"];
  /** @deprecated Use `position={{ align }}` instead. */
  align?: PositionProps["align"];
  /** @deprecated Use `position={{ sideOffset }}` instead. */
  sideOffset?: PositionProps["sideOffset"];
}) {
  // Deprecated flat props are accepted for backward compatibility but
  // silently ignored when the `position` prop is provided.
  const resolved = position ?? {
    side: _side,
    align: _align,
    sideOffset: _sideOffset,
  };
  const { side = "top", align = "center", sideOffset = 5 } = resolved;
  return (
    <BaseTooltip.Portal style={{ position: "relative", zIndex: 50 }}>
      <BaseTooltip.Positioner sideOffset={sideOffset} side={side} align={align}>
        <BaseTooltip.Popup
          data-slot="tooltip-content"
          className={cn(
            "astw:bg-primary astw:text-primary-foreground astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95 astw:data-[side=bottom]:slide-in-from-top-2 astw:data-[side=left]:slide-in-from-right-2 astw:data-[side=right]:slide-in-from-left-2 astw:data-[side=top]:slide-in-from-bottom-2 astw:z-50 astw:w-fit astw:overflow-visible astw:origin-(--transform-origin) astw:rounded-md astw:px-3 astw:py-1.5 astw:text-xs astw:text-balance",
            className,
          )}
          {...restProps}
        >
          {children}
          <BaseTooltip.Arrow className="astw:size-2.5 astw:rotate-45 astw:bg-primary astw:data-[side=top]:-bottom-1 astw:data-[side=bottom]:-top-1 astw:data-[side=left]:-right-1 astw:data-[side=right]:-left-1" />
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
