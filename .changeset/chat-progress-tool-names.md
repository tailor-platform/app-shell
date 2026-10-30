---
"@tailor-platform/app-shell": minor
---

Show a localized waiting indicator in `AIChat.Conversation` while a response or tool round is pending.

Expose requested tool names in a transient `toolCalls` list from `useAIChat()`. Render them with `toolCalls.map(call => <AIChat.ToolCall key={call.id} call={call} />)`; the localized labels stack vertically and the list clears on completion, stop, or error without changing the message history. Call metadata does not imply successful execution, and tool arguments/results remain internal.
