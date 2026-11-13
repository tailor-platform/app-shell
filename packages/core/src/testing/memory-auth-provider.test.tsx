import { StrictMode, Suspense } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell, createMemoryAuthClient, MemoryAuthProvider } from "@/testing";
import {
  Button,
  defineModule,
  defineResource,
  SidebarLayout,
  useAuth,
  useAuthSuspense,
  useParams,
  type AuthState,
} from "@/index";

const signedOut: AuthState = { isReady: true, isAuthenticated: false, error: null };
const signedIn: AuthState = { isReady: true, isAuthenticated: true, error: null };
const loading: AuthState = { isReady: false, isAuthenticated: false, error: null };

function AuthStatus() {
  const { isReady, isAuthenticated, error, login, logout } = useAuth();
  let status = isAuthenticated ? "Signed in" : "Signed out";
  if (!isReady) status = "Checking session";
  return (
    <>
      <p>{status}</p>
      {error && <p>{error}</p>}
      <Button onClick={() => void login()}>Sign in</Button>
      <Button onClick={() => void logout()}>Sign out</Button>
    </>
  );
}

function SignInGuard() {
  const { isReady, error, login } = useAuth();
  if (!isReady) return <p>Checking session</p>;
  return (
    <>
      <p>{error ?? "Please sign in"}</p>
      <Button onClick={() => void login()}>Sign in</Button>
    </>
  );
}

