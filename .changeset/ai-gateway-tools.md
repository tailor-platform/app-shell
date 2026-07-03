---
"@tailor-platform/app-shell": minor
---

Add tool support to `useAIChat()` and the AI Gateway transport layer.

You can now register local tools with `defineAIChatTool(...)` and provider tools such as `aiProviderTool.openai.webSearch(...)`, while keeping the public chat message model focused on user/assistant messages.
