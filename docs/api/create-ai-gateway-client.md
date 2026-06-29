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
  chatCompletionStream(request: AIGatewayChatRequest): AsyncGenerator<string, void, unknown>;
}
```

The generator yields text deltas. Concatenate them to build the assistant response.

## Related Types

```typescript
interface AIGatewayChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIGatewayChatRequest {
  model: string;
  messages: AIGatewayChatMessage[];
  signal?: AbortSignal;
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

const deltas: string[] = [];
for await (const delta of aiClient.chatCompletionStream({
  model: "gpt-5-mini",
  messages: [{ role: "user", content: "Hello" }],
})) {
  deltas.push(delta);
}

console.log(deltas.join(""));
```

## Notes

- Non-Gemini models are consumed as streaming SSE responses
- `gemini-*` models are consumed as JSON responses and yielded once
- The public API is intentionally text-only

## Related

- [Authentication Concept](../concepts/authentication.md)
- [useAIChat](./use-ai-chat.md)
