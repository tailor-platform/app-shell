import type { AuthState, EnhancedAuthClient } from "@tailor-platform/app-shell";

type AuthStateListener = (event: { type: string }) => void;

const STORAGE_KEY = "e2e-local-auth-session";
const AUTH_STATE_CHANGED = "auth_state_changed";

const readSession = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(STORAGE_KEY) === "true";
};

const writeSession = (isAuthenticated: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(isAuthenticated));
};

// A tiny in-browser auth client used only by the local routing smoke tests.
//
// Why this fake exists:
// - the new routing smoke tests want to exercise AppShell + AuthProvider +
//   React Router together in a real browser
// - those checks should stay fast and deterministic, without depending on an
//   external IDP, network round-trips, or seeded remote test users
// - for these tests we do not need to prove OAuth correctness; we only need the
//   auth contract that AuthProvider consumes (`getState`, `login`, `logout`,
//   `checkAuthStatus`, and auth_state_changed events)
//
// The real OAuth flow is still covered separately in auth.spec.ts. This fake is
// only for the cheaper local path that validates auth/router integration such
// as protected deep links, redirects, reload persistence, and logout behavior.
export const createFakeAuthClient = (): EnhancedAuthClient => {
  let state: AuthState = {
    isAuthenticated: false,
    error: null,
    isReady: false,
  };
  const listeners = new Set<AuthStateListener>();

  const emitAuthStateChanged = () => {
    for (const listener of listeners) {
      listener({ type: AUTH_STATE_CHANGED });
    }
  };

  const setState = (nextState: AuthState) => {
    state = nextState;
    emitAuthStateChanged();
  };

  const client: EnhancedAuthClient = {
    getState: () => state,
    login: async () => {
      writeSession(true);
      setState({ isAuthenticated: true, error: null, isReady: true });
    },
    logout: async () => {
      writeSession(false);
      setState({ isAuthenticated: false, error: null, isReady: true });
    },
    getAuthUrl: async () => window.location.href,
    handleCallback: async () => {},
    checkAuthStatus: async () => {
      // Re-hydrate from localStorage so reload-based tests observe the same
      // session behavior that a real persisted auth client would expose.
      const nextState = {
        isAuthenticated: readSession(),
        error: null,
        isReady: true,
      } satisfies AuthState;
      setState(nextState);
      return nextState;
    },
    refreshTokens: async () => {},
    ready: async () => {
      if (!state.isReady) {
        await client.checkAuthStatus();
      }
    },
    configure: () => {},
    addEventListener: (listener) => {
      listeners.add(listener as AuthStateListener);
      return () => {
        listeners.delete(listener as AuthStateListener);
      };
    },
    getAuthHeaders: async () => ({
      Authorization: "DPoP fake-access-token",
      DPoP: "fake-dpop-proof",
    }),
    getAppUri: () => window.location.origin,
    fetch: (input, init) => fetch(input, init),
  };

  return client;
};
