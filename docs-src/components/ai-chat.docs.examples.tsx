import { useState } from "react";
import {
  ChevronsRightIcon,
  CopyIcon,
  EraserIcon,
  HistoryIcon,
  RotateCcwIcon,
  SparklesIcon,
  ThumbsUpIcon,
} from "lucide-react";
import {
  AIChat,
  Button,
  Card,
  Select,
  Text,
  useAIChat,
  type AIGatewayClient,
  type ToolState,
} from "@tailor-platform/app-shell";

export function BasicUsage() {
  const [client] = useState<AIGatewayClient>(() => ({
    async *streamChatCompletion({ signal }) {
      const chunks = [
        "This is a **local demo response**.",
        "\n\n",
        "The real `useAIChat()` hook ",
        "manages this conversation ",
        "and receives these chunks ",
        "from an in-memory client.",
        "\n\n",
        "No prompt is sent to a server. ",
        "Send another message, ",
        "or press **Stop** while the response is streaming.",
      ];
      for (const text of chunks) {
        if (signal?.aborted) return;
        // Delay fixture chunks so streaming and Stop can be tried without a server.
        await new Promise<void>((resolve) => setTimeout(resolve, 180));
        if (signal?.aborted) return;
        yield { type: "text-delta", text };
      }
      yield { type: "done" };
    },
  }));
  const { messages, status, error, sendMessage, stop } = useAIChat({ client, model: "demo" });

  return (
    <div className="flex flex-col gap-3">
      {error && <Text.p role="alert">{error.message}</Text.p>}
      <Card.Root className="flex h-96 flex-col overflow-hidden">
        <AIChat status={status}>
          <AIChat.Header title="Assistant" />
          <AIChat.Conversation>
            {messages.length === 0 ? (
              <AIChat.EmptyState
                title="Try the assistant"
                description="Replies are simulated locally. Send a message, then try Stop."
              />
            ) : (
              messages.map((message) => (
                <AIChat.Message key={message.id} from={message.role}>
                  <AIChat.Response>{message.content}</AIChat.Response>
                </AIChat.Message>
              ))
            )}
          </AIChat.Conversation>
          <AIChat.Composer onSubmit={sendMessage} onStop={stop} />
        </AIChat>
      </Card.Root>
    </div>
  );
}

