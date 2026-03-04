import * as React from "react";
import { PreviewCard as BasePreviewCard } from "@base-ui/react/preview-card";

import { cn } from "@/lib/utils";

function PreviewCardRoot({
  ...props
}: React.ComponentProps<typeof BasePreviewCard.Root>) {
  return <BasePreviewCard.Root data-slot="preview-card" {...props} />;
}

function PreviewCardTrigger({
  ...props
}: React.ComponentProps<typeof BasePreviewCard.Trigger>) {
  return (
    <BasePreviewCard.Trigger data-slot="preview-card-trigger" {...props} />
  );
}

function PreviewCardContent({
  className,
  sideOffset = 4,
  side = "bottom",
  align = "center",
  ...props
}: React.ComponentProps<typeof BasePreviewCard.Popup> & {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  return (
    <BasePreviewCard.Portal>
      <BasePreviewCard.Positioner
        sideOffset={sideOffset}
        side={side}
        align={align}
      >
        <BasePreviewCard.Popup
          data-slot="preview-card-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:z-50 astw:w-80 astw:origin-(--transform-origin) astw:rounded-lg astw:border astw:p-4 astw:shadow-md astw:outline-none",
            "astw:animate-in astw:fade-in-0 astw:zoom-in-95",
            "astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
            className,
          )}
          {...props}
        />
      </BasePreviewCard.Positioner>
    </BasePreviewCard.Portal>
  );
}

function PreviewCardArrow({
  className,
  ...props
}: React.ComponentProps<typeof BasePreviewCard.Arrow>) {
  return (
    <BasePreviewCard.Arrow
      data-slot="preview-card-arrow"
      className={cn(
        "astw:fill-popover astw:z-50 astw:size-2.5 astw:translate-y-[calc(-50%_-_2px)] astw:rotate-45 astw:rounded-[2px] astw:border",
        className,
      )}
      {...props}
    />
  );
}

const PreviewCard = {
  Root: PreviewCardRoot,
  Trigger: PreviewCardTrigger,
  Content: PreviewCardContent,
  Arrow: PreviewCardArrow,
};

export { PreviewCard };
