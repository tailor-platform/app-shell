import type { AuthState, EnhancedAuthClient } from "../contexts/auth-context";

/** A test auth client whose state can be changed without OAuth or network requests. */
export interface MemoryAuthClient extends EnhancedAuthClient {
  /** Replace the complete state and notify auth subscribers. */
  setState(next: AuthState): void;
}

type AuthListener = Parameters<EnhancedAuthClient["addEventListener"]>[0];
type AuthEvent = Parameters<AuthListener>[0];

const unsupported = (method: string): never => {
  throw new Error(
    `MemoryAuthClient.${method} is not supported; mock your application's boundary instead.`,
  );
};

/**
 * Create an isolated auth fixture, initially ready and signed out.
 *
 * Loading is explicitly controlled: an `isReady: false` fixture stays pending
 * until `setState` publishes a ready state, or `login` / `logout` completes.
 * OAuth, tokens, authenticated fetch, and browser persistence are not simulated.
 */
export function createMemoryAuthClient(
  initialState: AuthState = { isReady: true, isAuthenticated: false, error: null },
): MemoryAuthClient {
  let snapshot: Readonly<AuthState> = Object.freeze({ ...initialState });
  const subscriptions = new Set<{ listener: AuthListener }>();
  let pendingReady: { promise: Promise<void>; resolve: () => void } | undefined;

  const emit = (type: AuthEvent["type"]) => {
    const event: AuthEvent = { type, data: snapshot };
    const currentSubscriptions = [...subscriptions];
    for (const { listener } of currentSubscriptions) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in auth event listener:", error);
      }
    }
  };

  const updateState = (next: AuthState): boolean => {
    if (
      snapshot.isReady === next.isReady &&
      snapshot.isAuthenticated === next.isAuthenticated &&
      snapshot.error === next.error
    ) {
      return false;
    }

    snapshot = Object.freeze({ ...next });
    if (snapshot.isReady && pendingReady) {
      pendingReady.resolve();
      pendingReady = undefined;
    }
    return true;
  };

  const ready = (): Promise<void> => {
    if (snapshot.isReady) return Promise.resolve();
    if (!pendingReady) {
      let resolve!: () => void;
      const promise = new Promise<void>((resolvePromise) => {
        resolve = resolvePromise;
      });
      pendingReady = { promise, resolve };
    }
    return pendingReady.promise;
  };

  return {
    getState: () => snapshot,
    setState(next) {
      if (updateState(next)) emit("auth_state_changed");
    },
    async login() {
      updateState({ isReady: true, isAuthenticated: true, error: null });
      emit("login");
      emit("auth_state_changed");
    },
    async logout() {
      updateState({ isReady: true, isAuthenticated: false, error: null });
      emit("logout");
      emit("auth_state_changed");
    },
    ready,
    async checkAuthStatus() {
      while (!snapshot.isReady) await ready();
      return snapshot;
    },
    addEventListener(listener) {
      const subscription = { listener };
      subscriptions.add(subscription);
      return () => {
        subscriptions.delete(subscription);
      };
    },
    async getAuthUrl() {
      return unsupported("getAuthUrl");
    },
    async handleCallback() {
      return unsupported("handleCallback");
    },
    async refreshTokens() {
      return unsupported("refreshTokens");
    },
    configure() {
      unsupported("configure");
    },
    async getAuthHeaders() {
      return unsupported("getAuthHeaders");
    },
    async fetch() {
      return unsupported("fetch");
    },
    getAppUri() {
      return unsupported("getAppUri");
    },
  };
}