export function HeaderActions() {
  const [collapsed, setCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState("Your purchase order is ready for review.");

  if (collapsed) return <Button onClick={() => setCollapsed(false)}>Open assistant</Button>;

  return (
    <Card.Root className="flex h-64 flex-col overflow-hidden">
      <AIChat>
        <AIChat.Header
          title={showHistory ? "Conversation history" : "Assistant"}
          icon={
            <AIChat.Action label="Collapse assistant" onClick={() => setCollapsed(true)}>
              <ChevronsRightIcon aria-hidden />
            </AIChat.Action>
          }
          actions={
            <>
              <AIChat.Action
                label={showHistory ? "Back to conversation" : "Conversation history"}
                onClick={() => setShowHistory((value) => !value)}
              >
                <HistoryIcon aria-hidden />
              </AIChat.Action>
              <AIChat.Action
                label="Clear conversation"
                onClick={() => {
                  setMessage("");
                  setShowHistory(false);
                }}
              >
                <EraserIcon aria-hidden />
              </AIChat.Action>
            </>
          }
        />
        <AIChat.Conversation>
          {showHistory ? (
            <AIChat.EmptyState
              title="No older conversations"
              description="Use Back to conversation to return to the current transcript."
            />
          ) : message ? (
            <AIChat.Message from="assistant">
              <AIChat.Response>{message}</AIChat.Response>
            </AIChat.Message>
          ) : (
            <AIChat.EmptyState
              title="Conversation cleared"
              description="Only this local example was cleared."
            />
          )}
        </AIChat.Conversation>
      </AIChat>
    </Card.Root>
  );
}

export function EmptyStateSuggestions() {
  const [prompt, setPrompt] = useState<string | null>(null);

  return (
    <Card.Root className="flex h-80 flex-col overflow-hidden">
      <AIChat>
        <AIChat.Header
          title="Local suggestions"
          actions={
            <AIChat.Action label="Reset suggestions" onClick={() => setPrompt(null)}>
              <RotateCcwIcon aria-hidden />
            </AIChat.Action>
          }
        />
        <AIChat.Conversation>
          {prompt === null ? (
            <AIChat.EmptyState
              icon={<SparklesIcon className="size-6 text-primary" aria-hidden />}
              title="Ask the assistant"
              description="Choose a starter prompt. No request is sent."
            >
              <AIChat.Suggestions>
                <AIChat.Suggestion
                  suggestion="How do I create a purchase order?"
                  onSelect={setPrompt}
                />
                <AIChat.Suggestion suggestion="Summarize my open orders" onSelect={setPrompt} />
              </AIChat.Suggestions>
            </AIChat.EmptyState>
          ) : (
            <>
              <AIChat.Message from="user">
                <AIChat.Response>{prompt}</AIChat.Response>
              </AIChat.Message>
              <AIChat.Message from="assistant">
                <AIChat.Response>
                  This predefined local reply shows where an application would render the answer.
                </AIChat.Response>
              </AIChat.Message>
            </>
          )}
        </AIChat.Conversation>
      </AIChat>
    </Card.Root>
  );
}

export function MessageActions() {
  const [revision, setRevision] = useState(1);
  const [feedback, setFeedback] = useState("No action selected.");
  const response = `Summary revision ${revision}: three orders are ready for review.`;

  async function copyResponse() {
    try {
      await navigator.clipboard.writeText(response);
      setFeedback("Response copied.");
    } catch {
      setFeedback("Clipboard access is unavailable. Select the response text to copy it manually.");
    }
  }

  return (
    <div className="space-y-3">
      <AIChat.Message from="assistant">
        <AIChat.Response>{response}</AIChat.Response>
        <AIChat.Actions>
          <AIChat.Action label="Copy response" onClick={() => void copyResponse()}>
            <CopyIcon aria-hidden />
          </AIChat.Action>
          <AIChat.Action
            label="Retry response"
            onClick={() => {
              setRevision((value) => value + 1);
              setFeedback("Generated another local revision.");
            }}
          >
            <RotateCcwIcon aria-hidden />
          </AIChat.Action>
          <AIChat.Action
            label="Mark response helpful"
            onClick={() => setFeedback("Marked helpful.")}
          >
            <ThumbsUpIcon aria-hidden />
          </AIChat.Action>
        </AIChat.Actions>
      </AIChat.Message>
      <Text.p role="status">{feedback}</Text.p>
    </div>
  );
}

export function ActiveToolCalls() {
  const [active, setActive] = useState(true);
  const calls = [
    { id: "search", name: "search_help_articles" },
    { id: "orders", name: "list_open_orders" },
  ];

  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setActive((value) => !value)}>
        {active ? "Finish request" : "Show requested calls"}
      </Button>
      {active ? (
        <AIChat.Message from="assistant">
          {calls.map((call) => (
            <AIChat.ToolCall key={call.id} call={call} />
          ))}
        </AIChat.Message>
      ) : (
        <Text.p role="status">No active tool requests.</Text.p>
      )}
      <Text.p>
        These fixture names represent requests, not execution results. No tools are executed.
      </Text.p>
    </div>
  );
}

export function ToolLifecycle() {
  const states: ToolState[] = [
    "input-streaming",
    "input-available",
    "output-available",
    "output-error",
  ];
  const [state, setState] = useState<ToolState>("output-available");

  return (
    <div className="space-y-3">
      <Select
        aria-label="Tool lifecycle state"
        items={states}
        value={state}
        onValueChange={(value) => {
          if (value) setState(value);
        }}
      />
      <AIChat.Tool defaultOpen>
        <AIChat.ToolHeader
          toolName="search_help_articles"
          title="Search help articles"
          state={state}
        />
        <AIChat.ToolContent>
          <AIChat.ToolInput input={{ query: "purchase order" }} />
          <AIChat.ToolOutput
            output={
              state === "output-available"
                ? { matches: [{ title: "Creating a purchase order" }] }
                : undefined
            }
            errorText={
              state === "output-error" ? "The local help index is unavailable." : undefined
            }
          />
        </AIChat.ToolContent>
      </AIChat.Tool>
      <Text.p>
        Change the state to inspect the presentation. Inputs, results, and errors are local
        fixtures.
      </Text.p>
    </div>
  );
}

