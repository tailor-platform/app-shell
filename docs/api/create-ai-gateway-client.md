---
title: createAIGatewayClient
description: Create a low-level AI Gateway client that reuses AppShell authentication
---

# createAIGatewayClient

Creates a small AI Gateway transport client for chat completions, tool calls, and optional sources.

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
- `tool-call` — a local function tool call requested by the model
- `done` — terminal event with an optional `finishReason` and optional `sources`

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
      toolCalls?: AIGatewayToolCall[];
    }
  | {
      role: "tool";
      toolCallId: string;
      content: string;
    };

interface AIGatewayToolCall {
  id: string;
  name: string;
  argumentsText: string;
}

type AIGatewayTool =
  | {
      type: "function";
      function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
      };
    }
  | {
      type: "provider";
      provider: "openai";
      name: "web_search";
      options?: unknown;
    };

interface AIGatewayChatRequest {
  model: string;
  messages: AIGatewayChatMessage[];
  tools?: AIGatewayTool[];
  signal?: AbortSignal;
}

type AIChatCompletionEvent =
  | {
      type: "text-delta";
      text: string;
    }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      argumentsText: string;
    }
  | {
      type: "done";
      finishReason?: string;
      sources?: AIChatSource[];
    };

interface AIChatSource {
  type: "url";
  url: string;
  title?: string;
}
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
- Local tools are sent as normalized `type: "function"` definitions; provider tools are passed through as normalized `type: "provider"` definitions
- The low-level API stays event-based so hooks can layer streaming UI and tool loops on top
- `request.signal` is passed through so callers can abort in-flight work

## Related

- [Authentication Concept](../concepts/authentication.md)
- [useAIChat](./use-ai-chat.md)
