import type { ComponentProps, ReactNode } from "react";
import { ListTree, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/badge";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import {
  DisclosureRoot,
  DisclosureTrigger,
  DisclosureChevron,
  DisclosurePanel,
} from "./disclosure";

type ChainOfThoughtProps = Omit<ComponentProps<typeof DisclosureRoot>, "children"> & {
  children: ReactNode;
};

/**
 * Structured step timeline for agentic turns — the discrete plan being
 * executed, each step with a status and optional result chips. Use
 * `AIChat.Reasoning` for free-form thinking text and this for multi-step tool
 * plans.
 *
 * @example
 * ```tsx
 * <AIChat.ChainOfThought defaultOpen>
 *   <AIChat.ChainOfThoughtHeader />
 *   <AIChat.ChainOfThoughtContent>
 *     <AIChat.ChainOfThoughtStep label="Searching" status="complete" />
 *     <AIChat.ChainOfThoughtStep label="Drafting the answer" status="active" />
 *   </AIChat.ChainOfThoughtContent>
 * </AIChat.ChainOfThought>
 * ```
 */
function ChainOfThought({ className, children, ...props }: ChainOfThoughtProps) {
  return (
    <DisclosureRoot className={className} {...props}>
      {children}
    </DisclosureRoot>
  );
}

type ChainOfThoughtHeaderProps = Omit<ComponentProps<typeof DisclosureTrigger>, "children"> & {
  /** Overrides the default "Chain of thought" label. */
  label?: string;
};

function ChainOfThoughtHeader({ label, className, ...props }: ChainOfThoughtHeaderProps) {
  const t = useT();

  return (
    <DisclosureTrigger className={className} {...props}>
      <ListTree className="astw:size-3.5" aria-hidden />
      <span>{label ?? t("aiChatChainOfThought")}</span>
      <DisclosureChevron />
    </DisclosureTrigger>
  );
}

type ChainOfThoughtContentProps = ComponentProps<typeof DisclosurePanel>;

function ChainOfThoughtContent({ className, ...props }: ChainOfThoughtContentProps) {
  return (
    <DisclosurePanel className={cn("astw:mt-2 astw:flex astw:flex-col", className)} {...props} />
  );
}

type ChainOfThoughtStepStatus = "complete" | "active" | "pending";

const stepTextClass: Record<ChainOfThoughtStepStatus, string> = {
  complete: "astw:text-muted-foreground",
  active: "astw:text-foreground",
  pending: "astw:text-muted-foreground/50",
};

const stepIconClass: Record<ChainOfThoughtStepStatus, string> = {
  complete: "astw:text-muted-foreground",
  active: "astw:text-primary",
  pending: "astw:text-muted-foreground/40",
};

type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  label: string;
  description?: string;
  /** Lucide icon for the marker; a plain dot when omitted. */
  icon?: LucideIcon;
  status?: ChainOfThoughtStepStatus;
};

function ChainOfThoughtStep({
  label,
  description,
  icon: Icon,
  status = "complete",
  className,
  children,
  ...props
}: ChainOfThoughtStepProps) {
  return (
    <div
      data-slot="ai-chat-chain-of-thought-step"
      className={cn("astw:group astw:flex astw:gap-2 astw:text-sm", className)}
      {...props}
    >
      <div className="astw:flex astw:w-4 astw:shrink-0 astw:flex-col astw:items-center astw:gap-1">
        {Icon ? (
          <Icon
            className={cn(
              "astw:mt-0.5 astw:size-4",
              stepIconClass[status],
              status === "active" && "astw:animate-pulse",
            )}
            aria-hidden
          />
        ) : (
          <span
            className={cn(
              "astw:mt-1.5 astw:size-2 astw:rounded-full astw:bg-current",
              stepIconClass[status],
              status === "active" && "astw:animate-pulse",
            )}
            aria-hidden
          />
        )}
        <span className="astw:w-px astw:flex-1 astw:bg-border astw:group-last:hidden" aria-hidden />
      </div>
      <div
        className={cn(
          "astw:min-w-0 astw:flex-1 astw:space-y-1 astw:pb-4 astw:group-last:pb-0",
          stepTextClass[status],
        )}
      >
        <p className="astw:leading-5">{label}</p>
        {description ? <p className="astw:text-xs">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}

type ChainOfThoughtSearchResultsProps = ComponentProps<"div">;

function ChainOfThoughtSearchResults({ className, ...props }: ChainOfThoughtSearchResultsProps) {
  return (
    <div
      className={cn("astw:flex astw:flex-wrap astw:items-center astw:gap-1", className)}
      {...props}
    />
  );
}

// Picked rather than inherited: `variant` stays available because conveying
// status is what a Badge is for, but the rest of its surface is not ours.
type ChainOfThoughtSearchResultProps = Pick<
  ComponentProps<typeof Badge>,
  "className" | "children" | "variant"
>;

function ChainOfThoughtSearchResult({
  className,
  variant = "outline-neutral",
  children,
}: ChainOfThoughtSearchResultProps) {
  return (
    <Badge variant={variant} className={cn("astw:text-[10px] astw:font-normal", className)}>
      {children}
    </Badge>
  );
}

export {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  type ChainOfThoughtProps,
  type ChainOfThoughtHeaderProps,
  type ChainOfThoughtContentProps,
  type ChainOfThoughtStepProps,
  type ChainOfThoughtStepStatus,
  type ChainOfThoughtSearchResultsProps,
  type ChainOfThoughtSearchResultProps,
};
