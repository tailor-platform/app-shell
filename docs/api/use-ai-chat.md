---
title: useAIChat
description: AI Gateway chat hook with optional local and provider tools
---

# useAIChat

React hook for AI Gateway chat on top of `createAIGatewayClient`, with optional local and provider tool support.

## Signature

```typescript
const useAIChat: (config: {
  client: AIGatewayClient;
  model: string;
  tools?: Record<string, AIChatConfiguredTool>;
}) => {
  messages: AIChatMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error?: Error;
  sendMessage: (message: string) => Promise<boolean>;
  stop: () => void;
};
```

## Return Value

### `messages`

```typescript
interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AIChatSource[];
}

interface AIChatSource {
  type: "url";
  url: string;
  title?: string;
}
```

### `status`

- **Type:** `"ready" | "submitted" | "streaming" | "error"`
- **Description:** Current request state

### `error`

- **Type:** `Error | undefined`
- **Description:** Last request error, if any

### `sendMessage()`

- **Type:** `(message: string) => Promise<boolean>`
- **Description:** Appends a user message and streams the assistant response
- **Returns:** `true` when the request completes successfully, `false` when the call is ignored, stopped, or fails

### `stop()`

- **Type:** `() => void`
- **Description:** Aborts the current request if one is in progress

### `tools`

Register tools under a single object:

- local tools created with `defineAIChatTool(...)`
- provider tools such as `aiProviderTool.openai.webSearch(...)`

## Usage

```tsx
import {
  aiProviderTool,
  aiToolSchema,
  createAuthClient,
  createAIGatewayClient,
  defineAIChatTool,
  useAIChat,
} from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  clientId: "your-client-id",
  appUri: "https://xyz.erp.dev",
});

const aiClient = createAIGatewayClient({
  gatewayUri: "https://your-ai-gateway.example.com",
  authClient,
});

const lookupCustomer = defineAIChatTool({
  description: "Look up a customer in the current workspace",
  schema: aiToolSchema.object({
    customerId: aiToolSchema.string(),
  }),
  async execute({ customerId }) {
    return { customerId, name: "Acme Corp" };
  },
});

export function ChatScreen() {
  const { messages, sendMessage, status, stop, error } = useAIChat({
    client: aiClient,
    model: "gpt-5-mini",
    tools: {
      lookupCustomer,
      web_search: aiProviderTool.openai.webSearch({ searchContextSize: "high" }),
    },
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}

      <button
        onClick={() => void sendMessage("Hello")}
        disabled={status === "submitted" || status === "streaming"}
      >
        Send
      </button>
      <button onClick={stop} disabled={status !== "submitted" && status !== "streaming"}>
        Stop
      </button>
      {error ? <div>{error.message}</div> : null}
    </div>
  );
}
```

## Notes

- AppShell chooses the appropriate AI Gateway transport automatically
- Public messages stay user/assistant text-first; internal tool messages remain private to the hook
- Provider tools can attach optional `sources` to assistant messages
- System prompts and custom history shaping should use the low-level client directly
- `stop()` keeps any already-streamed assistant text and ignores late chunks from the stopped request

## Related

- [createAIGatewayClient](./create-ai-gateway-client.md)
