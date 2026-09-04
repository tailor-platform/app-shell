import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
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
/**
 * Emits each distinct message once per mounted root.
 *
 * The root re-renders on every streamed token, so warning inline during
 * render would repeat the same line hundreds of times in a single response —
 * and twice per render again under StrictMode. Deliberately not gated on
 * `process.env.NODE_ENV`: this package has no other reference to `process`,
 * and adding one would break consumers whose bundler does not shim it.
 */
function useOnceWarnings(warnings: readonly string[]) {
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const warning of warnings) {
      if (seen.current.has(warning)) continue;
      seen.current.add(warning);
      console.warn(warning);
    }
  });
}

type Regions = {
  header?: ReactElement;
  conversation?: ReactElement;
  composer?: ReactElement;
  warnings: string[];
};

/**
 * Sorts children into the three regions by component identity, so the root can
 * render them in a fixed order whatever order they were written in. Matching
 * on identity means a region has to be a direct child — the warning says so,
 * because wrapping one in your own component is the way this bites.
 */
function splitRegions(children: ReactNode): Regions {
  const regions: Regions = { warnings: [] };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Header) {
      if (regions.header) {
        regions.warnings.push("AIChat: more than one AIChat.Header; only the first is rendered.");
      }
      regions.header ??= child;
    } else if (child.type === Conversation) {
      if (regions.conversation) {
        regions.warnings.push(
          "AIChat: more than one AIChat.Conversation; only the first is rendered.",
        );
      }
      regions.conversation ??= child;
    } else if (child.type === Composer) {
      if (regions.composer) {
        regions.warnings.push("AIChat: more than one AIChat.Composer; only the first is rendered.");
      }
      regions.composer ??= child;
    } else {
      regions.warnings.push(
        "AIChat: children must be AIChat.Header, AIChat.Conversation, or AIChat.Composer, " +
          "as direct children — a region wrapped in your own component is not recognised. " +
          "Other children are dropped; put the transcript inside AIChat.Conversation.",
      );
    }
  });

  if (!regions.conversation) {
    regions.warnings.push(
      "AIChat: no AIChat.Conversation child; the transcript region will be empty.",
    );
  }

  return regions;
}

function AIChatRoot({ className, children, status = "ready", ...props }: AIChatProps) {
  const { header, conversation, composer, warnings } = useMemo(
    () => splitRegions(children),
    [children],
  );

  useOnceWarnings(warnings);

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
