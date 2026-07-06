---
"@tailor-platform/app-shell": patch
---

Remove the `stream` option from `useAIChat()` and `AIGatewayChatRequest`.

AppShell now selects the appropriate transport (streaming vs JSON) automatically based on the model. Passing `stream` is no longer needed.
