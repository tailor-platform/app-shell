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
  useAuthSuspense,
  buildCleanOAuthCallbackUrl,
  type EnhancedAuthClient,
} from "./auth-context";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

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

    return {
      getState: vi.fn(() => state),
      login: vi.fn(),
      logout: vi.fn(),
      getAuthUrl: vi.fn(),
      handleCallback: vi.fn(),
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
      getAppUri: vi.fn(() => "https://api.test.com"),
      getAuthHeadersForQuery: vi.fn(),
      ...overrides,
    } as EnhancedAuthClient;
  };

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
      const GuardComponent = () => <div>Loading...</div>;

      render(
        <AuthProvider client={mockClient} guardComponent={GuardComponent}>
          <div>Protected Content</div>
        </AuthProvider>,
      );

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
      const GuardComponent = () => <div>Please log in</div>;

      render(
        <AuthProvider client={mockClient} guardComponent={GuardComponent}>
          <div>Protected Content</div>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Please log in")).toBeDefined();
      });
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
      const GuardComponent = () => <div>Please log in</div>;

      render(
        <AuthProvider client={mockClient} guardComponent={GuardComponent}>
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
    it("should check auth status on mount", async () => {
      const state = {
        isAuthenticated: true,
        error: null,
        isReady: true,
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
        expect(mockCheckAuthStatus).toHaveBeenCalled();
      });
    });

    it("should handle OAuth callback on mount when code is present", async () => {
      const state = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      const mockHandleCallback = vi.fn().mockResolvedValue(undefined);
      const mockCheckAuthStatus = vi.fn().mockResolvedValue({
        isAuthenticated: true,
        error: null,
        isReady: true,
      });

      const mockClient = createMockAuthClient(state, {
        handleCallback: mockHandleCallback,
        checkAuthStatus: mockCheckAuthStatus,
      });

      // Mock URL with code parameter
      vi.stubGlobal("location", {
        ...window.location,
        href: "http://localhost/?code=auth-code-123",
        search: "?code=auth-code-123",
        pathname: "/",
        hash: "",
      });

      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

      render(
        <AuthProvider client={mockClient}>
          <div>Content</div>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockHandleCallback).toHaveBeenCalled();
        expect(replaceStateSpy).toHaveBeenCalled();
      });

      replaceStateSpy.mockRestore();
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
        wrapper: ({ children }) => (
          <AuthProvider client={mockClient}>{children}</AuthProvider>
        ),
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
        wrapper: ({ children }) => (
          <AuthProvider client={mockClient}>{children}</AuthProvider>
        ),
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
        wrapper: ({ children }) => (
          <AuthProvider client={mockClient}>{children}</AuthProvider>
        ),
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
        wrapper: ({ children }) => (
          <AuthProvider client={mockClient}>{children}</AuthProvider>
        ),
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
        wrapper: ({ children }) => (
          <AuthProvider client={mockClient}>{children}</AuthProvider>
        ),
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
      let authEventListener:
        | ((event: { type: string; data?: unknown }) => void)
        | undefined;

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
        return (
          <div>
            Content Loaded:{" "}
            {isAuthenticated ? "authenticated" : "not authenticated"}
          </div>
        );
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
        return (
          <div>
            Loaded: {isAuthenticated ? "authenticated" : "unauthenticated"}
          </div>
        );
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
    it("should automatically login when autoLogin is true and user is not authenticated", async () => {
      const state = {
        isAuthenticated: false,
        error: null,
        isReady: true,
      };
      const mockLogin = vi.fn().mockResolvedValue(undefined);
      const mockClient = createMockAuthClient(state, {
        login: mockLogin,
      });

      render(
        <AuthProvider client={mockClient} autoLogin={true}>
          <div>Content</div>
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
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
  });

  describe("event listeners", () => {
    it("should listen to auth state changes via useSyncExternalStore", async () => {
      let authEventListener:
        | ((event: { type: string; data?: unknown }) => void)
        | undefined;

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
        wrapper: ({ children }) => (
          <AuthProvider client={mockClient}>{children}</AuthProvider>
        ),
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
        wrapper: ({ children }) => (
          <AuthProvider client={mockClient}>{children}</AuthProvider>
        ),
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

describe("buildCleanOAuthCallbackUrl", () => {
  it("removes code parameter", () => {
    const url = new URL("https://example.com/dashboard?code=abc123");
    expect(buildCleanOAuthCallbackUrl(url)).toBe("/dashboard");
  });

  it("removes state parameter", () => {
    const url = new URL("https://example.com/dashboard?state=xyz789");
    expect(buildCleanOAuthCallbackUrl(url)).toBe("/dashboard");
  });

  it("removes both code and state parameters", () => {
    const url = new URL(
      "https://example.com/dashboard?code=abc123&state=xyz789",
    );
    expect(buildCleanOAuthCallbackUrl(url)).toBe("/dashboard");
  });

  it("preserves other query parameters", () => {
    const url = new URL(
      "https://example.com/dashboard?code=abc123&tab=settings&view=list",
    );
    expect(buildCleanOAuthCallbackUrl(url)).toBe(
      "/dashboard?tab=settings&view=list",
    );
  });

  it("preserves hash fragments", () => {
    const url = new URL("https://example.com/dashboard?code=abc123#section1");
    expect(buildCleanOAuthCallbackUrl(url)).toBe("/dashboard#section1");
  });

  it("preserves both query parameters and hash fragments", () => {
    const url = new URL(
      "https://example.com/dashboard?code=abc123&state=xyz&tab=settings#section1",
    );
    expect(buildCleanOAuthCallbackUrl(url)).toBe(
      "/dashboard?tab=settings#section1",
    );
  });

  it("handles URL with no query parameters", () => {
    const url = new URL("https://example.com/dashboard");
    expect(buildCleanOAuthCallbackUrl(url)).toBe("/dashboard");
  });

  it("handles URL with only hash fragment", () => {
    const url = new URL("https://example.com/dashboard#section1");
    expect(buildCleanOAuthCallbackUrl(url)).toBe("/dashboard#section1");
  });

  it("handles nested paths", () => {
    const url = new URL(
      "https://example.com/app/users/123?code=abc&filter=active",
    );
    expect(buildCleanOAuthCallbackUrl(url)).toBe(
      "/app/users/123?filter=active",
    );
  });

  it("handles root path", () => {
    const url = new URL("https://example.com/?code=abc123");
    expect(buildCleanOAuthCallbackUrl(url)).toBe("/");
  });
});
