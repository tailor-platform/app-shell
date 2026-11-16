import {
  AIChat,
  Card,
  Text,
  defineGenerativeUI,
  generativeUICards,
  useAIChat,
  type AIGatewayClient,
  type GenerativeUIDocument,
} from "@tailor-platform/app-shell";

const ui = defineGenerativeUI({
  cards: { Report: generativeUICards.report },
});

const document: GenerativeUIDocument = {
  cards: [
    {
      type: "Report",
      data: {
        blocks: [
          {
            text: "The scripted sample contains 120 inbound units.",
            parts: [
              {
                kind: "metrics",
                items: [
                  { label: "Inbound units", value: 120, unit: "units", ref: "demo:inbound#total" },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

export function BasicUsage() {
  return <ui.Renderer document={document} />;
}

const scriptedClient: AIGatewayClient = {
  async *streamChatCompletion({ messages, signal }) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (messages.at(-1)?.role === "tool") {
      yield {
        type: "text-delta",
        text: "This report displays scripted data only; no records were changed.",
      };
    } else {
      yield {
        type: "tool-call",
        toolCallId: crypto.randomUUID(),
        toolName: "ui_render",
        argumentsText: JSON.stringify(document),
      };
    }
    yield { type: "done" };
  },
};

export function LocalTool() {
  const chat = useAIChat({
    client: scriptedClient,
    model: "scripted-demo",
    tools: { ui_render: ui.tool },
  });

  return (
    <Card.Root className="flex h-[420px] flex-col overflow-hidden">
      <AIChat status={chat.status}>
        <AIChat.Header title="Read-only report demo" />
        <AIChat.Conversation>
          {chat.messages.length === 0 && (
            <Text.p>Send a message to display a scripted report.</Text.p>
          )}
          {chat.messages.map((message) => (
            <AIChat.Message key={message.id} from={message.role}>
              {message.parts.map((part) => {
                if (part.type === "text") {
                  return <AIChat.Response key={part.id}>{part.text}</AIChat.Response>;
                }
                return part.parts.map((displayPart, index) =>
                  displayPart.type === "generative-ui" ? (
                    <ui.Renderer key={`${part.id}:${index}`} document={displayPart.data} />
                  ) : null,
                );
              })}
            </AIChat.Message>
          ))}
        </AIChat.Conversation>
        <AIChat.Composer onSubmit={chat.sendMessage} onStop={chat.stop} />
      </AIChat>
    </Card.Root>
  );
}
