# E2E Tests for AuthProvider, Routing, and AI Gateway

Playwright-based E2E tests that cover two layers:

- a local fake-auth routing smoke suite for AppShell + React Router integration
- a real Tailor Platform OAuth flow plus a minimal AI Gateway smoke check

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
cd e2e && pnpm test:e2e

# With Playwright UI
cd e2e && pnpm test:e2e:ui

# Dev server only (for debugging)
cd e2e && pnpm dev
```

## Test Scenarios

| Test                  | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| Local auth deep link  | Protected nested route stays intact after local fake-auth login     |
| Local auth navigation | Covers `Link`, `useNavigate`, redirect guards, reload, and logout   |
| Auth guard display    | Verifies unauthenticated users see the login UI                     |
| Login flow            | Full OAuth redirect → IDP login → callback → authenticated state    |
| Logout                | Verifies logout returns to auth guard                               |
| Session persistence   | Confirms page reload maintains authentication                       |
| AI Gateway smoke      | Sends `PING` and checks the OpenAI-compatible reply contains `PONG` |

## Architecture

```
e2e/
├── app/              # Minimal Vite app with real-auth and local fake-auth demos
│   ├── src/App.tsx   # Test app routing between the two demos
│   └── vite.config.ts
├── backend/          # Tailor Platform config for E2E workspace
│   ├── tailor.config.ts
│   └── src/tailordb/user.ts
├── tests/
│   ├── auth.spec.ts               # Real Tailor OAuth + AI smoke specs
│   └── local-auth-routing.spec.ts # Local fake-auth routing smoke specs
└── playwright.config.ts
```
