import type { EnhancedAuthClient } from "./contexts/auth-context";
import type { AuthState } from "./contexts/auth-context";
import type {
  AuthEvent,
  AuthEventListener,
} from "@tailor-platform/auth-public-client";

/**
 * Configuration for creating a test auth client.
 */
export interface TestAuthClientConfig {
  /** Initial authentication state. Defaults to unauthenticated and ready. */
  state?: Partial<AuthState>;
  /** The appUri to return from getAppUri(). Defaults to "https://test.example.com". */
  appUri?: string;
  /**
   * A machine token (or any bearer token) to use for API requests.
   *
   * When provided, `getAuthHeaders()` returns a real Authorization header and
   * `fetch()` automatically attaches it to every request. This allows E2E tests
   * to bypass OAuth login while still communicating with a real backend.
   */
  token?: string;
}

/**
 * A test auth client with methods to programmatically control auth state.
 */
export interface TestAuthClient extends EnhancedAuthClient {
  /**
   * Update the auth state and notify subscribers.
   */
  setState(state: Partial<AuthState>): void;
}

/**
 * Create a test authentication client for use in tests.
 *
 * This utility creates an `EnhancedAuthClient` that can be passed directly
 * to `AuthProvider` without requiring a real OAuth server. It defaults to
 * an authenticated and ready state, making it easy to test components that
 * sit behind authentication.
 *
 * @example
 * ```tsx
 * import { AuthProvider } from '@tailor-platform/app-shell';
 * import { createTestAuthClient } from '@tailor-platform/app-shell/testing';
 * import { render } from '@testing-library/react';
 *
 * const authClient = createTestAuthClient();
 *
 * render(
 *   <AuthProvider client={authClient}>
 *     <YourComponent />
 *   </AuthProvider>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Test unauthenticated state
 * const authClient = createTestAuthClient({
 *   state: { isAuthenticated: false },
 * });
 *
 * // Programmatically change state during a test
 * authClient.setState({ isAuthenticated: false, isReady: true });
 * ```
 */
export function createTestAuthClient(
  config?: TestAuthClientConfig,
): TestAuthClient {
  const appUri = config?.appUri ?? "https://test.example.com";
  const token = config?.token;

  let currentState: AuthState = {
    isAuthenticated: false,
    error: null,
    isReady: true,
    ...config?.state,
  };

  const listeners: AuthEventListener[] = [];

  const notifyListeners = () => {
    const event: AuthEvent = { type: "auth_state_changed" };
    for (const listener of listeners) {
      listener(event);
    }
  };

  const client: TestAuthClient = {
    getState() {
      return currentState;
    },

    setState(state: Partial<AuthState>) {
      currentState = { ...currentState, ...state };
      notifyListeners();
    },

    login() {
      currentState = { isAuthenticated: true, error: null, isReady: true };
      notifyListeners();
      return Promise.resolve();
    },

    logout() {
      currentState = { isAuthenticated: false, error: null, isReady: true };
      notifyListeners();
      return Promise.resolve();
    },

    getAuthUrl() {
      return Promise.resolve("https://test.example.com/auth");
    },

    checkAuthStatus() {
      return Promise.resolve(currentState);
    },

    refreshTokens() {
      return Promise.resolve();
    },

    ready() {
      return Promise.resolve();
    },

    configure() {},

    addEventListener(listener: AuthEventListener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    },

    getAuthHeaders(_url: string | URL, _method?: string) {
      return Promise.resolve({
        Authorization: `Bearer ${token ?? "test-token"}`,
        DPoP: "test-dpop-proof",
      });
    },

    fetch(input: RequestInfo | URL, init?: RequestInit) {
      if (!token) {
        return globalThis.fetch(input, init);
      }
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return globalThis.fetch(input, { ...init, headers });
    },

    handleCallback() {
      return Promise.resolve();
    },

    getAppUri() {
      return appUri;
    },

    getCallbackStatusSnapshot() {
      return "idle";
    },

    subscribeCallbackStatus(_listener: () => void) {
      // No-op for test client - callback is always idle
      return () => {};
    },
  };

  return client;
}
