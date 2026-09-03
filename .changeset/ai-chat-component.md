---
"@tailor-platform/app-shell": minor
---

Add `AIChat`, a component for building an LLM assistant UI — a streaming conversation view over a composer. Migrates the UI Catalogue "AI chat" pattern (platform-planning#1748).

`AIChat` owns the frame (scroll area + composer); the transcript is `children`, composed from attached parts: `AIChat.Message`, `.Response`, `.EmptyState`, `.Suggestions`/`.Suggestion`, `.Actions`/`.Action`, `.Reasoning`/`.ReasoningTrigger`/`.ReasoningContent`, `.ChainOfThought*`, `.Tool*`, `.Sources*`, and `.History`. The composer's body is `Textarea`, following the `form/composer` pattern; `status` plugs directly into `useAIChat()`.

```tsx
import { AIChat, useAIChat, createAIGatewayClient } from "@tailor-platform/app-shell";

function Assistant() {
  const { messages, status, sendMessage, stop } = useAIChat({ client, model: "gpt-5" });

  return (
    <AIChat status={status} onSubmit={sendMessage} onStop={stop}>
      {messages.map((message) => (
        <AIChat.Message key={message.id} from={message.role}>
          <AIChat.Response>{message.content}</AIChat.Response>
        </AIChat.Message>
      ))}
    </AIChat>
  );
}
```
