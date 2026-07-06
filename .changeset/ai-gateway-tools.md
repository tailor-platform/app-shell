---
"@tailor-platform/app-shell": minor
---

Add tool support to `useAIChat()` and the AI Gateway transport layer.

You can now register **local tools** and **provider tools** via the `tools` option on `useAIChat()`. Tool-call and tool-result protocol messages stay internal to the hook — the public `messages` array remains user/assistant text only.

## Local tools

Define tools that run inside AppShell using `defineAIChatTool`. The model decides when to call them, AppShell validates arguments with the schema, executes the handler, and feeds results back into the next model turn automatically.

```ts
import { defineAIChatTool, aiToolSchema } from "@tailor-platform/app-shell";

const lookupCustomer = defineAIChatTool({
  description: "Look up a customer by ID and return their profile",
  schema: aiToolSchema.object({
    customerId: aiToolSchema.string({ description: "Customer ID" }),
    includeInactive: aiToolSchema.optional(aiToolSchema.boolean()),
  }),
  async execute({ customerId, includeInactive }, { signal }) {
    const res = await fetch(`/api/customers/${customerId}?inactive=${includeInactive ?? false}`, {
      signal,
    });
    return res.json();
  },
});
```

### Schema primitives (`aiToolSchema`)

| Helper                                  | Description                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| `aiToolSchema.string(opts?)`            | String input (supports `minLength`, `maxLength`, `description`) |
| `aiToolSchema.number(opts?)`            | Numeric input (supports `minimum`, `maximum`, `integer`)        |
| `aiToolSchema.boolean(opts?)`           | Boolean input                                                   |
| `aiToolSchema.enum(values, opts?)`      | Fixed set of string literals                                    |
| `aiToolSchema.array(itemSchema, opts?)` | Array of a given schema                                         |
| `aiToolSchema.object(shape)`            | Object with named fields                                        |
| `aiToolSchema.optional(schema)`         | Marks a field as optional                                       |

### Tool context

The `execute` function receives a second argument with:

- `signal` — the `AbortSignal` for the in-flight chat request
- `messages` — the public user/assistant message history at the time of execution

## Provider tools

Provider tools are not executed locally — they are passed through to the AI Gateway and handled upstream by the model provider.

```ts
import { aiProviderTool } from "@tailor-platform/app-shell";

const webSearch = aiProviderTool.openai.webSearch({
  searchContextSize: "high",
  userLocation: {
    type: "approximate",
    country: "JP",
    city: "Tokyo",
    timezone: "Asia/Tokyo",
  },
  filters: {
    allowedDomains: ["nikkei.com", "reuters.com"],
  },
});
```

## Registering tools with `useAIChat`

Pass tools as a record to the `tools` option. The key becomes the tool name sent to the model.

```tsx
import {
  useAIChat,
  defineAIChatTool,
  aiToolSchema,
  aiProviderTool,
} from "@tailor-platform/app-shell";

const lookupCustomer = defineAIChatTool({
  description: "Look up a customer by ID",
  schema: aiToolSchema.object({
    customerId: aiToolSchema.string(),
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
      web_search: aiProviderTool.openai.webSearch({ searchContextSize: "high" }),
    },
  });

  // messages only contains user/assistant text — tool calls are handled internally
  // status transitions: "submitted" → "streaming" → ("submitted" during tool rounds) → "ready"
}
```

The hook runs up to 8 tool rounds per user message. If the model keeps requesting tools beyond that limit, the request fails with an error.
