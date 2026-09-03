import { useState, type ComponentProps, type ReactNode } from "react";

import type { AIChatStatus } from "@/ai/use-ai-chat";
import { cn } from "@/lib/utils";
import { Action, Actions } from "./actions";
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
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "./conversation";
import { Message } from "./message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";
import { Response } from "./response";
import { Source, Sources, SourcesContent, SourcesTrigger } from "./sources";
import { Suggestion, Suggestions } from "./suggestion";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "./tool";

type AIChatProps = Omit<ComponentProps<"div">, "children" | "onSubmit"> & {
  /** The transcript — compose it from `AIChat.Message`, `.Response`, `.Reasoning`, `.Tool`, `.Sources`, etc., or `AIChat.EmptyState` while there is none yet. */
  children: ReactNode;
  /** Drives the composer's busy/Stop state. Plugs directly into `useAIChat()`'s `status`. */
  status?: AIChatStatus;
  /** Called with the trimmed prompt and any staged attachments when the composer submits. */
  onSubmit: (message: string, attachments: AIChatAttachment[]) => void;
  /** Called when the Stop button is pressed while `status` is `"submitted"` or `"streaming"`. Omit to show a plain busy state with no Stop affordance. */
  onStop?: () => void;
  /** Controlled composer draft. Cleared (via `onValueChange("")`) after a successful submit. */
  value?: string;
  /** Uncontrolled composer draft's initial value. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Disables the whole composer (not the transcript above it). */
  disabled?: boolean;
  /**
   * Enter submits the composer; Shift+Enter inserts a newline. IME-safe:
   * Enter during kana→kanji conversion confirms the candidate rather than
   * submitting.
   * @default true
   */
  submitOnEnter?: boolean;
  /**
   * Keep the transcript scrolled to the latest turn while the reader is
   * pinned to the bottom.
   * @default true
   */
  autoScroll?: boolean;
  /**
   * Show the composer's attach-file button and staged-attachment chips.
   * @default false
   */
  attachments?: boolean;
  /** Accepted file types for the hidden file input, when `attachments` is enabled. */
  accept?: string;
  /** @default true */
  multiple?: boolean;
  /** Open slot on the composer's action row, left of the attach button — a visibility toggle, a model picker, a template select. */
  composerActions?: ReactNode;
};

/**
 * Building blocks for an LLM assistant UI: a streaming conversation view
 * with a fixed composer. `AIChat` owns the frame — the scrollable transcript
 * area and the composer — and takes the transcript itself as `children`, so
 * callers compose each turn from the attached parts (`AIChat.Message`,
 * `AIChat.Response`, `AIChat.Reasoning`, `AIChat.Tool`, `AIChat.Sources`, …)
 * against their own `useAIChat()` state.
 *
 * Renders no border or background of its own — wrap it in `Card.Root`,
 * `Sheet`, or a `Layout.Column` for the surrounding surface.
 *
 * @example
 * ```tsx
 * const { messages, status, sendMessage, stop } = useAIChat({ client, model: "gpt-5" });
 *
 * <Card.Root className="astw:flex astw:h-full astw:flex-col">
 *   <Card.Header title="Assistant" />
 *   <AIChat status={status} onSubmit={sendMessage} onStop={stop} className="astw:min-h-0 astw:flex-1">
 *     {messages.length === 0 ? (
 *       <AIChat.EmptyState title="Ask the assistant" />
 *     ) : (
 *       messages.map((message) => (
 *         <AIChat.Message key={message.id} from={message.role}>
 *           <AIChat.Response>{message.content}</AIChat.Response>
 *         </AIChat.Message>
 *       ))
 *     )}
 *   </AIChat>
 * </Card.Root>
 * ```
 */
function AIChatRoot({
  className,
  children,
  status = "ready",
  onSubmit,
  onStop,
  value,
  defaultValue = "",
  onValueChange,
  placeholder,
  disabled = false,
  submitOnEnter = true,
  autoScroll = true,
  attachments = false,
  accept,
  multiple = true,
  composerActions,
  ...props
}: AIChatProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const draft = value ?? internalValue;

  const setDraft = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <div
      data-slot="ai-chat"
      className={cn("astw:flex astw:h-full astw:min-h-0 astw:flex-col", className)}
      {...props}
    >
      <Conversation autoScroll={autoScroll}>
        <ConversationContent>{children}</ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <Composer
        value={draft}
        onValueChange={setDraft}
        onSubmit={onSubmit}
        onStop={onStop}
        status={status}
        placeholder={placeholder}
        disabled={disabled}
        submitOnEnter={submitOnEnter}
        attachments={attachments}
        accept={accept}
        multiple={multiple}
        composerActions={composerActions}
      />
    </div>
  );
}

type AIChatComponent = typeof AIChatRoot & {
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
export type { ToolState } from "./tool";
export type { ChainOfThoughtStepStatus } from "./chain-of-thought";
export type { ChatHistoryGroupData, ChatHistoryItemData } from "./chat-history";
