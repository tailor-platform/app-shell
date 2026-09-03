import type * as React from "react";

import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { cn } from "@/lib/utils";

type ActionsProps = React.ComponentProps<"div">;

/** Row of icon-button actions under a finished assistant turn. */
function Actions({ className, ...props }: ActionsProps) {
  return (
    <div
      data-slot="ai-chat-actions"
      className={cn("astw:flex astw:items-center astw:gap-0.5", className)}
      {...props}
    />
  );
}

type ActionProps = React.ComponentProps<typeof Button> & {
  /** Accessible name; also shown as the hover tooltip. */
  label: string;
};

/** A single icon-button action — copy, retry, feedback. */
function Action({
  label,
  className,
  variant = "ghost",
  size = "icon",
  children,
  ...props
}: ActionProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            aria-label={label}
            data-slot="ai-chat-action"
            className={cn(
              "astw:size-7 astw:shrink-0 astw:text-muted-foreground astw:hover:text-foreground",
              className,
            )}
            {...props}
          >
            {children}
          </Button>
        }
      />
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip.Root>
  );
}

export { Actions, Action, type ActionsProps, type ActionProps };
