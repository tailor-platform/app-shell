---
"@tailor-platform/app-shell": patch
---

Migrate `createAIGatewayClient()` to the OpenAI SDK while keeping the existing AppShell AI Gateway API unchanged.

This replaces the manual SSE/JSON response handling with the SDK's OpenAI-compatible transport, while continuing to send requests through `authClient.fetch(...)` and preserving the existing Gemini `stream: false` fallback behavior.
