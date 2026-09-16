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

// Picked rather than inherited: an action is a fixed-size ghost icon button,
// so `Button`'s variant, size and type are not ours to hand out.
type ActionProps = Pick<
  React.ComponentProps<typeof Button>,
  "className" | "disabled" | "children" | "onClick"
> & {
  /** Accessible name; also shown as the hover tooltip. */
  label: string;
};

/** A single icon-button action — copy, retry, feedback. */
function Action({ label, className, disabled, children, onClick }: ActionProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            data-slot="ai-chat-action"
            className={cn(
              "astw:size-7 astw:shrink-0 astw:text-muted-foreground astw:hover:text-foreground",
              className,
            )}
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
