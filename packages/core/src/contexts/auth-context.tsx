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
 * Internal type for tracking OAuth callback handling status.
 */
type CallbackStatus = "idle" | "pending" | "resolved" | "rejected";

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

  /**
   * Returns the current OAuth callback handling state.
   * @internal
   */
  getCallbackStatusSnapshot(): CallbackStatus;

  /**
   * Subscribe to callback settlement changes.
   * @internal
   */
  subscribeCallbackStatus(listener: () => void): () => void;
}

/**
 * Small external-store manager dedicated to the OAuth callback lifecycle.
 *
 * AuthProvider reads this state via useSyncExternalStore so it can delay
 * rendering while the login callback is still being processed, without
 * coupling that control flow to the auth client's own auth_state_changed
 * events. The manager exposes callback-specific transitions instead of a
 * generic setter so createAuthClient can describe the callback flow directly.
 */
const createCallbackStatusManager = () => {
  let callbackStatus: CallbackStatus = "idle";
  const CALLBACK_STATUS_CHANGE_EVENT = "callbackstatuschange";
  const target = new EventTarget();

  const updateStatus = (nextStatus: CallbackStatus) => {
    callbackStatus = nextStatus;
    target.dispatchEvent(new Event(CALLBACK_STATUS_CHANGE_EVENT));
  };

  return {
    getSnapshot: () => callbackStatus,
    start: () => {
      updateStatus("pending");

      return {
        resolve: () => {
          updateStatus("resolved");
        },
        reject: () => {
          updateStatus("rejected");
        },
      };
    },
    subscribe: (listener: () => void) => {
      const eventListener: EventListener = () => {
        listener();
      };

      target.addEventListener(CALLBACK_STATUS_CHANGE_EVENT, eventListener);
      return () => {
        target.removeEventListener(CALLBACK_STATUS_CHANGE_EVENT, eventListener);
      };
    },
  };
};

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
  const callbackManager = createCallbackStatusManager();

  // Start OAuth callback handling immediately at module load time (before any
  // React render). This is intentionally a side effect outside the React
  // lifecycle — network I/O should not happen in the render phase.
  if (typeof window !== "undefined") {
    const currentUrl = new URL(window.location.href);

    if (isOAuthCallbackUrl(currentUrl)) {
      const { resolve, reject } = callbackManager.start();

      baseClient
        .handleCallback()
        .then(resolve)
        .catch((error) => {
          reject();
          console.error("Failed to handle OAuth callback:", error);
        });
    }
  }

  const enhancedClient: EnhancedAuthClient = {
    ...baseClient,

    getAppUri(): string {
      return appUri;
    },

    getCallbackStatusSnapshot() {
      return callbackManager.getSnapshot();
    },

    subscribeCallbackStatus(listener) {
      return callbackManager.subscribe(listener);
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

const isOAuthCallbackUrl = (url: URL) =>
  url.searchParams.has("code") || url.searchParams.has("error");

const isCurrentOAuthCallbackUrl = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return isOAuthCallbackUrl(new URL(window.location.href));
};

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
   * For guarding components placed between AuthProvider and AppShell,
   * rely on the authState from useAuth() directly.
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
      isCurrentOAuthCallbackUrl() ||
      !authState.isReady ||
      authState.isAuthenticated ||
      loginInFlightRef.current
    ) {
      return;
    }

    loginInFlightRef.current = props.client
      .login()
      .then(() => undefined)
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
 * Builds a stable function that resolves the initial auth state once.
 *
 * AuthProvider uses the returned function from its own useEffect so the
 * initialization flow stays visible at the call site, while overlapping
 * checks still collapse into a single request.
 */
export const useEnsureAuthInitialized = (client: EnhancedAuthClient) => {
  const initInFlightRef = useRef<Promise<void> | null>(null);

  const ensureInitialized = useCallback(async (): Promise<void> => {
    const authState = client.getState();
    const isCallbackUrl = isCurrentOAuthCallbackUrl();

    if (isCallbackUrl || authState.isReady) {
      return;
    }

    if (initInFlightRef.current) {
      return initInFlightRef.current;
    }

    initInFlightRef.current = client
      .checkAuthStatus()
      .then(() => undefined)
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        initInFlightRef.current = null;
      });

    return initInFlightRef.current;
  }, [client]);

  return ensureInitialized;
};

/**
 * Reads the OAuth callback handling state from the auth client via
 * useSyncExternalStore so AuthProvider can coordinate rendering while the
 * callback exchange is still in flight.
 */
const useCallbackStatus = (client: EnhancedAuthClient) => {
  const subscribe = useCallback(
    (notify: () => void) => client.subscribeCallbackStatus(notify),
    [client],
  );
  const getSnapshot = useCallback(() => client.getCallbackStatusSnapshot(), [client]);

  return useSyncExternalStore(subscribe, getSnapshot);
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

  // Use useSyncExternalStore for state management from auth client.
  const getSnapshot = useCallback(() => client.getState(), [client]);
  const authState = useSyncExternalStore(subscribeAuthState, getSnapshot);

  // Prepare a shared initialization function so AuthProvider can start the
  // first auth check itself without depending on router navigation.
  const ensureAuthInitialized = useEnsureAuthInitialized(client);

  // AuthProvider owns the normal startup path: on mount, ask the auth client
  // to resolve the current session so consumers can rely on authState even
  // before any router loader has run.
  useEffect(() => {
    ensureAuthInitialized().catch((error) => {
      console.error("Failed to check auth status:", error);
    });
  }, [client, ensureAuthInitialized]);

  // While handling an OAuth callback, keep unguarded children hidden until
  // the callback settles. Guarded trees already wait on auth state instead.
  const callbackStatus = useCallbackStatus(client);
  const resolvedChildren =
    callbackStatus === "pending" && props.guardComponent == null ? null : props.children;

  const authContextValue = useMemo(
    () => ({
      authState,
      login: () => client.login(),
      logout: () => client.logout(),
      checkAuthStatus: () => client.checkAuthStatus(),
      ready: () => client.ready(),
    }),
    [authState, client],
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {props.guardComponent ? (
        <AuthGuard guardComponent={props.guardComponent}>{resolvedChildren}</AuthGuard>
      ) : (
        resolvedChildren
      )}
    </AuthContext.Provider>
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
