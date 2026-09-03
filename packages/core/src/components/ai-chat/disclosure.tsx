import type * as React from "react";
import { Collapsible } from "@base-ui/react/collapsible";

import { cn } from "@/lib/utils";

// Shared collapsible shape for Reasoning, ChainOfThought, Tool, and Sources —
// all four are a trigger row (label + chevron) over a hidden panel, differing
// only in what the trigger and panel contain. Wraps Base UI's Collapsible the
// same way `SidebarGroup` does, so state, ARIA (aria-expanded/aria-controls),
// and the `data-panel-open` attribute all come from Base UI rather than four
// separate hand-rolled `useState` + `aria-*` implementations.

type DisclosureRootProps = Pick<
  React.ComponentProps<typeof Collapsible.Root>,
  "open" | "defaultOpen" | "onOpenChange"
> & { className?: string; children: React.ReactNode };

function DisclosureRoot({ className, children, ...props }: DisclosureRootProps) {
  return (
    <Collapsible.Root
      data-slot="ai-chat-disclosure"
      className={cn("astw:w-full", className)}
      {...props}
    >
      {children}
    </Collapsible.Root>
  );
}

type DisclosureTriggerProps = Omit<React.ComponentProps<typeof Collapsible.Trigger>, "children"> & {
  children: React.ReactNode;
};

// The chevron rotates off `[data-panel-open]` on this trigger via a descendant
// selector (`.ai-chat-disclosure-chevron`) rather than its own state — the same
// technique `SidebarGroup` uses for its `.astw-rotate-target` marker.
function DisclosureTrigger({ className, children, ...props }: DisclosureTriggerProps) {
  return (
    <Collapsible.Trigger
      data-slot="ai-chat-disclosure-trigger"
      className={cn(
        "astw:flex astw:w-fit astw:items-center astw:gap-1.5 astw:text-xs astw:text-muted-foreground astw:hover:text-foreground",
        "astw:[&[data-panel-open]_.ai-chat-disclosure-chevron]:rotate-180",
        className,
      )}
      {...props}
    >
      {children}
    </Collapsible.Trigger>
  );
}

type DisclosurePanelProps = React.ComponentProps<typeof Collapsible.Panel>;

function DisclosurePanel({ className, ...props }: DisclosurePanelProps) {
  return (
    <Collapsible.Panel
      data-slot="ai-chat-disclosure-panel"
      className={cn("astw:mt-2", className)}
      {...props}
    />
  );
}

export { DisclosureRoot, DisclosureTrigger, DisclosurePanel };
