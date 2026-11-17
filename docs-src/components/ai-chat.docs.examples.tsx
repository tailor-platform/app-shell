import { useState } from "react";
import { AIChat, Card, Text, useAIChat, type AIGatewayClient } from "@tailor-platform/app-shell";

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
