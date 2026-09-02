# E2E Tests for AuthProvider, Routing, and AI Gateway

Playwright-based E2E tests that cover two layers:

- a routing smoke suite backed by a fake-auth fixture for AppShell + React Router integration
- a real-auth suite that exercises the hosted Tailor Platform OAuth flow plus a minimal AI Gateway smoke check on separate `/auth` and `/ai` pages

## Setup

### 1. Deploy backend to Tailor Platform

```bash
cd e2e
TAILOR_PLATFORM_WORKSPACE_ID=<your-workspace-id> pnpm deploy:backend
```

To refresh the generated `backend/tailor.d.ts` after changing the TailorDB schema or `tailor.config.ts`, run:

```bash
cd e2e
pnpm exec tailor generate --config backend/tailor.config.ts
```

After deploy, retrieve the app URL, client ID, and AI Gateway URL using `tailor`:

```bash
# Get the app URL
npx @tailor-platform/sdk show --workspace-id <your-workspace-id> --json
# → {"url": "https://<slug>.erp.dev", ...}

# Get the OAuth2 client ID
npx @tailor-platform/sdk oauth2client list --workspace-id <your-workspace-id> --json
# → [{"clientId": "tpoc_...", ...}]

# Get the AI Gateway domain
npx @tailor-platform/sdk workspace app list --workspace-id <your-workspace-id> --json
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
cp e2e/tests/real-auth/.env.example e2e/tests/real-auth/.env
```

Put the hosted OAuth / AI Gateway values in `e2e/tests/real-auth/.env`. The test user credentials are pre-filled in the example file. The routing suite does not need env setup.

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

# One suite app only (for debugging)
cd e2e && pnpm exec vite --config tests/routing/app/vite.config.ts
cd e2e && pnpm exec vite --config tests/real-auth/app/vite.config.ts
```

## Test Scenarios

| Test                | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| Routing deep link   | Protected nested route stays intact after fake-auth login           |
| Routing navigation  | Covers `Link`, `useNavigate`, redirect guards, reload, and logout   |
| Auth guard display  | Verifies unauthenticated users see the login UI                     |
| Login flow          | Full OAuth redirect → IDP login → callback → authenticated state    |
| Logout              | Verifies logout returns to auth guard                               |
| Session persistence | Confirms page reload maintains authentication                       |
| AI Gateway smoke    | Sends `PING` and checks the OpenAI-compatible reply contains `PONG` |

## Architecture

```
e2e/
├── backend/                         # Tailor Platform config for E2E workspace
│   ├── tailor.config.ts
│   └── src/tailordb/user.ts
└── tests/
    ├── routing/
    │   ├── app/                    # Suite-specific Vite app for routing smoke tests
    │   │   └── src/
    │   │       ├── App.tsx
    │   │       └── fake-auth-client.ts
    │   └── routing.spec.ts
    └── real-auth/
        ├── app/                    # Suite-specific Vite app for hosted OAuth / AI smoke tests
        │   └── src/
        │       └── App.tsx
        └── auth.spec.ts            # Auth flow tests, plus AI smoke via the /ai page
```
