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
 *
 * "denied" is distinct from "rejected": it means another automatic login round
 * trip will not help, so auto-login stays out of it. Two things land there —
 * the authorization server refusing outright (the user declined consent, the
 * client is not permitted), and a callback that keeps failing after its retry
 * budget is spent. "rejected" is a failure that is still worth one more attempt.
 */
type CallbackStatus = "idle" | "pending" | "resolved" | "rejected" | "denied";

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
   * Provided automatically by clients created with {@link createAuthClient}.
   * @internal
   */
  getCallbackStatusSnapshot?(): CallbackStatus;

  /**
   * Subscribe to callback settlement changes.
   * Provided automatically by clients created with {@link createAuthClient}.
   * @internal
   */
  subscribeCallbackStatus?(listener: () => void): () => void;
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
        deny: () => {
          updateStatus("denied");
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
 * How many times auto-login may re-run a callback that failed, per browser tab.
 *
 * A failed callback is worth one more attempt: the common causes (a PKCE
 * verifier clobbered by a concurrent teardown, two tabs racing the same
 * single-slot OAuth storage) clear on a second pass. A failure that survives
 * the retry is treated as permanent, because every attempt is a full-page
 * redirect to the authorization server — without a ceiling, a deterministic
 * failure (blocked or evicted browser storage, a misconfigured client) becomes
 * an unbounded redirect loop, which is worse than the dead end it replaced.
 */
const MAX_AUTOMATIC_CALLBACK_RETRIES = 1;

const CALLBACK_FAILURE_COUNT_KEY = "tailor-app-shell:oauth-callback-failures";

/**
 * Read the consecutive-failure count for this tab.
 *
 * sessionStorage rather than memory, because each retry is a full page load and
 * an in-memory counter resets with it. Reports failures as exhausted when
 * storage is unreadable: without somewhere to count, the ceiling cannot be
 * enforced, and looping is the worse failure. Such a browser cannot complete
 * the flow anyway — the auth client needs IndexedDB.
 */
const readCallbackFailureCount = (): number | null => {
  try {
    const raw = window.sessionStorage.getItem(CALLBACK_FAILURE_COUNT_KEY);
    const count = raw == null ? 0 : Number.parseInt(raw, 10);
    return Number.isNaN(count) ? null : count;
  } catch {
    return null;
  }
};

const recordCallbackFailure = (count: number) => {
  try {
    window.sessionStorage.setItem(CALLBACK_FAILURE_COUNT_KEY, String(count + 1));
  } catch {
    // Nothing to do: the read side already treats unreadable storage as exhausted.
  }
};

const clearCallbackFailures = () => {
  try {
    window.sessionStorage.removeItem(CALLBACK_FAILURE_COUNT_KEY);
  } catch {
    // Best effort — a stale count only costs a retry, and it is tab-scoped.
  }
};

/**
 * Create an enhanced authentication client.
 *
 * This wrapper around the original createAuthClient adds convenience methods
 * to reduce duplication of the appUri across your application.
 *
 * **Side effect on call**: If the current URL contains OAuth callback parameters
 * (`code` or `error`), this function immediately starts `handleCallback()` to
 * exchange the authorization code. This happens at call time — before any React
 * render — so it is safe to call at module scope.
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
      // Read this before the callback settles: the parameters are stripped below.
      const authServerReportedError = currentUrl.searchParams.has("error");
      const { resolve, reject, deny } = callbackManager.start();

      // auth-public-client only cleans the URL when the code exchange succeeds.
      // Every failure path returns (or throws) with `code` / `error` still in the
      // query string, which would otherwise leave the app wedged: the parameters
      // make this look like a callback URL forever, and a reload just replays the
      // same failing callback. Strip them on every outcome, before settling, so
      // whatever observes the settled status already sees a clean URL.
      //
      // The outcome is classified from the resulting auth state rather than from
      // whether the promise resolved. Not every failure throws — an `error` from
      // the authorization server and a state mismatch both return normally after
      // recording the error — so resolve-vs-throw is the wrong signal, and using
      // it would let those two skip the retry ceiling and loop.
      const settle = () => {
        clearOAuthCallbackParams();

        if (baseClient.getState().isAuthenticated) {
          clearCallbackFailures();
          resolve();
          return;
        }

        const failureCount = readCallbackFailureCount();
        if (
          authServerReportedError ||
          failureCount === null ||
          failureCount >= MAX_AUTOMATIC_CALLBACK_RETRIES
        ) {
          deny();
          return;
        }

        recordCallbackFailure(failureCount);
        reject();
      };

      baseClient
        .handleCallback()
        .then(settle)
        .catch((error) => {
          settle();
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

/**
 * Query parameters an authorization server may add when redirecting back.
 * Removed together so a settled callback cannot be mistaken for a pending one.
 */
const OAUTH_CALLBACK_PARAMS = [
  "code",
  "state",
  "error",
  "error_description",
  "error_uri",
  "iss",
] as const;

const isCurrentOAuthCallbackUrl = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return isOAuthCallbackUrl(new URL(window.location.href));
};

