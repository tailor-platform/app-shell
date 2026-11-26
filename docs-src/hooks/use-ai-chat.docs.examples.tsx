import { useState } from "react";
import {
  Button,
  Text,
  defineAIChatTool,
  useAIChat,
  type AIChatToolSchema,
  type AIGatewayClient,
} from "@tailor-platform/app-shell";

export function LocalToolExecution() {
  const [config] = useState(() => {
    const jsonSchema = {
      type: "object",
      properties: { sku: { type: "string", minLength: 1 } },
      required: ["sku"],
    };
    const schema: AIChatToolSchema<{ sku: string }> = {
      "~standard": {
        version: 1,
        vendor: "documentation-demo",
        validate(value) {
          if (
            typeof value === "object" &&
            value !== null &&
            "sku" in value &&
            typeof value.sku === "string" &&
            value.sku.length > 0
          ) {
            return { value: { sku: value.sku } };
          }
          return { issues: [{ message: "sku must be a non-empty string." }] };
        },
        jsonSchema: {
          input: () => jsonSchema,
          output: () => jsonSchema,
        },
      },
    };
    const lookupProduct = defineAIChatTool({
      description: "Look up a product in the local demo inventory",
      schema,
      async execute({ sku }, { signal }) {
        // Keep the tool active briefly so its requested name and Stop can be tried.
        await new Promise<void>((resolve) => setTimeout(resolve, 800));
        signal.throwIfAborted();
        const products = [{ sku: "NOTE-1", name: "Notebook", available: 12 }];
        return products.find((product) => product.sku === sku) ?? { sku, error: "Not found" };
      },
    });
    const client: AIGatewayClient = {
      async *streamChatCompletion({ messages, signal }) {
        signal?.throwIfAborted();
        const lastMessage = messages.at(-1);
        if (lastMessage?.role === "user") {
          yield {
            type: "tool-call",
            toolCallId: crypto.randomUUID(),
            toolName: "lookupProduct",
            argumentsText: JSON.stringify({
              sku: lastMessage.content === "Try invalid arguments" ? 42 : "NOTE-1",
            }),
          };
          yield { type: "done", finishReason: "tool_calls" };
          return;
        }
        if (lastMessage?.role === "tool") {
          yield { type: "text-delta", text: `Local tool result: ${lastMessage.content}` };
        }
        yield { type: "done", finishReason: "stop" };
      },
    };
    return { client, model: "scripted-demo", tools: { lookupProduct } };
  });
  const { messages, toolCalls, status, error, sendMessage, stop } = useAIChat(config);
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col gap-3">
      <Text.p>
        Replies are scripted locally, but useAIChat validates and executes the real local tool. No
        prompt is sent to a server or model.
      </Text.p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void sendMessage("Look up NOTE-1")}>
          Look up product
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void sendMessage("Try invalid arguments")}
        >
          Try invalid arguments
        </Button>
        <Button type="button" variant="outline" disabled={!busy} onClick={stop}>
          Stop
        </Button>
      </div>
      <Text.p role="status">Status: {status}</Text.p>
      <Text.p>Requested tools: {toolCalls.map((call) => call.name).join(", ") || "None"}</Text.p>
      <div role="log" aria-label="Local tool conversation" className="flex flex-col gap-2">
        {messages.length === 0 && <Text.p>Run a lookup to start the conversation.</Text.p>}
        {messages.map((message) => (
          <Text.p key={message.id}>
            <strong>{message.role}:</strong> {message.content}
          </Text.p>
        ))}
      </div>
      {error && <Text.p role="alert">{error.message}</Text.p>}
    </div>
  );
}
