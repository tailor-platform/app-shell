import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  useCallback,
} from "react";
import {
  createAuthClient as createAuthClientOriginal,
  type AuthClient,
} from "@tailor-platform/auth-public-client";

// ============================================================================
// Auth Client
// ============================================================================

/**
 * Configuration for creating an enhanced auth client
 */
export interface AuthClientConfig {
  /** OAuth client ID */
  clientId: string;
  /** Authorization server base URL (e.g., https://your-app.erp.dev) */
  appUri: string;
  /** Redirect URI after authorization (default: window.location.origin) */
  redirectUri?: string;
}

/**
 * Enhanced auth client with additional helper methods
 */
export interface EnhancedAuthClient extends AuthClient {
  /**
   * Get the appUri used to create this client
   */
  getAppUri(): string;

  /**
   * Get Authorization and DPoP headers for protected resource requests.
   * This version automatically uses the appUri for the /query endpoint.
   *
   * @param path - Optional path to append to appUri (default: "/query")
   * @param method - HTTP method (default: "POST")
   */
  getAuthHeadersForQuery(
    path?: string,
    method?: string,
  ): Promise<{
    Authorization: string;
    DPoP: string;
  }>;
}

/**
 * Create an enhanced authentication client.
 *
 * This wrapper around the original createAuthClient adds convenience methods
 * to reduce duplication of the appUri across your application.
 *
 * @example
 * ```tsx
 * import { createAuthClient, AuthProvider } from '@tailor-platform/app-shell';
 * import { createClient, Provider } from 'urql';
 *
 * // Create auth client at module level
 * const authClient = createAuthClient({
 *   clientId: 'your-client-id',
 *   appUri: 'https://xyz.erp.dev',
 * });
 *
 * // Create urql client using the wrapped getAuthHeadersForQuery
 * const urqlClient = createClient({
 *   url: `${authClient.getAppUri()}/query`,
 *   fetchOptions: async () => {
 *     const headers = await authClient.getAuthHeadersForQuery();
 *     return { headers };
 *   },
 * });
 *
 * function App() {
 *   return (
 *     <AuthProvider client={authClient}>
 *       <Provider value={urqlClient}>
 *         <YourAppComponents />
 *       </Provider>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
/**
 * Build a clean URL by removing OAuth-related parameters (code, state)
 * while preserving other query parameters and hash fragments.
 *
 * @param url - The URL to clean (defaults to window.location)
 * @returns The cleaned URL string
 *
 * @example
 * ```ts
 * buildCleanOAuthCallbackUrl(new URL('https://example.com/dashboard?code=xxx&state=yyy&tab=settings#section1'))
 * // => '/dashboard?tab=settings#section1'
 * ```
 */
export function buildCleanOAuthCallbackUrl(url: URL): string {
  const params = new URLSearchParams(url.search);
  params.delete("code");
  params.delete("state");
  const newSearch = params.toString();
  return url.pathname + (newSearch ? `?${newSearch}` : "") + url.hash;
}

export function createAuthClient(config: AuthClientConfig): EnhancedAuthClient {
  const baseClient = createAuthClientOriginal(config);
  const { appUri } = config;

  const enhancedClient: EnhancedAuthClient = {
    ...baseClient,

    getAppUri(): string {
      return appUri;
    },

    async getAuthHeadersForQuery(
      path: string = "/query",
      method: string = "POST",
    ) {
      const url = `${appUri}${path}`;
      return baseClient.getAuthHeaders(url, method);
    },
  };

  return enhancedClient;
}

// ============================================================================
// Auth Context
// ============================================================================

/**
 * Authentication state.
 *
 * This type matches the AuthState from @tailor-platform/auth-public-client.
 */
export type AuthState = {
  /**
   * Whether the user is authenticated.
   */
  isAuthenticated: boolean;

  /**
   * Error message if authentication failed.
   */
  error: string | null;

  /**
   * Whether the initial authentication check has completed.
   */
  isReady: boolean;
};

