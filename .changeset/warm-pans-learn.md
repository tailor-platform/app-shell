---
"@tailor-platform/app-shell": minor
---

Add a low-level AI Gateway client and a simple text-only chat hook for AppShell.

```tsx
import { createAIGatewayClient, useAIChat } from "@tailor-platform/app-shell";

const aiClient = createAIGatewayClient({ gatewayUri, authClient });
const { messages, sendMessage, stop } = useAIChat({ client: aiClient, model: "gpt-5-mini" });
```