/**
 * Remove the OAuth callback parameters from the current URL, preserving any
 * unrelated query parameters and the hash. Uses `replaceState` so the failed
 * callback does not stay in session history for the back button to replay.
 */
const clearOAuthCallbackParams = () => {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (!isOAuthCallbackUrl(url)) {
    return;
  }

  for (const param of OAUTH_CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }

  // Preserve the existing history state: routers keep their own bookkeeping on
  // it (react-router stores {usr, key, idx}, Next.js stores __NA), and replacing
  // it with a fresh object desyncs them for the rest of the session.
  window.history.replaceState(
    window.history.state,
    document.title,
    `${url.pathname}${url.search}${url.hash}`,
  );
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
   * When provided, AuthProvider renders this component directly while auth
   * is not ready or the user is not authenticated. Children are hidden until
   * auth resolves to an authenticated state.
   *
   * If not provided, children are rendered regardless of auth state.
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
const useAutoLogin = (props: {
  client: EnhancedAuthClient;
  enabled?: boolean;
  callbackStatus: CallbackStatus;
}) => {
  // Prevent duplicate login redirects when multiple auth_state_changed
  // events fire before the first login attempt settles.
  const loginInFlightRef = useRef<Promise<void> | null>(null);

  // Attempt auto-login if unauthenticated when auth state changes or on initial load.
  const attemptAutoLogin = useCallback(() => {
    const authState = props.client.getState();
    if (
      !props.enabled ||
      // Hold off while a code exchange is in flight, and stand down entirely
      // once the authorization server has refused: redirecting back would ask
      // the same question and get the same answer.
      props.callbackStatus === "pending" ||
      props.callbackStatus === "denied" ||
      // Only consult the URL while no callback has been claimed. This client
      // starts the exchange itself whenever it is constructed on a callback
      // URL, so "idle" here means nobody is handling these parameters and
      // redirecting is unsafe. Once a callback has run, its status is the
      // authority — reading the URL instead is what used to strand the app,
      // because a failed callback left its parameters in place forever.
      (props.callbackStatus === "idle" && isCurrentOAuthCallbackUrl()) ||
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
  }, [props.client, props.enabled, props.callbackStatus]);

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
export const useEnsureAuthInitialized = (
  client: EnhancedAuthClient,
  callbackStatus: CallbackStatus,
) => {
  const initInFlightRef = useRef<Promise<void> | null>(null);

  const ensureInitialized = useCallback(async (): Promise<void> => {
    const authState = client.getState();

    // Skip initialization while a callback exchange is actively in progress.
    // If the callback fails ("rejected"), we fall through so checkAuthStatus
    // can still resolve the session instead of leaving isReady permanently false.
    if (callbackStatus === "pending" || authState.isReady) {
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
  }, [client, callbackStatus]);

  return ensureInitialized;
};

/**
 * Reads the OAuth callback handling state from the auth client via
 * useSyncExternalStore so AuthProvider can coordinate rendering while the
 * callback exchange is still in flight.
 */
const useCallbackStatus = (client: EnhancedAuthClient): CallbackStatus => {
  const subscribe = useCallback(
    (notify: () => void) => client.subscribeCallbackStatus?.(notify) ?? (() => {}),
    [client],
  );
  const getSnapshot = useCallback(() => client.getCallbackStatusSnapshot?.() ?? "idle", [client]);

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

  // Read callback status first so it can be passed to both useAutoLogin and
  // useEnsureAuthInitialized. This lets each retry automatically when a pending
  // callback settles — the new function references trigger their effects again,
  // which is what lets auto-login resume after a failed callback instead of
  // being stranded by leftover parameters in the URL.
  const callbackStatus = useCallbackStatus(client);

  // Set up auth state subscription for auto-login orchestration
  const { subscribeAuthState } = useAutoLogin({
    client,
    enabled: props.autoLogin,
    callbackStatus,
  });

  // Use useSyncExternalStore for state management from auth client.
  const getSnapshot = useCallback(() => client.getState(), [client]);
  const authState = useSyncExternalStore(subscribeAuthState, getSnapshot);

  // Prepare a shared initialization function so AuthProvider can start the
  // first auth check itself without depending on router navigation.
  const ensureAuthInitialized = useEnsureAuthInitialized(client, callbackStatus);

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
