import { MessageSquare, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";

import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";

type ChatHistoryItemData = {
  id: string;
  title: string;
};

type ChatHistoryGroupData = {
  title: string;
  items: ChatHistoryItemData[];
};

type ChatHistoryProps = Omit<ComponentProps<"nav">, "onSelect"> & {
  groups: ChatHistoryGroupData[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
};

/**
 * Grouped list of past conversations ("Today", "Previous 7 days", …) for
 * reopening an earlier chat. Layout-agnostic — render it in a popover, a
 * `Sheet`, or a sidebar section of a full chat page. Group titles and date
 * bucketing are the caller's own. Deleting is optional — pass `onDelete` to
 * reveal a delete button on hover.
 */
function ChatHistory({
  groups,
  activeId,
  onSelect,
  onDelete,
  className,
  ...props
}: ChatHistoryProps) {
  const t = useT();

  return (
    <nav
      data-slot="ai-chat-history"
      className={cn("astw:flex astw:flex-col astw:gap-4", className)}
      aria-label={t("aiChatConversationHistory")}
      {...props}
    >
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <div key={group.title} className="astw:space-y-0.5">
            <div className="astw:px-2 astw:pb-1 astw:text-[11px] astw:font-medium astw:uppercase astw:tracking-wide astw:text-muted-foreground">
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = item.id === activeId;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "astw:group astw:flex astw:w-full astw:items-center astw:rounded-md",
                    active ? "astw:bg-muted" : "astw:hover:bg-muted",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect?.(item.id)}
                    className={cn(
                      "astw:flex astw:min-w-0 astw:flex-1 astw:items-center astw:gap-2 astw:px-2 astw:py-1.5 astw:text-left astw:text-sm",
                      active
                        ? "astw:font-medium astw:text-foreground"
                        : "astw:text-muted-foreground astw:group-hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="astw:size-4 astw:shrink-0" aria-hidden />
                    <span className="astw:truncate">{item.title}</span>
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      aria-label={t("aiChatDeleteConversation", { title: item.title })}
                      onClick={() => onDelete(item.id)}
                      className="astw:mr-1 astw:hidden astw:shrink-0 astw:rounded astw:p-1 astw:text-muted-foreground astw:hover:text-destructive astw:group-hover:block"
                    >
                      <Trash2 className="astw:size-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
    </nav>
  );
}

export { ChatHistory, type ChatHistoryProps, type ChatHistoryGroupData, type ChatHistoryItemData };
