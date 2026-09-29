import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { Brain } from "lucide-react";

import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import {
  DisclosureRoot,
  DisclosureTrigger,
  DisclosureChevron,
  DisclosurePanel,
} from "./disclosure";
import { Response } from "./response";

type ReasoningContextValue = {
  isStreaming: boolean;
  duration?: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

function useReasoningContext(component: string): ReasoningContextValue {
  const ctx = useContext(ReasoningContext);
  if (!ctx) throw new Error(`<${component}> must be used within <Reasoning>`);
  return ctx;
}

type ReasoningProps = ComponentProps<"div"> & {
  /** True while reasoning tokens are still arriving. */
  isStreaming?: boolean;
  /** Seconds spent thinking; shown in the trigger once streaming ends. */
  duration?: number;
  /** Keep the block open even when no tokens are streaming. */
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Collapsible "thinking" block for models that stream reasoning before the
 * final answer. Follows the stream — open while tokens arrive, closed once
 * they stop — until the reader toggles it, after which their choice sticks.
 *
 * @example
 * ```tsx
 * <AIChat.Reasoning isStreaming={reasoning.streaming} duration={reasoning.duration}>
 *   <AIChat.ReasoningTrigger />
 *   <AIChat.ReasoningContent>{reasoning.text}</AIChat.ReasoningContent>
 * </AIChat.Reasoning>
 * ```
 */
function Reasoning({
  className,
  isStreaming = false,
  duration,
  defaultOpen = false,
  children,
  ...props
}: ReasoningProps) {
  // `null` until the reader takes over; from then on their choice wins.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? (isStreaming || defaultOpen);

  return (
    <ReasoningContext.Provider value={{ isStreaming, duration }}>
      <DisclosureRoot className={className} open={open} onOpenChange={setManualOpen} {...props}>
        {children}
      </DisclosureRoot>
    </ReasoningContext.Provider>
  );
}

type ReasoningTriggerProps = Omit<ComponentProps<typeof DisclosureTrigger>, "children"> & {
  /** Overrides the default "Thinking… / Thought for Ns" label. */
  label?: string;
};

function ReasoningTrigger({ label, className, ...props }: ReasoningTriggerProps) {
  const { isStreaming, duration } = useReasoningContext("ReasoningTrigger");
  const t = useT();

  const resolveLabel = () => {
    if (label) return label;
    if (isStreaming) return t("aiChatThinking");
    if (duration != null) return t("aiChatThoughtFor", { seconds: duration });
    return t("aiChatReasoning");
  };

  return (
    <DisclosureTrigger className={className} {...props}>
      <Brain className="astw:size-3.5" aria-hidden />
      <span className={cn(isStreaming && "astw:animate-pulse")}>{resolveLabel()}</span>
      <DisclosureChevron />
    </DisclosureTrigger>
  );
}

type ReasoningContentProps = Omit<ComponentProps<typeof DisclosurePanel>, "children"> & {
  children: string;
};

function ReasoningContent({ children, className, ...props }: ReasoningContentProps) {
  return (
    <DisclosurePanel
      className={cn("astw:border-l-2 astw:pl-3 astw:text-sm astw:text-muted-foreground", className)}
      {...props}
    >
      <Response>{children}</Response>
    </DisclosurePanel>
  );
}

export {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  type ReasoningProps,
  type ReasoningTriggerProps,
  type ReasoningContentProps,
};
