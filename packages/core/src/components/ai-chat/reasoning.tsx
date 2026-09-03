import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Brain, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { DisclosureRoot, DisclosureTrigger, DisclosurePanel } from "./disclosure";
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
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Collapsible "thinking" block for models that stream reasoning before the
 * final answer. Auto-opens when `isStreaming` turns true and auto-closes when
 * it turns false — thinking stays visible while it happens, then tucks away
 * once the reader has taken over by toggling it manually.
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
  const [open, setOpen] = useState(defaultOpen || isStreaming);
  const userToggledRef = useRef(false);

  useEffect(() => {
    if (!userToggledRef.current) setOpen(isStreaming);
  }, [isStreaming]);

  return (
    <ReasoningContext.Provider value={{ isStreaming, duration }}>
      <DisclosureRoot
        className={className}
        open={open}
        onOpenChange={(next) => {
          userToggledRef.current = true;
          setOpen(next);
        }}
        {...props}
      >
        {children}
      </DisclosureRoot>
    </ReasoningContext.Provider>
  );
}

type ReasoningTriggerProps = Omit<ComponentProps<typeof DisclosureTrigger>, "children"> & {
  /** Overrides the default "Thinking… / Thought for Ns" label. */
  label?: string;
};

function defaultReasoningLabel(isStreaming: boolean, duration: number | undefined): string {
  if (isStreaming) return "Thinking…";
  if (duration != null) return `Thought for ${duration}s`;
  return "Reasoning";
}

function ReasoningTrigger({ label, className, ...props }: ReasoningTriggerProps) {
  const { isStreaming, duration } = useReasoningContext("ReasoningTrigger");
  const defaultLabel = defaultReasoningLabel(isStreaming, duration);

  return (
    <DisclosureTrigger className={className} {...props}>
      <Brain className="astw:size-3.5" aria-hidden />
      <span className={cn(isStreaming && "astw:animate-pulse")}>{label ?? defaultLabel}</span>
      <ChevronDown
        className="ai-chat-disclosure-chevron astw:size-3 astw:transition-transform"
        aria-hidden
      />
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
