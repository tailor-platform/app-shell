---
title: tailorMCP
description: Connect useAIChat to the current Tailor Platform application's remote MCP server
---

# tailorMCP

Creates a remote MCP server descriptor for the current Tailor Platform application. Pass it to `useAIChat({ mcpServers })` to let the model use explicitly allowed MCP tools as the authenticated user.

## Signature

```typescript
function tailorMCP(options: { authClient: EnhancedAuthClient }): AIChatMCPServer;
```

## Parameters

### `authClient`

The AppShell auth client used for authenticated requests. `tailorMCP()` uses `authClient.fetch`, so token refresh and DPoP proof generation remain in the auth layer.

## Usage

```tsx
import {
  createAIGatewayClient,
  createAuthClient,
  tailorMCP,
  useAIChat,
} from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  clientId: "your-client-id",
  appUri: "https://your-app.erp.dev",
});

const aiClient = createAIGatewayClient({
  gatewayUri: "https://your-ai-gateway.example.com",
  authClient,
});

function ChatScreen() {
  const chat = useAIChat({
    client: aiClient,
    model: "gpt-5-mini",
    mcpServers: {
      tailor: {
        server: tailorMCP({ authClient }),
        // Names returned by the MCP server's tools/list response.
        allowedTools: ["query"],
      },
    },
  });

  return <button onClick={() => void chat.sendMessage("Find this customer's orders")}>Send</button>;
}
```

## Notes

- `allowedTools` is required. Start with read-only tools; do not expose mutation tools until your application has an explicit approval flow.
- AppShell opens the MCP session for one `sendMessage()` call and closes it when that call completes, fails, or is stopped.
- MCP tools are translated into internal function tools. They do not appear in the public `messages` array.
- The MCP endpoint must accept the AppShell origin, authenticated DPoP requests, and the Streamable HTTP headers used by MCP.

## Custom MCP servers

AppShell does not depend on an MCP SDK. To connect another server, implement the exported `AIChatMCPServer` interface and pass it through `mcpServers`. Your adapter owns its protocol transport and authentication.

## Related

- [useAIChat](./use-ai-chat.md)
- [Authentication](../concepts/authentication.md)
