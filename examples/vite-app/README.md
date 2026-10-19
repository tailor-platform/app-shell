# Vite Example

Example AppShell application using Vite with file-based routing and the consolidated UI showcase.

## Run

```bash
pnpm dev
```

Open [http://localhost:3100](http://localhost:3100) to see the result.

## Try AI Chat with the e2e AI Gateway

The global assistant panel requires gateway configuration and a signed-in
workspace account. There is no scripted fallback: if any of the three settings
below is missing, the assistant only shows a configuration message and cannot
send messages.

Copy only the three `VITE_TAILOR_*` values from `e2e/tests/real-auth/.env` into
`examples/vite-app/.env.local` (do not copy the test user's credentials):

```dotenv
VITE_TAILOR_APP_URL=<e2e workspace URL>
VITE_TAILOR_CLIENT_ID=<e2e public OAuth client ID>
VITE_TAILOR_AI_GATEWAY_URL=<e2e AI Gateway URL>
```

From the repository root, start the example on the origin allowed by the e2e
backend's OAuth redirect and CORS settings:

```bash
pnpm --filter vite-app dev
```

Open [http://localhost:3100](http://localhost:3100) and use the global header's
“Toggle assistant” button to open or close the right panel on any page (desktop
layout). Sign in with the e2e workspace account inside the panel. Chat uses
`gpt-4o-mini`; prompts are sent to the real gateway, so do not enter sensitive
data. No order data or knowledge base is attached.

The panel stays mounted when navigating between pages or closing it, so the
conversation and any active request are preserved. “Clear conversation” resets
only that chat, without reloading the application. Reloading the browser still
resets the conversation; it is not saved to storage.

The [AI Chat showcase](http://localhost:3100/showcase/ai-chat) remains a scripted
component demo. Only the global assistant panel connects to the gateway.

The chat includes a local `add` tool that accepts two numbers (`a`, `b`) and
returns `{ sum }`. Select “Use the add tool to calculate 123 + 456.” to try the
model → browser-side tool → model round trip. Tool inputs are validated with Zod.

Removing these settings and restarting Vite disables the assistant. This does
not require changes to the e2e backend.
