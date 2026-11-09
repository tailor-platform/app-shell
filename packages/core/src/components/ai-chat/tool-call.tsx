import { Wrench } from "lucide-react";

import type { useAIChat } from "@/ai/use-ai-chat";
import { Badge } from "@/components/badge";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";

type AIChatToolCallProps = {
  /** A requested tool from useAIChat().toolCalls, not an execution success receipt. */
  call: ReturnType<typeof useAIChat>["toolCalls"][number];
  className?: string;
};

/** Compact tool-call label for the active flow, rendered as its own row. */
function ToolCall({ call, className }: AIChatToolCallProps) {
  const t = useT();

  return (
    <div data-slot="ai-chat-tool-call" className={cn("astw:flex astw:items-start", className)}>
      <Badge variant="neutral" className="astw:gap-1">
        <Wrench className="astw:size-3" aria-hidden />
        {t("aiChatToolCall", { name: call.name })}
      </Badge>
    </div>
  );
}

export { ToolCall, type AIChatToolCallProps };
