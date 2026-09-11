import type * as React from "react";

import { cn } from "@/lib/utils";

type MessageProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Who sent the turn — styles the alignment and bubble. */
  from: "user" | "assistant";
  children: React.ReactNode;
};

/**
 * One turn in the conversation. User turns render as a right-aligned primary
 * bubble; assistant turns take the full width with no bubble, leaving room
 * for reasoning, tool calls, and citations to stack above the response text.
 * `data-from` is the styling hook for callers who need to target a turn from
 * outside.
 */
function Message({ className, from, children, ...props }: MessageProps) {
  return (
    <div
      data-slot="ai-chat-message"
      data-from={from}
      className={cn("astw:flex astw:w-full astw:flex-col astw:gap-2", className)}
      {...props}
    >
      <div
        data-slot="ai-chat-message-content"
        className={cn(
          "astw:flex astw:w-fit astw:min-w-0 astw:max-w-full astw:flex-col astw:gap-2 astw:text-sm astw:leading-relaxed",
          from === "user"
            ? "astw:ml-auto astw:max-w-[92%] astw:rounded-lg astw:bg-primary astw:px-3 astw:py-2 astw:text-primary-foreground"
            : "astw:w-full astw:px-3 astw:py-2 astw:text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { Message, type MessageProps };
