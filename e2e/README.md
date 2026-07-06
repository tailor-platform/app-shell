# E2E Tests for AuthProvider and AI Gateway

Playwright-based E2E tests that verify the AuthProvider OAuth authentication flow and a minimal AI Gateway smoke check against a real Tailor Platform workspace.

## Setup

### 1. Deploy backend to Tailor Platform

```bash
cd e2e/backend
TAILOR_PLATFORM_WORKSPACE_ID=<your-workspace-id> pnpm deploy
```

After deploy, retrieve the app URL, client ID, and AI Gateway URL using `tailor-sdk`:

```bash
# Get the app URL
npx tailor-sdk show --workspace-id <your-workspace-id> --json
# → {"url": "https://<slug>.erp.dev", ...}

# Get the OAuth2 client ID
npx tailor-sdk oauth2client list --workspace-id <your-workspace-id> --json
# → [{"clientId": "tpoc_...", ...}]

# Get the AI Gateway domain
npx tailor-sdk workspace app list --workspace-id <your-workspace-id> --json
# → find the entry named "e2e-ai-gateway" and use https://<domain>
```

### 2. Create a test user

Open the GraphQL Playground for the workspace at [console.tailor.tech](https://console.tailor.tech) and run:

```graphql
# 1. Create the IDP user (authentication credentials)
mutation CreateIdpUser {
  _createUser(input: { password: "TestPassword123!", name: "e2e-test@example.com" }) {
    id
    name
  }
}

# 2. Create the TailorDB user profile (required for user lookup after auth)
mutation CreateUserProfile {
  createUser(input: { email: "e2e-test@example.com", name: "E2E Test User", roles: [] }) {
    id
  }
}
```

### 3. Configure environment

```bash
cp e2e/.env.example e2e/.env
```

Fill in `VITE_TAILOR_APP_URL`, `VITE_TAILOR_CLIENT_ID`, and `VITE_TAILOR_AI_GATEWAY_URL` (retrieved above). The test user credentials are pre-filled.

### 4. Install dependencies & browsers

```bash
pnpm install
cd e2e && npx playwright install chromium
```

## Running Tests

```bash
# From monorepo root
cd e2e && pnpm test

# With Playwright UI
cd e2e && pnpm test:ui

# Dev server only (for debugging)
cd e2e && pnpm dev
```

## Test Scenarios

| Test                | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| Auth guard display  | Verifies unauthenticated users see the login UI                     |
| Login flow          | Full OAuth redirect → IDP login → callback → authenticated state    |
| Logout              | Verifies logout returns to auth guard                               |
| Session persistence | Confirms page reload maintains authentication                       |
| AI Gateway smoke    | Sends `PING` and checks the OpenAI-compatible reply contains `PONG` |

## Architecture

```
e2e/
├── app/              # Minimal Vite app with AuthProvider
│   ├── src/App.tsx   # Test app using AuthProvider + guardComponent
│   └── vite.config.ts
├── backend/          # Tailor Platform config for E2E workspace
│   ├── tailor.config.ts
│   └── src/tailordb/user.ts
├── tests/
│   └── auth.spec.ts  # Playwright test specs
└── playwright.config.ts
```