type AuthContextType = {
  /**
   * Current authentication state.
   *
   * Use `authState.isAuthenticated` to check if authenticated.
   * Use `authState.isReady` to check if initial auth check has completed.
   */
  authState: AuthState;

  /**
   * Initiates the login process.
   *
   * This redirects the user to the Tailor Platform authentication page.
   */
  login: () => Promise<void>;

  /**
   * Logs out the current user.
   *
   * This clears the authentication tokens and user session.
   */
  logout: () => Promise<void>;

  /**
   * Checks the current authentication status.
   *
   * Remember that this method always makes a network request to verify the auth status.
   * This also attempts to refresh tokens internally if they are expired.
   */
  checkAuthStatus: () => Promise<AuthState>;

  /**
   * Returns a Promise that resolves when the initial authentication check has completed.
   * Useful for Suspense integration.
   * @internal
   */
  ready: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

type AuthProviderProps = {
  /**
   * The EnhancedAuthClient instance created with createAuthClient from @tailor-platform/app-shell.
   * This allows you to initialize the client outside the component.
   */
  client: EnhancedAuthClient;

  /**
   * Enable automatic login on initialization.
   */
  autoLogin?: boolean;

  /**
   * Guard UI component to show when loading or unauthenticated.
   *
   * If not provided, children will be just rendered in any auth state.
   */
  guardComponent?: () => React.ReactNode;
};

/**
 * Authentication provider component.
 *
 * Wrap your application with this component to provide authentication context.
 *
 * @example
 * ```tsx
 * import { createAuthClient, AuthProvider } from "@tailor-platform/app-shell";
 *
 * // Create the auth client outside of the component
 * const authClient = createAuthClient({
 *   clientId: "your-client-id",
 *   appUri: "https://xyz.erp.dev",
 * });
 *
 * function App() {
 *   return (
 *     <AuthProvider client={authClient}>
 *       <YourAppComponents />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export const AuthProvider = (
  props: React.PropsWithChildren<AuthProviderProps>,
) => {
  const client = props.client;

  // Subscribe to client state changes for useSyncExternalStore
  const subscribe = useCallback(
    (callback: () => void) => {
      return client.addEventListener((event) => {
        if (event.type === "auth_state_changed") {
          callback();
        }
      });
    },
    [client],
  );

  // Get current state snapshot (no cache needed - client returns same reference)
  const getSnapshot = useCallback(() => client.getState(), [client]);

  // Use useSyncExternalStore for state management
  const authState = useSyncExternalStore(subscribe, getSnapshot);

  // Initialize authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      // Check if we're returning from OAuth callback
      const params = new URLSearchParams(window.location.search);
      if (params.has("code")) {
        try {
          await client.handleCallback();
          // Clean up URL - remove only OAuth-related params, preserve others
          const cleanUrl = buildCleanOAuthCallbackUrl(
            new URL(window.location.href),
          );
          window.history.replaceState({}, "", cleanUrl);
        } catch (error) {
          console.error("Failed to handle callback:", error);
        }
      } else {
        // Check authentication status
        await client.checkAuthStatus();
      }
    };

    initAuth();
  }, [client]);

  /**
   * Initialize login if the user is not authenticated
   *
   * If `autoLogin` is set to false, or the user is already authenticated, do nothing.
   */
  useEffect(() => {
    if (!props.autoLogin) {
      return;
    }

    if (!authState.isReady || authState.isAuthenticated) {
      return;
    }

    client.login();
  }, [authState.isReady, authState.isAuthenticated, props.autoLogin, client]);

  const isAuthenticated = authState.isAuthenticated;

  const contents =
    props.guardComponent && (!authState.isReady || !isAuthenticated) ? (
      <props.guardComponent />
    ) : (
      props.children
    );

  return (
    <AuthContext.Provider
      value={{
        authState,
        login: () => client.login(),
        logout: () => client.logout(),
        checkAuthStatus: () => client.checkAuthStatus(),
        ready: () => client.ready(),
      }}
    >
      {contents}
    </AuthContext.Provider>
  );
};

/**
 * Internal helper to get common auth values from context.
 */
const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth/useAuthSuspense must be used within an AuthProvider",
    );
  }
  return context;
};

/**
 * Authentication hook.
 *
 * Returns authentication state and methods. Use `isReady` to check if
 * the initial authentication check has completed before rendering
 * authenticated content.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, isReady, login, logout } = useAuth();
 *
 *   if (!isReady) return <Loading />;
 *   if (!isAuthenticated) return <button onClick={login}>Log In</button>;
 *
 *   return <button onClick={logout}>Log Out</button>;
 * }
 * ```
 */
export const useAuth = () => {
  const context = useAuthContext();
  const { isAuthenticated, error, isReady } = context.authState;

  return {
    error,
    isAuthenticated,
    isReady,
    login: context.login,
    logout: context.logout,
    checkAuthStatus: context.checkAuthStatus,
  };
};

/**
 * Suspense-compatible authentication hook.
 *
 * This hook integrates with React Suspense by throwing a promise while
 * the authentication state is loading. Use this hook when you want to
 * leverage Suspense boundaries for loading states.
 *
 * This uses the `ready()` function from the underlying auth client, which
 * returns a Promise that resolves when the initial authentication check has completed.
 *
 * @throws {Promise} Throws a promise while authentication is loading
 * @throws {Error} Throws an error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * import { Suspense } from 'react';
 * import { createAuthClient, AuthProvider, useAuthSuspense } from '@tailor-platform/app-shell';
 *
 * const authClient = createAuthClient({
 *   clientId: 'your-client-id',
 *   appUri: 'https://api.example.com',
 * });
 *
 * function App() {
 *   return (
 *     <AuthProvider client={authClient}>
 *       <Suspense fallback={<div>Loading authentication...</div>}>
 *         <ProtectedContent />
 *       </Suspense>
 *     </AuthProvider>
 *   );
 * }
 *
 * function ProtectedContent() {
 *   const { isAuthenticated, login, logout } = useAuthSuspense();
 *
 *   // isReady is guaranteed to be true here (Suspense handles loading)
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={login}>Log In</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome!</p>
 *       <button onClick={logout}>Log Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useAuthSuspense = () => {
  const context = useAuthContext();

  // Throw the ready() promise for Suspense integration
  // This will suspend the component until the initial auth check is complete
  if (!context.authState.isReady) {
    throw context.ready();
  }

  // Return only the necessary values (isReady is always true here)
  const { isAuthenticated, error } = context.authState;
  return {
    error,
    isAuthenticated,
    login: context.login,
    logout: context.logout,
    checkAuthStatus: context.checkAuthStatus,
  };
};
