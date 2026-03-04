import * as React from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

function PopoverRoot({
  ...props
}: React.ComponentProps<typeof BasePopover.Root>) {
  return <BasePopover.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof BasePopover.Trigger>) {
  return <BasePopover.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> & {
  sideOffset?: number;
}) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={sideOffset}>
        <BasePopover.Popup
          data-slot="popover-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:z-50 astw:w-72 astw:origin-(--transform-origin) astw:rounded-md astw:border astw:p-4 astw:shadow-md astw:outline-hidden",
            className,
          )}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

function PopoverClose({
  ...props
}: React.ComponentProps<typeof BasePopover.Close>) {
  return <BasePopover.Close data-slot="popover-close" {...props} />;
}

function PopoverArrow({
  className,
  ...props
}: React.ComponentProps<typeof BasePopover.Arrow>) {
  return (
    <BasePopover.Arrow
      data-slot="popover-arrow"
      className={cn(
        "astw:fill-popover astw:stroke-border astw:stroke-1",
        className,
      )}
      {...props}
    />
  );
}

const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Close: PopoverClose,
  Arrow: PopoverArrow,
};

export { Popover };
