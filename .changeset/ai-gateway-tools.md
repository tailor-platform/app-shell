---
"@tailor-platform/app-shell": minor
---

Add local tool support to `useAIChat()` and the AI Gateway transport layer. Streamed function names and arguments are assembled across chunks independently for each tool call.

You can now register **local tools** via the `tools` option on `useAIChat()`. Tool-call and tool-result protocol messages stay internal to the hook — the public `messages` array remains user/assistant text only. Provider-native tools are not supported.

Stopped or failed requests retain user messages, partial assistant text, and completed tool exchanges in subsequent request history. Unanswered tool calls are excluded. Stopping does not undo tool side effects or guarantee safe retries of tools that were already running.

**Low-level API compatibility:** `AIGatewayChatMessage` now includes `role: "tool"`, and `AIChatCompletionEvent` now includes `type: "tool-call"`. Exhaustive handlers for these exported unions must handle the new cases, even when tools are not enabled. The high-level `useAIChat().messages` role union remains `"user" | "assistant"`.

## Local tools

Define tools that run inside AppShell using `defineAIChatTool`. The model decides when to call them, AppShell validates arguments with the schema, executes the handler, and feeds results back into the next model turn automatically.

```ts
import { defineAIChatTool } from "@tailor-platform/app-shell";
import { z } from "zod/v4";

const lookupCustomer = defineAIChatTool({
  description: "Look up a customer by ID and return their profile",
  schema: z.object({
    customerId: z.string().describe("Customer ID"),
    includeInactive: z.boolean().optional(),
  }),
  async execute({ customerId, includeInactive }, { signal }) {
    const res = await fetch(`/api/customers/${customerId}?inactive=${includeInactive ?? false}`, {
      signal,
    });
    return res.json();
  },
});
```

Tool schemas must implement both [Standard Schema](https://standardschema.dev/) validation and Standard JSON Schema generation; Zod 4 does this directly.

### Tool context

The `execute` function receives a second argument with:

- `signal` — the `AbortSignal` for the in-flight chat request
- `messages` — the public user/assistant message history at the time of execution

Stopping a request while tool arguments are being validated prevents the tool from starting. Cancellation is propagated rather than returned to the model as a tool error.

## Registering tools with `useAIChat`

Pass tools as a record to the `tools` option. The key becomes the tool name sent to the model.

```tsx
import { useAIChat, defineAIChatTool } from "@tailor-platform/app-shell";
import { z } from "zod/v4";

const lookupCustomer = defineAIChatTool({
  description: "Look up a customer by ID",
  schema: z.object({
    customerId: z.string(),
  }),
  async execute({ customerId }) {
    return { customerId, name: "Acme Corp", plan: "enterprise" };
  },
});

function ChatPanel({ client }) {
  const { messages, status, sendMessage } = useAIChat({
    client,
    model: "gpt-5-mini",
    tools: {
      lookupCustomer,
    },
  });

  // messages only contains user/assistant text — tool calls are handled internally
  // status transitions: "submitted" → "streaming" → ("submitted" during tool rounds) → "ready"
}
```

The hook runs up to 8 tool rounds per user message, then allows a final model response using the eighth round's results. If the model requests a ninth tool batch, the request fails before those tools execute.
