---
"@tailor-platform/app-shell": minor
---

Add `AIChat`, a component for building an LLM assistant UI — a streaming conversation view over a composer. Migrates the UI Catalogue "AI chat" pattern (platform-planning#1748).

`AIChat` places three regions in a fixed order — `AIChat.Header` (optional), `AIChat.Conversation`, `AIChat.Composer` (optional) — each carrying its own props, with the chat's `status` on the root. The transcript inside `AIChat.Conversation` is composed from attached parts: `AIChat.Message`, `.Response`, `.EmptyState`, `.Suggestions`/`.Suggestion`, `.Actions`/`.Action`, `.Reasoning*`, `.ChainOfThought*`, `.Tool*`, `.Sources*`, and `.History`. The composer's body is `Textarea`, following the `form/composer` pattern; `status` plugs directly into `useAIChat()`.

```tsx
import { AIChat, useAIChat, createAIGatewayClient } from "@tailor-platform/app-shell";

function Assistant() {
  const { messages, status, sendMessage, stop } = useAIChat({ client, model: "gpt-5" });

  return (
    <AIChat status={status}>
      <AIChat.Header title="Assistant" />
      <AIChat.Conversation>
        {messages.map((message) => (
          <AIChat.Message key={message.id} from={message.role}>
            <AIChat.Response>{message.content}</AIChat.Response>
          </AIChat.Message>
        ))}
      </AIChat.Conversation>
      <AIChat.Composer onSubmit={sendMessage} onStop={stop} />
    </AIChat>
  );
}
```
