---
title: createAIGatewayClient
description: Create a low-level AI Gateway client that reuses AppShell authentication
---

# createAIGatewayClient

Creates a small AI Gateway transport client for text-only chat completions.

## Signature

```typescript
function createAIGatewayClient(config: {
  gatewayUri: string;
  authClient: AuthClient;
}): AIGatewayClient;
```

## Parameters

### `gatewayUri`

- **Type:** `string`
- **Required:** Yes
- **Description:** Base URL of the AI Gateway

### `authClient`

- **Type:** `AuthClient`
- **Required:** Yes
- **Description:** Auth client used for authenticated requests via `authClient.fetch(...)`

## Return Value

```typescript
interface AIGatewayClient {
  streamChatCompletion(request: AIGatewayChatRequest): AsyncIterable<AIChatCompletionEvent>;
}
```

The iterable yields completion events:

- `text-delta` — append `event.text` to build the assistant response
- `done` — terminal event with an optional `finishReason`

## Related Types

```typescript
type AIGatewayChatMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content?: string;
    };

interface AIGatewayChatRequest {
  model: string;
  messages: AIGatewayChatMessage[];
  signal?: AbortSignal;
}

type AIChatCompletionEvent =
  | {
      type: "text-delta";
      text: string;
    }
  | {
      type: "done";
      finishReason?: string;
    };
```

## Usage

```typescript
import { createAuthClient, createAIGatewayClient } from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  clientId: "your-client-id",
  appUri: "https://xyz.erp.dev",
});

const aiClient = createAIGatewayClient({
  gatewayUri: "https://your-ai-gateway.example.com",
  authClient,
});

let text = "";
for await (const event of aiClient.streamChatCompletion({
  model: "gpt-5-mini",
  messages: [{ role: "user", content: "Hello" }],
})) {
  if (event.type === "text-delta") {
    text += event.text;
  }
}

console.log(text);
```

## Notes

- AppShell chooses the appropriate AI Gateway transport automatically
- The low-level API is intentionally narrow: text deltas plus completion metadata
- `request.signal` is passed through so callers can abort in-flight work

## Related

- [Authentication Concept](../concepts/authentication.md)
- [useAIChat](./use-ai-chat.md)
