---
title: Authentication
description: Set up OAuth2/OIDC authentication with Tailor Platform's Auth service using the AuthProvider component
---

# Authentication

AppShell provides built-in OAuth2/OIDC authentication through the `AuthProvider` component, which integrates seamlessly with Tailor Platform's Auth service. The provider supports any IdP configured in your Tailor Platform application (built-in IdP, Google, Okta, Auth0, etc.).

## Quick Start

First, create an auth client, then wrap your app with `AuthProvider`:

```tsx
import {
  createAuthClient,
  AuthProvider,
  AppShell,
  SidebarLayout,
} from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  clientId: CLIENT_ID,
  appUri: TAILOR_PLATFORM_URL,
});

const App = () => (
  <AuthProvider client={authClient} autoLogin={true} guardComponent={() => <LoadingScreen />}>
    <AppShell modules={modules}>
      <SidebarLayout />
    </AppShell>
  </AuthProvider>
);
```

Find the above values in Tailor Console:

- **Tailor Platform URL** (`appUri`): Your application's base URL
  - Obtained from the Application Overview screen in Tailor Platform
  - Use the domain portion of the 'Accessing the API endpoint of this application' setting
  - Example: `"https://xyz.erp.dev"` (no `/query` suffix needed)

- **Client ID** (`clientId`): Authentication client identifier
  - Found in Application > Auth screen in your Tailor Platform console

The above code will:

- Automatically redirect unauthenticated users to the login page (if `autoLogin` is true)
- Show the `guardComponent` while loading or when unauthenticated
- Handle token management and session persistence automatically

## Authentication Hook

Use the `useAuth` hook to access authentication state and methods:

```tsx
import { useAuth } from "@tailor-platform/app-shell";

const UserProfile = () => {
  const { isReady, isAuthenticated, login, logout } = useAuth();

  if (!isReady) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <button onClick={login}>Sign In</button>;
  }

  return <button onClick={logout}>Sign Out</button>;
};
```

### Return Value

| Property          | Type                       | Description                                            |
| ----------------- | -------------------------- | ------------------------------------------------------ |
| `isAuthenticated` | `boolean`                  | Whether the user is currently authenticated            |
| `isReady`         | `boolean`                  | Whether the initial authentication check has completed |
| `error`           | `string \| null`           | Error message if authentication failed                 |
| `login`           | `() => Promise<void>`      | Initiates the login/redirect flow                      |
| `logout`          | `() => Promise<void>`      | Clears tokens and ends the session                     |
| `checkAuthStatus` | `() => Promise<AuthState>` | Re-checks auth status (always makes a network request) |

### Suspense-Compatible Hook

Use `useAuthSuspense` when you want React Suspense to handle the loading state:

```tsx
import { Suspense } from "react";
import { useAuthSuspense } from "@tailor-platform/app-shell";

function App() {
  return (
    <AuthProvider client={authClient}>
      <Suspense fallback={<div>Loading authentication...</div>}>
        <ProtectedContent />
      </Suspense>
    </AuthProvider>
  );
}

function ProtectedContent() {
  // isReady is guaranteed to be true here — Suspense handles the loading state
  const { isAuthenticated, login, logout } = useAuthSuspense();

  if (!isAuthenticated) {
    return <button onClick={login}>Log In</button>;
  }

  return <button onClick={logout}>Log Out</button>;
}
```

## Auth Client

Use `createAuthClient` to create an authentication client that you pass to `AuthProvider`. The client handles token management and provides an authenticated `fetch` method for use with GraphQL clients.

```tsx
import { createAuthClient } from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  clientId: "your-client-id",
  appUri: "https://xyz.erp.dev",
});
```

### Using `authClient.fetch` with a GraphQL Client

