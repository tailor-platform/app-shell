---
title: useAIChat
description: Simple text-only chat hook for AI Gateway
---

# useAIChat

React hook for simple text-only chat on top of `createAIGatewayClient`.

## Signature

```typescript
const useAIChat: (config: { client: AIGatewayClient; model: string }) => {
  messages: AIChatMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  error?: Error;
  sendMessage: (message: { text: string } | string) => Promise<void>;
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
}
```

### `status`

- **Type:** `"ready" | "submitted" | "streaming" | "error"`
- **Description:** Current request state

### `error`

- **Type:** `Error | undefined`
- **Description:** Last request error, if any

### `sendMessage()`

- **Type:** `(message: { text: string } | string) => Promise<void>`
- **Description:** Appends a user message and streams the assistant response

### `stop()`

- **Type:** `() => void`
- **Description:** Aborts the current request if one is in progress

## Usage

```tsx
import { createAuthClient, createAIGatewayClient, useAIChat } from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  clientId: "your-client-id",
  appUri: "https://xyz.erp.dev",
});

const aiClient = createAIGatewayClient({
  gatewayUri: "https://your-ai-gateway.example.com",
  authClient,
});

export function ChatScreen() {
  const { messages, sendMessage, status, stop, error } = useAIChat({
    client: aiClient,
    model: "gpt-5-mini",
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}

      <button
        onClick={() => sendMessage("Hello")}
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

- The hook is intentionally text-only
- System prompts and custom history shaping should use the low-level client directly
- `stop()` keeps any already-streamed assistant text

## Related

- [createAIGatewayClient](./create-ai-gateway-client.md)
