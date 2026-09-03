import { useMemo } from "react";
import { Copy, Eraser, RefreshCw, Sparkles } from "lucide-react";
import {
  AIChat,
  Card,
  Checkbox,
  defineResource,
  Layout,
  useAIChat,
  type AIChatCompletionEvent,
  type AIGatewayClient,
} from "@tailor-platform/app-shell";

// No AI Gateway is reachable from this example app, so the demo scripts a
// client matching `AIGatewayClient`'s exact shape — the same interface
// `createAIGatewayClient` returns. `useAIChat` and `AIChat` run their real
// production code paths against it; only the token source is canned. Chunk
// timing stands in for real network delay, and the loop honors `signal` so
// the composer's Stop button genuinely aborts mid-stream.
const REPLY =
  "Two things to check first:\n\n" +
  "- The **Approvals** tab — a pending row names the approver.\n" +
  "- The header badge: `SYNC_PENDING` clears on the next hourly ERP sync.\n\n" +
  "Details are in [Order approval workflow](/docs/order-approval).";

function createScriptedClient(): AIGatewayClient {
  return {
    async *streamChatCompletion({ signal }) {
      const words = REPLY.split(" ");
      for (const word of words) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 60);
          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        });
        yield { type: "text-delta", text: `${word} ` } satisfies AIChatCompletionEvent;
      }
      yield { type: "done" };
    },
  };
}

const SUGGESTIONS = [
  "How do I create a purchase order?",
  "Why is my order still pending?",
  "Summarize this week's inbound orders",
];

const AIChatDemoPage = () => {
  const client = useMemo(() => createScriptedClient(), []);
  const { messages, status, sendMessage, stop } = useAIChat({ client, model: "demo-model" });

  const retryLastQuestion = () => {
    const lastUserTurn = messages.findLast((message) => message.role === "user");
    if (lastUserTurn) void sendMessage(lastUserTurn.content);
  };

  return (
    <Layout fill>
      <Layout.Header title="AIChat Demo" />
      <Layout.Column>
        <p className="astw:text-sm astw:text-muted-foreground">
          Runs on a scripted mock — no model is called. Streaming, Stop, attachments, and the
          message actions all exercise the real component.
        </p>
        {/* `overflow-hidden` keeps the header rule inside the card's rounded corners. */}
        <Card.Root className="astw:flex astw:min-h-0 astw:flex-1 astw:flex-col astw:overflow-hidden">
          <AIChat
            title="Assistant"
            actions={
              <AIChat.Action label="Clear conversation" onClick={() => window.location.reload()}>
                <Eraser className="astw:size-3.5" aria-hidden />
              </AIChat.Action>
            }
            status={status}
            onSubmit={(message) => sendMessage(message)}
            onStop={stop}
            attachments
            composerActions={<Checkbox label="Search the knowledge base" />}
            placeholder="Ask about your orders…"
          >
            {messages.length === 0 ? (
              <AIChat.EmptyState>
                <Sparkles className="astw:size-6 astw:text-primary" aria-hidden />
                <div className="astw:space-y-1">
                  <h3 className="astw:text-sm astw:font-medium">Ask the assistant</h3>
                  <p className="astw:text-sm astw:text-muted-foreground">
                    Answers are grounded in your help articles. This demo runs on scripted data.
                  </p>
                </div>
                <AIChat.Suggestions>
                  {SUGGESTIONS.map((suggestion) => (
                    <AIChat.Suggestion
                      key={suggestion}
                      suggestion={suggestion}
                      onSelect={sendMessage}
                    />
                  ))}
                </AIChat.Suggestions>
              </AIChat.EmptyState>
            ) : (
              messages.map((message) => (
                <AIChat.Message key={message.id} from={message.role}>
                  <AIChat.Response>{message.content}</AIChat.Response>
                  {message.role === "assistant" && status === "ready" && message.content ? (
                    <AIChat.Actions className="astw:-ml-1.5">
                      <AIChat.Action
                        label="Copy"
                        onClick={() => void navigator.clipboard?.writeText(message.content)}
                      >
                        <Copy className="astw:size-3.5" aria-hidden />
                      </AIChat.Action>
                      <AIChat.Action label="Retry" onClick={retryLastQuestion}>
                        <RefreshCw className="astw:size-3.5" aria-hidden />
                      </AIChat.Action>
                    </AIChat.Actions>
                  ) : null}
                </AIChat.Message>
              ))
            )}
          </AIChat>
        </Card.Root>
      </Layout.Column>
    </Layout>
  );
};

export const aiChatDemoResource = defineResource({
  path: "ai-chat-demo",
  meta: { title: "AIChat Demo" },
  component: AIChatDemoPage,
});
