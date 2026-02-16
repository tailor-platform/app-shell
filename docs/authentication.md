# Authentication

AppShell provides built-in OAuth2/OIDC authentication through the `AuthProvider` component, which integrates seamlessly with Tailor Platform's Auth service. The provider supports any IdP configured in your Tailor Platform application (built-in IdP, Google, Okta, Auth0, etc.).

## Quick Start

Wrap your AppShell with the authentication provider:

```tsx
import { AuthProvider, AppShell, SidebarLayout } from "@tailor-platform/app-shell";

const App = () => (
  <AuthProvider
    apiEndpoint={TAILOR_PLATFORM_URL}
    clientId={CLIENT_ID}
    redirectUri={REDIRECT_URI}
    autoLogin={true}
    guardComponent={() => <LoadingScreen />}
  >
    <AppShell {...appShellConfig}>
      <SidebarLayout />
    </AppShell>
  </AuthProvider>
);
```

Find the above values in Tailor Console:

- **Tailor Platform URL**: Your application's base URL
  - Obtained from the Application Overview screen in Tailor Platform
  - Use the domain portion of the 'Accessing the API endpoint of this application' setting
  - Example: `"https://xyz.erp.dev"` (no `/query` suffix needed)

- **Client ID**: Authentication client identifier
  - Found in Application > Auth screen in your Tailor Platform console

- **Redirect URI**: OAuth2 callback URL (optional)
  - Defaults to `window.location.origin` if not provided
  - Must match the redirect URI configured in your Tailor Platform Auth settings

The above code will:
- Automatically redirect unauthenticated users to the login page (if `autoLogin` is true)
- Show the `guardComponent` while loading or when unauthenticated
- Handle token management and session persistence automatically

See the [API](./api.md#authprovider) for more details.

## Authentication Hook

Use the `useAuth` hook to access authentication state and methods:

```tsx
import { useAuth } from "@tailor-platform/app-shell";

const UserProfile = () => {
  const { authState, login, logout } = useAuth();
  
  if (authState.isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!authState.isAuthenticated) {
    return <button onClick={login}>Sign In</button>;
  }
  
  return (
    <div>
      <p>Welcome, {authState.user.name || authState.user.email}!</p>
      <p>User ID: {authState.user.id}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
};
```

### Authentication State

The `authState` object contains:

| Property | Type | Description |
|----------|------|-------------|
| `isLoading` | `boolean` | Whether auth status is being checked |
| `isAuthenticated` | `boolean` | Whether user is authenticated |
| `user` | `User \| null` | Current user object (null if not authenticated) |

See the [API](./api.md#useauth) for more details.

## Extending User Type

By default, the user object has these fields:
- `id: string`
- `email: string`
- `name?: string`

If your application needs additional user fields (e.g., roles, organization info), you can extend the user type using TypeScript module augmentation:

### Step 1: Define Custom User Type

```tsx
// types/auth.d.ts (or any .ts/.tsx file in your project)
declare module "@tailor-platform/app-shell" {
  interface AuthRegister {
    user: DefaultUser & {
      roles: Array<string>;
      organizationId: string;
      // Add any other custom fields your API returns
    };
  }
}
```

### Step 2: Provide Matching meQuery

The `meQuery` prop defines the GraphQL query used to fetch the authenticated user. The fields must match your custom user type:

```tsx
<AuthProvider
  apiEndpoint="https://xyz.erp.dev"
  clientId="your-client-id"
  meQuery={`
    query {
      me {
        id
        email
        name
        roles
        organizationId
      }
    }
  `}
>
  <AppShell {...config}>
    <SidebarLayout />
  </AppShell>
</AuthProvider>
```

### Step 3: Access Typed User Data

After the above setup, `authState.user` will be fully typed:

```tsx
import { useAuth } from "@tailor-platform/app-shell";

const MyComponent = () => {
  const { authState } = useAuth();
  
  // TypeScript knows these properties exist
  console.log(authState.user.roles); // Array<string>
  console.log(authState.user.organizationId); // string
  console.log(authState.user.email); // string (from DefaultUser)
  
  return <div>...</div>;
};
```

## OAuth Callback Handling

If your authentication flow requires a dedicated callback page, use the `handleCallback` method:

```tsx
import { useAuth } from "@tailor-platform/app-shell";
import { useEffect } from "react";

const CallbackPage = () => {
  const { handleCallback } = useAuth();
  
  useEffect(() => {
    handleCallback()
      .then(() => {
        // Redirect to home or intended page
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Auth callback failed:", error);
      });
  }, [handleCallback]);
  
  return <div>Processing authentication...</div>;
};
```

## Integration with AppShell

The authentication provider works seamlessly with AppShell's data layer, automatically handling:

- OAuth2 token management
- GraphQL request authentication
- Session persistence and token refresh
- Automatic redirects for protected routes

Simply wrap your AppShell with the provider and authentication will be handled automatically throughout your application.
