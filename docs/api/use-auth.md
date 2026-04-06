---
title: useAuth
description: Hook for accessing authentication state and methods
---

# useAuth

React hook to access authentication state and methods when using `AuthProvider`.

## Signature

```typescript
const useAuth: () => {
  error: string | null
  isAuthenticated: boolean
  isReady: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  checkAuthStatus: () => Promise<AuthState>
}
```

## Return Value

### `error`

- **Type:** `string | null`
- **Description:** Error message if authentication failed

### `isAuthenticated`

- **Type:** `boolean`
- **Description:** Whether the user is currently authenticated

### `isReady`

- **Type:** `boolean`
- **Description:** Whether the initial auth check has completed. Always check this before rendering authenticated content to avoid flashing unauthenticated state.

### `login()`

- **Type:** `() => Promise<void>`
- **Description:** Initiates the login process. Redirects to Tailor Platform authentication page.

### `logout()`

- **Type:** `() => Promise<void>`
- **Description:** Logs out the current user. Clears tokens and session.

### `checkAuthStatus()`

- **Type:** `() => Promise<AuthState>`
- **Description:** Checks current auth status. Makes network request to verify and refresh tokens if needed.

## Usage

### Basic Authentication Flow

```typescript
import { useAuth } from "@tailor-platform/app-shell";

function MyComponent() {
  const { isAuthenticated, isReady, login, logout } = useAuth();

  if (!isReady) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <button onClick={login}>Log In</button>;
  }

  return (
    <div>
      <p>You are logged in!</p>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}
```

### Protected Content

```typescript
function ProtectedPage() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <SecureContent />;
}
```

### Handle Auth Errors

```typescript
function AuthStatus() {
  const { isAuthenticated, error, login } = useAuth();

  if (error) {
    return (
      <div>
        <p>Authentication failed: {error}</p>
        <button onClick={login}>Retry</button>
      </div>
    );
  }

  return <div>Status: {isAuthenticated ? "Logged in" : "Logged out"}</div>;
}
```

## With AuthProvider

```typescript
import { AuthProvider, AppShell, useAuth } from "@tailor-platform/app-shell";

function App() {
  return (
    <AuthProvider
      apiEndpoint="https://api.tailor.tech"
      clientId="your-client-id"
      redirectUri="http://localhost:3000/callback"
      autoLogin={true}
    >
      <AppShell modules={modules}>
        <SidebarLayout />
      </AppShell>
    </AuthProvider>
  );
}
```

## Related

- [Authentication Concept](../concepts/authentication.md) - Authentication guide
- [AuthProvider](../components/app-shell.md) - Auth provider setup
