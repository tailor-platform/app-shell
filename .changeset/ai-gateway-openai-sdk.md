---
"@tailor-platform/app-shell": patch
---

Migrate `createAIGatewayClient()` to the OpenAI SDK and remove the public `stream` override from `useAIChat()` and `AIGatewayChatRequest`.

This replaces the manual SSE/JSON response handling with the SDK's OpenAI-compatible transport, while continuing to send requests through `authClient.fetch(...)`. AppShell now chooses the appropriate AI Gateway transport automatically, including the existing Gemini JSON fallback behavior.