Pass `authClient.fetch` directly to your GraphQL client (e.g., urql). It transparently handles DPoP proof generation and token refresh on every request. If the server rejects the grant outright, it ends the session rather than replaying a dead token — see [Session expiry](#session-expiry):

```tsx
import { createAuthClient, AuthProvider } from "@tailor-platform/app-shell";
import { createClient, Provider } from "urql";

const authClient = createAuthClient({
  clientId: "your-client-id",
  appUri: "https://xyz.erp.dev",
});

const urqlClient = createClient({
  url: `${authClient.getAppUri()}/query`,
  fetch: authClient.fetch,
});

function App() {
  return (
    <AuthProvider client={authClient} autoLogin={true}>
      <Provider value={urqlClient}>
        <YourAppComponents />
      </Provider>
    </AuthProvider>
  );
}
```

### Using `createAIGatewayClient` with AI Gateway

`createAIGatewayClient` reuses the same authenticated fetch path as the rest of AppShell. Requests go through `authClient.fetch`, so DPoP proof generation and token refresh stay in the auth layer.

```tsx
import { createAuthClient, createAIGatewayClient, useAIChat } from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  clientId: "your-client-id",
  appUri: "https://xyz.erp.dev",
});

const aiClient = createAIGatewayClient({
  gatewayUri: "https://your-ai-gateway.example.com",
  authClient,
});

function ChatScreen() {
  const { messages, sendMessage, status, stop } = useAIChat({
    client: aiClient,
    model: "gpt-5-mini",
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}

      <button onClick={() => void sendMessage("Hello")}>Send</button>
      <button onClick={stop} disabled={status !== "submitted" && status !== "streaming"}>
        Stop
      </button>
    </div>
  );
}
```

### `AuthClientConfig`

| Property      | Type     | Required | Description                                                |
| ------------- | -------- | -------- | ---------------------------------------------------------- |
| `clientId`    | `string` | Yes      | OAuth2 client ID from Tailor Platform console              |
| `appUri`      | `string` | Yes      | Your Tailor Platform application URL                       |
| `redirectUri` | `string` | No       | OAuth2 redirect URI (defaults to `window.location.origin`) |

### `EnhancedAuthClient` Methods

| Method / Property | Type           | Description                                                                                                      |
| ----------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `getAppUri()`     | `() => string` | Returns the `appUri` used to create this client                                                                  |
| `fetch`           | `typeof fetch` | Authenticated fetch with built-in DPoP proof generation, token refresh, and session teardown on a rejected grant |

## `AuthProvider` Props

| Prop             | Type                    | Required | Description                                           |
| ---------------- | ----------------------- | -------- | ----------------------------------------------------- |
| `client`         | `EnhancedAuthClient`    | Yes      | Auth client created with `createAuthClient`           |
| `autoLogin`      | `boolean`               | No       | Automatically redirect unauthenticated users to login |
| `guardComponent` | `() => React.ReactNode` | No       | Rendered while loading or when not authenticated      |

## When the callback fails

A sign-in that comes back from the authorization server unsuccessfully — the user declined, the client is not permitted, the exchange failed — leaves `isAuthenticated` false with the reason on `useAuth().error`. The callback parameters are cleaned out of the URL on every outcome (since `auth-public-client` 0.6.1), preserving unrelated query parameters, the hash, and the router's history state.

With `autoLogin`, a failure that looks recoverable is retried once automatically. Beyond that, and for any refusal the authorization server issues explicitly, AppShell stops: sending the user straight back would ask the same question, get the same answer, and loop.

That makes the guard the place where a failed sign-in becomes visible. A guard that only ever renders a spinner will spin indefinitely in this case, so render the error and offer a way out:

```tsx
const AuthGate = () => {
  const { isReady, error, login } = useAuth();

  if (error) {
    return (
      <div>
        <p>Sign-in failed: {error}</p>
        <button onClick={() => login()}>Try again</button>
      </div>
    );
  }

  return isReady ? <LoginPrompt /> : <LoadingScreen />;
};
```

## Integration with AppShell

The authentication provider works seamlessly with AppShell's data layer, automatically handling:

- OAuth2 token management
- Authenticated fetch with DPoP proof generation
- Session persistence and token refresh
- Session teardown when the server rejects the grant
- Automatic redirects for protected routes (via `autoLogin`)

OAuth callback parameters (`code`, `state`) are automatically cleaned from the URL after a successful login — no dedicated callback page is needed.

## Session expiry

Access tokens are refreshed transparently, so a session normally outlives individual token lifetimes without the app doing anything.

When a refresh cannot succeed — the refresh token has expired, been revoked, or is otherwise rejected by the token endpoint — the auth client ends the session instead of retrying indefinitely. It clears stored tokens, sets `isAuthenticated` to `false`, and emits `logout` followed by `auth_state_changed`.

What the user sees follows from the props you already pass:

- With `autoLogin`, `AuthProvider` redirects to sign-in.
- With `guardComponent`, the guard renders in place of your app.
- With neither, `useAuth().isAuthenticated` flips to `false` and your own UI decides.

Not every failed refresh ends the session. A request timeout, a network failure, and a plain 5xx from the token endpoint all leave it intact, so a dropped connection does not sign users out.

The line is drawn on the shape of the response, not on how transient the underlying cause is. Any rejection the token endpoint returns as a 4xx carrying an `error` code ends the session — the sole exception is `use_dpop_nonce`. A server that reports overload as `400 {"error":"server_error"}` or `400 {"error":"temporarily_unavailable"}` will therefore sign users out, as will a 5xx that carries a `WWW-Authenticate` header. If you operate the token endpoint, prefer a bare 5xx for conditions you want treated as retryable.

To react to teardown yourself — clearing app-level caches, for instance — subscribe to the client's events:

```tsx
useEffect(() => {
  return authClient.addEventListener((event) => {
    if (event.type === "logout") {
      clearAppCaches();
    }
  });
}, [authClient]);
```
