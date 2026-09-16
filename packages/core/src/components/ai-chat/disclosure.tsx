import type * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";

import { cn } from "@/lib/utils";

// Shared collapsible shape for Reasoning, ChainOfThought, Tool, and Sources:
// a trigger row (label + chevron) over a hidden panel, differing only in what
// the trigger and panel contain. Open state, ARIA, and the `data-panel-open`
// attribute all come from Base UI's Collapsible.

// The trigger carries `data-panel-open`, so the chevron rotates through a
// descendant selector keyed on this class. The selector below has to spell the
// class out literally — Tailwind only compiles utilities it can read as static
// strings in source, so an interpolated one would resolve to nothing.
const CHEVRON_MARKER = "ai-chat-disclosure-chevron";

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

/** Trailing chevron for a `DisclosureTrigger`; rotates when its trigger opens. */
function DisclosureChevron({ className }: { className?: string }) {
  return (
    <ChevronDown
      className={cn(CHEVRON_MARKER, "astw:size-3 astw:transition-transform", className)}
      aria-hidden
    />
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

export { DisclosureRoot, DisclosureTrigger, DisclosureChevron, DisclosurePanel };
