import {
  createContext,
  useContext,
  useSyncExternalStore,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  createAuthClient as createAuthClientOriginal,
  type AuthClient,
} from "@tailor-platform/auth-public-client";
import { RootRouteContext } from "@/contexts/root-route-context";

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
   * Authenticated fetch with built-in DPoP proof generation and token refresh.
   * Same signature as the standard `fetch` API.
   */
  fetch: AuthClient["fetch"];
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
 * // Create urql client using the auth client's fetch
 * const urqlClient = createClient({
 *   url: `${authClient.getAppUri()}/query`,
 *   fetch: authClient.fetch,
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
export function createAuthClient(config: AuthClientConfig): EnhancedAuthClient {
  const baseClient = createAuthClientOriginal(config);
  const { appUri } = config;

  const enhancedClient: EnhancedAuthClient = {
    ...baseClient,

    getAppUri(): string {
      return appUri;
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

/**
 * Guard component that shows a fallback UI while auth is not ready or
 * not authenticated. Defined here so that the router layer does not
 * need to depend on useAuth.
 */
const AuthGuard = ({
  guardComponent,
  children,
}: {
  guardComponent: () => React.ReactNode;
  children: React.ReactNode;
}) => {
  const { isReady, isAuthenticated } = useAuth();
  if (!isReady || !isAuthenticated) {
    return guardComponent();
  }
  return children;
};

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
   *
   * Note: This prop only takes effect when AuthProvider wraps an AppShell
   * component. The guard is rendered by the router's root route element,
   * so it requires RouterContainer to be present in the component tree.
   */
  guardComponent?: () => React.ReactNode;
};

/**
 * Internal hook for auto-login orchestration.
 *
 * It keeps AuthProvider focused on context wiring while this hook handles:
 * - auth_state_changed subscription
 * - initial deferred auto-login attempt
 * - duplicate login prevention
 */
const useAutoLogin = (props: { client: EnhancedAuthClient; enabled?: boolean }) => {
  // Prevent duplicate login redirects when multiple auth_state_changed
  // events fire before the first login attempt settles.
  const loginInFlightRef = useRef<Promise<void> | null>(null);

  // Attempt auto-login if unauthenticated when auth state changes or on initial load.
  const attemptAutoLogin = useCallback(() => {
    const authState = props.client.getState();
    if (
      !props.enabled ||
      !authState.isReady ||
      authState.isAuthenticated ||
      loginInFlightRef.current
    ) {
      return;
    }

    loginInFlightRef.current = props.client
      .login()
      .catch((error) => {
        console.error("Failed to auto-login after session expiry:", error);
      })
      .finally(() => {
        loginInFlightRef.current = null;
      });
  }, [props.client, props.enabled]);

  return {
    subscribeAuthState: useCallback(
      (notify: () => void) => {
        // Run one deferred check so that initial ready+unauthenticated
        // states are handled even if no auth_state_changed event fires.
        // queueMicrotask is used instead of a synchronous call to avoid
        // triggering state changes (via notify()) during the subscribe
        // phase of useSyncExternalStore, which can cause React warnings.
        queueMicrotask(() => {
          attemptAutoLogin();
        });

        return props.client.addEventListener((event) => {
          if (event.type === "auth_state_changed") {
            notify();
            attemptAutoLogin();
          }
        });
      },
      [props.client, attemptAutoLogin],
    ),
  };
};

/**
 * Starts auth initialization on mount and coalesces overlapping readiness checks.
 * Returns a function that callers can reuse as a retry path when auth is still unresolved.
 */
export const useAuthInitialization = (client: EnhancedAuthClient) => {
  const initInFlightRef = useRef<Promise<void> | null>(null);

  const ensureInitialized = useCallback(async (): Promise<void> => {
    if (client.getState().isReady) {
      return;
    }

    if (initInFlightRef.current) {
      return initInFlightRef.current;
    }

    initInFlightRef.current = client
      .checkAuthStatus()
      .then(() => undefined)
      .finally(() => {
        initInFlightRef.current = null;
      });

    return initInFlightRef.current;
  }, [client]);

  // Kick off initialization on mount instead of waiting for the first router load.
  // Router-driven loads still reuse the returned function as a retry path when
  // auth remains unresolved, but AuthProvider should not depend on navigation.
  useEffect(() => {
    ensureInitialized().catch((error) => {
      console.error("Failed to check auth status:", error);
    });
  }, [ensureInitialized]);

  return ensureInitialized;
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
export const AuthProvider = (props: React.PropsWithChildren<AuthProviderProps>) => {
  const client = props.client;

  // Set up auth state subscription for auto-login orchestration
  const { subscribeAuthState } = useAutoLogin({
    client,
    enabled: props.autoLogin,
  });

  // Get current state snapshot (no cache needed - client returns same reference)
  const getSnapshot = useCallback(() => client.getState(), [client]);

  // Use useSyncExternalStore for state management
  const authState = useSyncExternalStore(subscribeAuthState, getSnapshot);

  // Reuse the same initialization path for mount-time bootstrapping and
  // loader-time retries so unresolved auth state is handled consistently.
  const ensureInitialized = useAuthInitialization(client);

  // Build the root loader inside AuthProvider so that the router layer
  // never needs to know about EnhancedAuthClient internals.
  const authLoader = useCallback(
    async (requestUrl: URL): Promise<Response | null> => {
      // The "code" query parameter indicates a redirect back from the OAuth provider.
      // handleCallback() internally cleans up the OAuth-related query parameters
      // from the URL, so no additional URL cleanup is needed here.
      if (requestUrl.searchParams.has("code")) {
        try {
          await client.handleCallback();
        } catch (error) {
          console.error("Failed to handle callback:", error);
        }
        return null;
      }

      // Retry the initialization flow on navigation when auth state is still unresolved.
      // The provider also kicks this off on mount so consumers outside AppShell do not deadlock.
      if (!client.getState().isReady) {
        try {
          await ensureInitialized();
        } catch (error) {
          // Intentionally swallow errors to avoid rendering the error boundary
          // on transient failures (e.g. network timeouts). The next navigation
          // will re-run this loader and retry automatically.
          console.error("Failed to check auth status:", error);
        }
      }

      return null;
    },
    [client, ensureInitialized],
  );

  const guardComponent = props.guardComponent;
  const guardComponentWrapper = useMemo(
    () =>
      guardComponent
        ? (children: React.ReactNode) => (
            <AuthGuard guardComponent={guardComponent}>{children}</AuthGuard>
          )
        : undefined,
    [guardComponent],
  );

  const rootRouteCtxValue = useMemo(
    () => ({ loader: authLoader, wrapComponent: guardComponentWrapper }),
    [authLoader, guardComponentWrapper],
  );

  return (
    <RootRouteContext.Provider value={rootRouteCtxValue}>
      <AuthContext.Provider
        value={{
          authState,
          login: () => client.login(),
          logout: () => client.logout(),
          checkAuthStatus: () => client.checkAuthStatus(),
          ready: () => client.ready(),
        }}
      >
        {props.children}
      </AuthContext.Provider>
    </RootRouteContext.Provider>
  );
};

/**
 * Internal helper to get common auth values from context.
 */
const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth/useAuthSuspense must be used within an AuthProvider");
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
