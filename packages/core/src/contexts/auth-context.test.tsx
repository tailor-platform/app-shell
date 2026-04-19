import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { Suspense } from "react";

// Mock auth-public-client before importing auth-context
vi.mock("@tailor-platform/auth-public-client", () => ({
  createAuthClient: vi.fn(),
}));

import {
  AuthProvider,
  useAuth,
  useEnsureAuthInitialized,
  useAuthSuspense,
  type EnhancedAuthClient,
} from "./auth-context";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

const LoadingGuard = () => <div>Loading...</div>;
const LoginGuard = () => <div>Please log in</div>;

describe("AuthProvider", () => {
  // Create a mock auth client with a stable state object
  // useSyncExternalStore requires getSnapshot to return the same reference if the state hasn't changed
  const createMockAuthClient = (
    initialState?: {
      isAuthenticated: boolean;
      error: string | null;
      isReady: boolean;
    },
    overrides?: Partial<EnhancedAuthClient>,
  ): EnhancedAuthClient => {
    // Use a stable reference for the state object
    const state = initialState ?? {
      isAuthenticated: false,
      error: null,
      isReady: false,
    };

    const baseHandleCallback = overrides?.handleCallback ?? vi.fn();
    let handleCallbackInFlight: Promise<void> | null = null;
    const handleCallback = vi.fn(() => {
      if (handleCallbackInFlight) {
        return handleCallbackInFlight;
      }

      const callbackPromise = Promise.resolve(baseHandleCallback()).finally(() => {
        handleCallbackInFlight = null;
      });
      handleCallbackInFlight = callbackPromise;
      return callbackPromise;
    });

    const { handleCallback: _ignoredHandleCallback, ...otherOverrides } = overrides ?? {};

    return {
      getState: vi.fn(() => state),
      login: vi.fn(),
      logout: vi.fn(),
      getAuthUrl: vi.fn(),
      checkAuthStatus: vi.fn().mockResolvedValue({
        isAuthenticated: false,
        error: null,
        isReady: true,
      }),
      refreshTokens: vi.fn(),
      ready: vi.fn(() => Promise.resolve()),
      configure: vi.fn(),
      addEventListener: vi.fn(() => () => {}),
      getAuthHeaders: vi.fn(),
      fetch: vi.fn(),
      getAppUri: vi.fn(() => "https://api.test.com"),
      callbackPromise: null,
      ...otherOverrides,
      handleCallback,
    } as EnhancedAuthClient;
  };

  describe("useEnsureAuthInitialized", () => {
    it("should initialize auth status on mount", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: false,
      };
      const mockCheckAuthStatus = vi.fn().mockResolvedValue({
        isAuthenticated: true,
        error: null,
        isReady: true,
      });

      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: mockCheckAuthStatus,
      });

      const { result } = renderHook(() => useEnsureAuthInitialized(mockClient));

      await act(async () => {
        await result.current();
      });

      expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
    });

    it("should coalesce overlapping auth initialization checks", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: false,
      };

      let resolveCheckAuthStatus: (() => void) | undefined;
      const mockCheckAuthStatus = vi.fn(
        () =>
          new Promise<{
            isAuthenticated: boolean;
            error: null;
            isReady: true;
          }>((resolve) => {
            resolveCheckAuthStatus = () =>
              resolve({
                isAuthenticated: true,
                error: null,
                isReady: true,
              });
          }),
      );

      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: mockCheckAuthStatus,
      });

      const { result } = renderHook(() => useEnsureAuthInitialized(mockClient));

      const mountRetry = result.current();

      await waitFor(() => {
        expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
      });

      const firstRetry = result.current();
      const secondRetry = result.current();

      expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);

      resolveCheckAuthStatus?.();
      await Promise.all([mountRetry, firstRetry, secondRetry]);
    });

    it("should skip auth initialization while handling an OAuth callback", async () => {
      window.history.replaceState({}, "", "/?code=auth-code-123&state=abc");

      const state = {
        isAuthenticated: false,
        error: null,
        isReady: false,
      };
      const mockCheckAuthStatus = vi.fn().mockResolvedValue({
        isAuthenticated: false,
        error: null,
        isReady: true,
      });

      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: mockCheckAuthStatus,
      });

      const { result } = renderHook(() => useEnsureAuthInitialized(mockClient));

      await act(async () => {
        await result.current();
      });

      expect(mockCheckAuthStatus).not.toHaveBeenCalled();
    });
  });

  describe("initial state", () => {
    it("should render children when not using guard component", () => {
      const mockClient = createMockAuthClient();

      render(
        <AuthProvider client={mockClient}>
          <div>Test Content</div>
        </AuthProvider>,
      );

      expect(screen.getByText("Test Content")).toBeDefined();
    });

    it("should show guard component when not ready", () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: false,
      };
      const mockClient = createMockAuthClient(state);

      render(
        <AuthProvider client={mockClient} guardComponent={LoadingGuard}>
          <div>Protected Content</div>
        </AuthProvider>,
      );

      // Guard is now rendered directly by AuthProvider
      expect(screen.getByText("Loading...")).toBeDefined();
      expect(screen.queryByText("Protected Content")).toBeNull();
    });

    it("should show guard component when not authenticated", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };
      const mockClient = createMockAuthClient(state);

      render(
        <AuthProvider client={mockClient} guardComponent={LoginGuard}>
          <div>Protected Content</div>
        </AuthProvider>,
      );

      // Guard is now rendered directly by AuthProvider
      expect(screen.getByText("Please log in")).toBeDefined();
      expect(screen.queryByText("Protected Content")).toBeNull();
    });

    it("should show children when authenticated", async () => {
      const state = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: vi.fn().mockResolvedValue({
          isAuthenticated: true,
          error: null,
          isReady: true,
        }),
      });

      render(
        <AuthProvider client={mockClient} guardComponent={LoginGuard}>
          <div>Protected Content</div>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeDefined();
      });
      expect(screen.queryByText("Please log in")).toBeNull();
    });
  });

  describe("authentication flow", () => {
    it("should call checkAuthStatus once on mount for non-callback URLs", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: false,
      };
      const mockCheckAuthStatus = vi.fn().mockResolvedValue({
        isAuthenticated: true,
        error: null,
        isReady: true,
      });

      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: mockCheckAuthStatus,
      });

      render(
        <AuthProvider client={mockClient}>
          <div>Content</div>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
      });
    });

    it("should suspend children until callbackPromise resolves when set on client", async () => {
      const mockHandleCallback = vi.fn().mockResolvedValue(undefined);
      // Simulate what createAuthClient does when ?code= is in the URL:
      // kick off handleCallback() and store the promise on the client.
      const callbackPromise = Promise.resolve().then(() => mockHandleCallback());
      const state = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      const mockClient = createMockAuthClient(state, {
        handleCallback: mockHandleCallback,
        callbackPromise,
      });

      await act(async () => {
        render(
          <AuthProvider client={mockClient}>
            <div>Content</div>
          </AuthProvider>,
        );
        await callbackPromise;
      });

      expect(screen.getByText("Content")).toBeDefined();
      expect(mockHandleCallback).toHaveBeenCalled();
    });

    it("should be authenticated when logged in", async () => {
      const state = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: vi.fn().mockResolvedValue({
          isAuthenticated: true,
          error: null,
          isReady: true,
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider client={mockClient}>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("should handle authentication errors", async () => {
      const state = {
        isAuthenticated: false,
        error: "Authentication failed",
        isReady: true,
      };
      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: vi.fn().mockResolvedValue({
          isAuthenticated: false,
          error: "Authentication failed",
          isReady: true,
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider client={mockClient}>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe("Authentication failed");
    });
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth/useAuthSuspense must be used within an AuthProvider");
    });

    it("should provide auth state and methods", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };
      const mockClient = createMockAuthClient(state);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider client={mockClient}>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current).toHaveProperty("isAuthenticated");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("isReady");
      expect(result.current).toHaveProperty("login");
      expect(result.current).toHaveProperty("logout");
      expect(result.current).toHaveProperty("checkAuthStatus");
    });

    it("should call login method", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };
      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const mockClient = createMockAuthClient(state, {
        login: mockLogin,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider client={mockClient}>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      await result.current.login();
      expect(mockLogin).toHaveBeenCalled();
    });

    it("should call logout method", async () => {
      const state = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      const mockClient = createMockAuthClient(state, {
        logout: mockLogout,
        checkAuthStatus: vi.fn().mockResolvedValue({
          isAuthenticated: true,
          error: null,
          isReady: true,
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider client={mockClient}>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await result.current.logout();

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe("useAuthSuspense hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      expect(() => {
        renderHook(() => useAuthSuspense());
      }).toThrow("useAuth/useAuthSuspense must be used within an AuthProvider");
    });

    it("should suspend while not ready", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: false,
      };
      const mockReady = vi.fn().mockResolvedValue(undefined);
      const mockClient = createMockAuthClient(state, {
        ready: mockReady,
      });

      let suspenseTriggered = false;

      const TestComponent = () => {
        try {
          useAuthSuspense();
          return <div>Content Loaded</div>;
        } catch (error) {
          if (error instanceof Promise) {
            suspenseTriggered = true;
            throw error;
          }
          throw error;
        }
      };

      render(
        <AuthProvider client={mockClient}>
          <Suspense fallback={<div>Loading...</div>}>
            <TestComponent />
          </Suspense>
        </AuthProvider>,
      );

      // Initially should show loading
      expect(screen.getByText("Loading...")).toBeDefined();
      expect(suspenseTriggered).toBe(true);
    });

    it("should resolve suspense when auth becomes ready", async () => {
      let authEventListener: ((event: { type: string; data?: unknown }) => void) | undefined;

      const mockAddEventListener = vi.fn(
        (listener: (event: { type: string; data?: unknown }) => void) => {
          authEventListener = listener;
          return () => {};
        },
      );

      // Start with isReady: false
      let currentState = {
        isAuthenticated: false,
        error: null as string | null,
        isReady: false,
      };

      const mockGetState = vi.fn(() => currentState);
      const mockReady = vi.fn().mockResolvedValue(undefined);

      const mockClient = createMockAuthClient(undefined, {
        addEventListener: mockAddEventListener,
        getState: mockGetState,
        ready: mockReady,
      });

      const TestComponent = () => {
        const { isAuthenticated } = useAuthSuspense();
        return <div>Content Loaded: {isAuthenticated ? "authenticated" : "not authenticated"}</div>;
      };

      render(
        <AuthProvider client={mockClient}>
          <Suspense fallback={<div>Loading...</div>}>
            <TestComponent />
          </Suspense>
        </AuthProvider>,
      );

      // Initially should show loading (suspended)
      expect(screen.getByText("Loading...")).toBeDefined();
      expect(screen.queryByText(/Content Loaded/)).toBeNull();

      // Simulate state change to isReady: true
      currentState = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };

      // Trigger auth state change event
      act(() => {
        authEventListener?.({ type: "auth_state_changed", data: {} });
      });

      // Should now show the content
      await waitFor(() => {
        expect(screen.getByText("Content Loaded: authenticated")).toBeDefined();
      });
      expect(screen.queryByText("Loading...")).toBeNull();
    });

    it("should not suspend when auth is ready", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };
      const mockClient = createMockAuthClient(state);

      const TestComponent = () => {
        const { isAuthenticated } = useAuthSuspense();
        return <div>Loaded: {isAuthenticated ? "authenticated" : "unauthenticated"}</div>;
      };

      render(
        <AuthProvider client={mockClient}>
          <Suspense fallback={<div>Suspense Loading...</div>}>
            <TestComponent />
          </Suspense>
        </AuthProvider>,
      );

      // Should show unauthenticated state immediately (not suspended)
      await waitFor(() => {
        expect(screen.getByText("Loaded: unauthenticated")).toBeDefined();
      });
    });
  });

  describe("autoLogin", () => {
    it("should not call login on initial render when autoLogin is enabled and auth is not yet ready", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: false,
      };
      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const mockCheckAuthStatus = vi.fn().mockResolvedValue({
        isAuthenticated: false,
        error: null,
        isReady: true,
      });
      const mockClient = createMockAuthClient(state, {
        login: mockLogin,
        checkAuthStatus: mockCheckAuthStatus,
      });

      render(
        <AuthProvider client={mockClient} autoLogin={true}>
          <div>Content</div>
        </AuthProvider>,
      );

      // login should not be called before the auth check completes
      expect(mockLogin).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockCheckAuthStatus).toHaveBeenCalled();
      });
    });

    it("should login when auth state changes to unauthenticated", async () => {
      let authEventListener: ((event: { type: string; data?: unknown }) => void) | undefined;

      const mockAddEventListener = vi.fn(
        (listener: (event: { type: string; data?: unknown }) => void) => {
          authEventListener = listener;
          return () => {};
        },
      );

      let currentState = {
        isAuthenticated: true,
        error: null as string | null,
        isReady: true,
      };

      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const mockClient = createMockAuthClient(undefined, {
        login: mockLogin,
        addEventListener: mockAddEventListener,
        getState: vi.fn(() => currentState),
      });

      render(
        <AuthProvider client={mockClient} autoLogin={true}>
          <div>Content</div>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });

      currentState = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };

      act(() => {
        authEventListener?.({ type: "auth_state_changed", data: {} });
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });

    it("should not login when autoLogin is false", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };
      const mockLogin = vi.fn();
      const mockClient = createMockAuthClient(state, {
        login: mockLogin,
      });

      render(
        <AuthProvider client={mockClient} autoLogin={false}>
          <div>Content</div>
        </AuthProvider>,
      );

      await waitFor(
        () => {
          expect(mockLogin).not.toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });

    it("should not login when already authenticated", async () => {
      const state = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      const mockLogin = vi.fn();
      const mockClient = createMockAuthClient(state, {
        login: mockLogin,
        checkAuthStatus: vi.fn().mockResolvedValue({
          isAuthenticated: true,
          error: null,
          isReady: true,
        }),
      });

      render(
        <AuthProvider client={mockClient} autoLogin={true}>
          <div>Content</div>
        </AuthProvider>,
      );

      await waitFor(
        () => {
          expect(mockLogin).not.toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });

    it("should not login while the current URL is an OAuth callback", async () => {
      window.history.replaceState({}, "", "/?code=auth-code-123&state=abc");

      let authEventListener: ((event: { type: string; data?: unknown }) => void) | undefined;

      const mockAddEventListener = vi.fn(
        (listener: (event: { type: string; data?: unknown }) => void) => {
          authEventListener = listener;
          return () => {};
        },
      );

      let currentState = {
        isAuthenticated: false,
        error: null as string | null,
        isReady: true,
      };

      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const mockClient = createMockAuthClient(undefined, {
        login: mockLogin,
        addEventListener: mockAddEventListener,
        getState: vi.fn(() => currentState),
      });

      render(
        <AuthProvider client={mockClient} autoLogin={true}>
          <div>Content</div>
        </AuthProvider>,
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockLogin).not.toHaveBeenCalled();

      act(() => {
        currentState = {
          isAuthenticated: false,
          error: null,
          isReady: true,
        };
        authEventListener?.({ type: "auth_state_changed", data: {} });
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe("event listeners", () => {
    it("should listen to auth state changes via useSyncExternalStore", async () => {
      let authEventListener: ((event: { type: string; data?: unknown }) => void) | undefined;

      const mockAddEventListener = vi.fn(
        (listener: (event: { type: string; data?: unknown }) => void) => {
          authEventListener = listener;
          return () => {};
        },
      );

      // Create a mutable state object that getState returns
      let currentState = {
        isAuthenticated: false,
        error: null as string | null,
        isReady: true,
      };

      const mockGetState = vi.fn(() => currentState);

      const mockClient = createMockAuthClient(undefined, {
        addEventListener: mockAddEventListener,
        getState: mockGetState,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider client={mockClient}>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(false);

      // Simulate state change - create a new object reference for the new state
      currentState = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };

      // Trigger auth state change event
      act(() => {
        authEventListener?.({ type: "auth_state_changed", data: {} });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe("checkAuthStatus", () => {
    it("should return AuthState from checkAuthStatus", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };
      const mockClient = createMockAuthClient(state, {
        checkAuthStatus: vi.fn().mockResolvedValue({
          isAuthenticated: true,
          error: null,
          isReady: true,
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider client={mockClient}>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const authState = await result.current.checkAuthStatus();

      expect(authState.isAuthenticated).toBe(true);
      expect(authState.isReady).toBe(true);
      expect(authState.error).toBeNull();
    });
  });
});