export function CitationSources() {
  const sources = [
    {
      id: "purchase-orders",
      title: "Purchase order guide",
      excerpt: "Create a draft, add line items, then confirm the purchase order.",
    },
    {
      id: "approvals",
      title: "Approval policy",
      excerpt: "An authorized reviewer checks quantities and delivery dates before approval.",
    },
  ];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sources.find((source) => source.id === selectedId);

  return (
    <div className="space-y-3">
      <AIChat.Sources>
        <AIChat.SourcesTrigger count={sources.length} />
        <AIChat.SourcesContent>
          {sources.map((source) => (
            <AIChat.Source
              key={source.id}
              title={source.title}
              onClick={() => setSelectedId(source.id)}
            />
          ))}
        </AIChat.SourcesContent>
      </AIChat.Sources>
      <Text.p role="status">
        {selected
          ? `${selected.title}: ${selected.excerpt}`
          : "Expand the citations, then choose a source to read its local excerpt."}
      </Text.p>
    </div>
  );
}

export function ConversationHistory() {
  const initialConversations = [
    {
      id: "purchase-orders",
      title: "Creating a purchase order",
      summary: "Start with a draft and add the required line items.",
    },
    {
      id: "stock",
      title: "Checking available stock",
      summary: "Review the available quantity at each warehouse.",
    },
  ];
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState("purchase-orders");
  const selected = conversations.find((conversation) => conversation.id === activeId);

  return (
    <div className="space-y-3">
      <Text.p>
        Choose a saved conversation to read it. Delete affects only these local fixtures.
      </Text.p>
      <AIChat.History
        groups={[{ title: "Today", items: conversations }]}
        activeId={activeId}
        onSelect={setActiveId}
        onDelete={(id) => {
          setConversations((current) => current.filter((conversation) => conversation.id !== id));
          setActiveId((current) => (current === id ? "" : current));
        }}
      />
      <Text.p role="status">
        {selected ? `${selected.title}: ${selected.summary}` : "No conversation selected."}
      </Text.p>
      <Button
        variant="outline"
        onClick={() => {
          setConversations(initialConversations);
          setActiveId("purchase-orders");
        }}
      >
        Reset history
      </Button>
    </div>
  );
}

export function Message() {
  return (
    <AIChat.Message from="assistant">
      <AIChat.Response>Your purchase order is ready for review.</AIChat.Response>
    </AIChat.Message>
  );
}

export function Response() {
  return (
    <AIChat.Response>
      {
        "## Order summary\n\nThe order is **ready for review**.\n\n- Check the `quantity` for each line.\n- Confirm the delivery date.\n\n[Read the documentation](/components/ai-chat)."
      }
    </AIChat.Response>
  );
}

export function Reasoning() {
  return (
    <AIChat.Reasoning isStreaming={false} duration={3} defaultOpen>
      <AIChat.ReasoningTrigger />
      <AIChat.ReasoningContent>
        {
          "I will check the order totals, then compare the requested delivery date with the supplier's lead time."
        }
      </AIChat.ReasoningContent>
    </AIChat.Reasoning>
  );
}

export function ChainOfThought() {
  return (
    <AIChat.ChainOfThought defaultOpen>
      <AIChat.ChainOfThoughtHeader />
      <AIChat.ChainOfThoughtContent>
        <AIChat.ChainOfThoughtStep label="Searching the knowledge base" status="complete">
          <AIChat.ChainOfThoughtSearchResults>
            <AIChat.ChainOfThoughtSearchResult>12 hits</AIChat.ChainOfThoughtSearchResult>
          </AIChat.ChainOfThoughtSearchResults>
        </AIChat.ChainOfThoughtStep>
        <AIChat.ChainOfThoughtStep label="Drafting the answer" status="active" />
      </AIChat.ChainOfThoughtContent>
    </AIChat.ChainOfThought>
  );
}
