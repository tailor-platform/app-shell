import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

import type { AIChatStatus } from "@/ai/use-ai-chat";
import { cn } from "@/lib/utils";
import { Action, Actions } from "./actions";
import { AIChatContext } from "./ai-chat-context";
import type { AIChatAttachment } from "./attachment-chip";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "./chain-of-thought";
import { ChatHistory } from "./chat-history";
import { Composer } from "./composer";
import { Conversation, ConversationEmptyState } from "./conversation";
import { Header } from "./header";
import { Message } from "./message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";
import { Response } from "./response";
import { Source, Sources, SourcesContent, SourcesTrigger } from "./sources";
import { Suggestion, Suggestions } from "./suggestion";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "./tool";

type AIChatProps = Omit<ComponentProps<"div">, "children"> & {
  /** `AIChat.Header`, `AIChat.Conversation`, and `AIChat.Composer`, in any order — the root places them. */
  children: ReactNode;
  /** The chat's state. Plugs directly into `useAIChat()`'s `status`; `AIChat.Composer` reads it for its busy/Stop state. */
  status?: AIChatStatus;
};

/**
 * Building blocks for an LLM assistant UI. `AIChat` owns the frame and places
 * its three regions in a fixed order — `AIChat.Header` (optional) over
 * `AIChat.Conversation` (required) over `AIChat.Composer` (optional) — so the
 * transcript always scrolls internally while the header and composer stay
 * pinned. Each region carries its own props; the root carries the chat's
 * `status`.
 *
 * Fills the height its parent gives it and renders no border or background of
 * its own — wrap it in `Card.Root`, `Sheet`, or a `Layout.Column`.
 *
 * @example
 * ```tsx
 * const { messages, status, sendMessage, stop } = useAIChat({ client, model: "gpt-5" });
 *
 * <Card.Root className="astw:flex astw:h-full astw:flex-col astw:overflow-hidden">
 *   <AIChat status={status}>
 *     <AIChat.Header title="Assistant" />
 *     <AIChat.Conversation>
 *       {messages.length === 0 ? (
 *         <AIChat.EmptyState title="Ask the assistant" />
 *       ) : (
 *         messages.map((message) => (
 *           <AIChat.Message key={message.id} from={message.role}>
 *             <AIChat.Response>{message.content}</AIChat.Response>
 *           </AIChat.Message>
 *         ))
 *       )}
 *     </AIChat.Conversation>
 *     <AIChat.Composer onSubmit={sendMessage} onStop={stop} />
 *   </AIChat>
 * </Card.Root>
 * ```
 */
function AIChatRoot({ className, children, status = "ready", ...props }: AIChatProps) {
  let header: ReactElement | undefined;
  let conversation: ReactElement | undefined;
  let composer: ReactElement | undefined;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Header) {
      if (header) console.warn("AIChat: more than one AIChat.Header; only the first is rendered.");
      header ??= child;
    } else if (child.type === Conversation) {
      if (conversation) {
        console.warn("AIChat: more than one AIChat.Conversation; only the first is rendered.");
      }
      conversation ??= child;
    } else if (child.type === Composer) {
      if (composer)
        console.warn("AIChat: more than one AIChat.Composer; only the first is rendered.");
      composer ??= child;
    } else {
      console.warn(
        "AIChat: children must be AIChat.Header, AIChat.Conversation, or AIChat.Composer. " +
          "Other children are dropped — put the transcript inside AIChat.Conversation.",
      );
    }
  });

  if (!conversation) {
    console.warn("AIChat: no AIChat.Conversation child; the transcript region will be empty.");
  }

  return (
    <AIChatContext.Provider value={{ status }}>
      <div
        data-slot="ai-chat"
        // `h-full` fills a block parent; `flex-1 min-h-0` fills a flex-column
        // parent (a Card, a Layout.Column). Both are inert in the other case.
        className={cn("astw:flex astw:h-full astw:min-h-0 astw:flex-1 astw:flex-col", className)}
        {...props}
      >
        {header}
        {conversation}
        {composer}
      </div>
    </AIChatContext.Provider>
  );
}

type AIChatComponent = typeof AIChatRoot & {
  Header: typeof Header;
  Conversation: typeof Conversation;
  Composer: typeof Composer;
  EmptyState: typeof ConversationEmptyState;
  Message: typeof Message;
  Response: typeof Response;
  Suggestions: typeof Suggestions;
  Suggestion: typeof Suggestion;
  Actions: typeof Actions;
  Action: typeof Action;
  Reasoning: typeof Reasoning;
  ReasoningTrigger: typeof ReasoningTrigger;
  ReasoningContent: typeof ReasoningContent;
  ChainOfThought: typeof ChainOfThought;
  ChainOfThoughtHeader: typeof ChainOfThoughtHeader;
  ChainOfThoughtContent: typeof ChainOfThoughtContent;
  ChainOfThoughtStep: typeof ChainOfThoughtStep;
  ChainOfThoughtSearchResults: typeof ChainOfThoughtSearchResults;
  ChainOfThoughtSearchResult: typeof ChainOfThoughtSearchResult;
  Tool: typeof Tool;
  ToolHeader: typeof ToolHeader;
  ToolContent: typeof ToolContent;
  ToolInput: typeof ToolInput;
  ToolOutput: typeof ToolOutput;
  Sources: typeof Sources;
  SourcesTrigger: typeof SourcesTrigger;
  SourcesContent: typeof SourcesContent;
  Source: typeof Source;
  History: typeof ChatHistory;
};

const AIChat: AIChatComponent = Object.assign(AIChatRoot, {
  Header,
  Conversation,
  Composer,
  EmptyState: ConversationEmptyState,
  Message,
  Response,
  Suggestions,
  Suggestion,
  Actions,
  Action,
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
  History: ChatHistory,
});

export { AIChat, type AIChatProps, type AIChatAttachment };
export type { AIChatHeaderProps } from "./header";
export type { AIChatConversationProps } from "./conversation";
export type { AIChatComposerProps } from "./composer";
export type { ToolState } from "./tool";
export type { ChainOfThoughtStepStatus } from "./chain-of-thought";
export type { ChatHistoryGroupData, ChatHistoryItemData } from "./chat-history";