function SuspenseStatus() {
  const { isAuthenticated } = useAuthSuspense();
  return <p>{isAuthenticated ? "Signed in" : "Signed out"}</p>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MemoryAuthProvider", () => {
  it("defaults to ready and signed out without hiding unguarded children", () => {
    render(
      <MemoryAuthProvider>
        <AuthStatus />
      </MemoryAuthProvider>,
    );
    expect(screen.getByText("Signed out")).toBeDefined();
    expect(screen.queryByText("Checking session")).toBeNull();
  });

  it("uses the real guard and supports local sign-in and sign-out through public hooks", async () => {
    const user = userEvent.setup();
    render(
      <MemoryAuthProvider guardComponent={SignInGuard}>
        <AuthStatus />
      </MemoryAuthProvider>,
    );
    expect(screen.getByText("Please sign in")).toBeDefined();
    expect(screen.queryByText("Signed in")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(screen.queryByText("Please sign in")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Please sign in")).toBeDefined();
    expect(screen.queryByText("Signed in")).toBeNull();
  });

  it("preserves owned state across StrictMode and changes to initialState on rerender", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <StrictMode>
        <MemoryAuthProvider initialState={signedOut}>
          <AuthStatus />
        </MemoryAuthProvider>
      </StrictMode>,
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Signed in")).toBeDefined();

    rerender(
      <StrictMode>
        <MemoryAuthProvider initialState={{ ...signedOut, error: "Ignored initial state" }}>
          <AuthStatus />
        </MemoryAuthProvider>
      </StrictMode>,
    );
    expect(screen.getByText("Signed in")).toBeDefined();
    expect(screen.queryByText("Ignored initial state")).toBeNull();
  });

  it("isolates provider-owned clients", async () => {
    const user = userEvent.setup();
    render(
      <>
        <MemoryAuthProvider>
          <AuthStatus />
        </MemoryAuthProvider>
        <MemoryAuthProvider initialState={signedIn}>
          <SuspenseStatus />
        </MemoryAuthProvider>
      </>,
    );
    expect(screen.getByText("Signed out")).toBeDefined();
    expect(screen.getByText("Signed in")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findAllByText("Signed in")).toHaveLength(2);
  });

  it("keeps initialization loading until an external client publishes readiness", async () => {
    const auth = createMemoryAuthClient(loading);
    const check = vi.spyOn(auth, "checkAuthStatus");
    render(
      <MemoryAuthProvider client={auth} guardComponent={SignInGuard}>
        <AuthStatus />
      </MemoryAuthProvider>,
    );
    await waitFor(() => expect(check).toHaveBeenCalled());
    expect(screen.getByText("Checking session")).toBeDefined();
    expect(auth.getState()).toEqual(loading);

    await act(async () => {
      auth.setState({ ...signedOut, error: "Session unavailable" });
    });
    expect(await screen.findByText("Session unavailable")).toBeDefined();

    await act(async () => {
      auth.setState(signedIn);
    });
    expect(await screen.findByText("Signed in")).toBeDefined();
  });

  it("keeps the real Suspense fallback pending until readiness and handles another loading episode", async () => {
    const auth = createMemoryAuthClient(loading);
    render(
      <MemoryAuthProvider client={auth}>
        <Suspense fallback={<p>Checking session</p>}>
          <SuspenseStatus />
        </Suspense>
      </MemoryAuthProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Checking session")).toBeDefined();
    expect(screen.queryByText("Signed in")).toBeNull();

    await act(async () => {
      auth.setState(signedIn);
    });
    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(screen.queryByText("Checking session")).toBeNull();

    await act(async () => {
      auth.setState(loading);
    });
    expect(screen.getByText("Checking session")).toBeDefined();

    await act(async () => {
      auth.setState(signedOut);
    });
    expect(await screen.findByText("Signed out")).toBeDefined();
    expect(screen.queryByText("Checking session")).toBeNull();
  });

  it("removes only its subscriptions and preserves other consumers of an external client", async () => {
    const auth = createMemoryAuthClient();
    const applicationListener = vi.fn();
    const removeApplication = auth.addEventListener(applicationListener);
    const unsubscribe = vi.fn();
    const add = auth.addEventListener.bind(auth);
    vi.spyOn(auth, "addEventListener").mockImplementation((listener) => {
      const remove = add(listener);
      return () => {
        unsubscribe();
        remove();
      };
    });
    const first = render(
      <MemoryAuthProvider client={auth}>
        <AuthStatus />
      </MemoryAuthProvider>,
    );
    render(
      <MemoryAuthProvider client={auth}>
        <SuspenseStatus />
      </MemoryAuthProvider>,
    );
    first.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();

    await act(async () => {
      auth.setState(signedIn);
    });
    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(applicationListener).toHaveBeenCalledOnce();
    removeApplication();
  });

  it("resubscribes when an external client is replaced", async () => {
    const first = createMemoryAuthClient(signedOut);
    const second = createMemoryAuthClient(signedIn);
    const { rerender } = render(
      <MemoryAuthProvider client={first}>
        <AuthStatus />
      </MemoryAuthProvider>,
    );
    expect(screen.getByText("Signed out")).toBeDefined();
    rerender(
      <MemoryAuthProvider client={second}>
        <AuthStatus />
      </MemoryAuthProvider>,
    );
    expect(screen.getByText("Signed in")).toBeDefined();
    await act(async () => {
      first.setState({ ...signedOut, error: "Detached client" });
    });
    expect(screen.queryByText("Detached client")).toBeNull();
  });

  it("preserves the real auto-login policy, including signing in again after logout", async () => {
    const user = userEvent.setup();
    const auth = createMemoryAuthClient();
    const login = vi.spyOn(auth, "login");
    render(
      <MemoryAuthProvider client={auth} autoLogin>
        <AuthStatus />
      </MemoryAuthProvider>,
    );
    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(login).toHaveBeenCalled();
    login.mockClear();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(login).toHaveBeenCalled();
  });

  it("can inspect login arguments and simulate a failed client boundary", async () => {
    const auth = createMemoryAuthClient();
    const failed = vi.spyOn(auth, "login").mockRejectedValue(new Error("Sign-in failed"));
    function LoginAction() {
      const { login } = useAuth();
      return (
        <Button onClick={() => void login({ returnTo: "/orders" }).catch(() => {})}>Sign in</Button>
      );
    }
    const user = userEvent.setup();
    render(
      <MemoryAuthProvider client={auth}>
        <LoginAction />
      </MemoryAuthProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(failed).toHaveBeenCalledWith({ returnTo: "/orders" });
    expect(auth.getState()).toEqual(signedOut);
  });

  it("composes authentication with the test AppShell's routed pages without changing the URL", async () => {
    const before = window.location.href;
    const modules = [
      defineModule({
        path: "orders",
        meta: { title: "Orders", icon: <span /> },
        resources: [
          defineResource({
            path: ":id",
            component: () => <h1>Order {useParams().id}</h1>,
          }),
        ],
      }),
    ];
    const user = userEvent.setup();
    render(
      <MemoryAuthProvider guardComponent={SignInGuard}>
        <AppShell memory initialEntries={["/orders/A42"]} modules={modules}>
          <SidebarLayout />
        </AppShell>
      </MemoryAuthProvider>,
    );
    expect(screen.queryByRole("heading", { name: "Order A42" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Order A42" })).toBeDefined();
    expect(window.location.href).toBe(before);
  });

  it("rejects client and initialState together for untyped callers", () => {
    const props = { client: createMemoryAuthClient(), initialState: signedIn };
    expect(() => {
      // @ts-expect-error The fixture also exercises rejection for JavaScript callers.
      render(<MemoryAuthProvider {...props} />);
    }).toThrow("MemoryAuthProvider accepts either client or initialState, not both.");
  });
});
