import type { ComponentProps, ReactNode } from "react";
import { Book } from "lucide-react";

import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import {
  DisclosureRoot,
  DisclosureTrigger,
  DisclosureChevron,
  DisclosurePanel,
} from "./disclosure";

type SourcesProps = Omit<ComponentProps<typeof DisclosureRoot>, "children"> & {
  children: ReactNode;
};

/**
 * Collapsible citation list for a grounded answer. Renders a compact
 * "Used N sources" trigger under the answer; expanding lists each source the
 * model actually consulted.
 *
 * @example
 * ```tsx
 * <AIChat.Sources>
 *   <AIChat.SourcesTrigger count={sources.length} />
 *   <AIChat.SourcesContent>
 *     {sources.map((s) => (
 *       <AIChat.Source key={s.id} title={s.title} onClick={() => open(s.id)} />
 *     ))}
 *   </AIChat.SourcesContent>
 * </AIChat.Sources>
 * ```
 */
function Sources({ className, children, ...props }: SourcesProps) {
  return (
    <DisclosureRoot
      className={cn("astw:flex astw:flex-col astw:gap-1 astw:text-xs", className)}
      {...props}
    >
      {children}
    </DisclosureRoot>
  );
}

type SourcesTriggerProps = Omit<ComponentProps<typeof DisclosureTrigger>, "children"> & {
  count: number;
};

function SourcesTrigger({ count, className, ...props }: SourcesTriggerProps) {
  const t = useT();

  return (
    <DisclosureTrigger className={className} {...props}>
      <Book className="astw:size-3.5" aria-hidden />
      <span>{t("aiChatSourcesUsed", { count })}</span>
      <DisclosureChevron />
    </DisclosureTrigger>
  );
}

type SourcesContentProps = ComponentProps<typeof DisclosurePanel>;

function SourcesContent({ className, ...props }: SourcesContentProps) {
  return (
    <DisclosurePanel
      className={cn(
        "astw:flex astw:w-full astw:flex-col astw:gap-1 astw:rounded-md astw:bg-muted/50 astw:p-2 astw:text-xs astw:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

type SourceProps = Omit<ComponentProps<"button">, "title"> & {
  /** Display name of the cited document. */
  title: string;
};

function Source({ title, className, ...props }: SourceProps) {
  return (
    <button
      type="button"
      data-slot="ai-chat-source"
      className={cn(
        "astw:flex astw:w-fit astw:max-w-full astw:items-center astw:gap-1.5 astw:truncate astw:text-left astw:text-xs astw:text-muted-foreground astw:hover:text-foreground",
        className,
      )}
      {...props}
    >
      <Book className="astw:size-3 astw:shrink-0" aria-hidden />
      <span className="astw:truncate">{title}</span>
    </button>
  );
}

export {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
  type SourcesProps,
  type SourcesTriggerProps,
  type SourcesContentProps,
  type SourceProps,
};
