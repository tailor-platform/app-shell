import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, useAuth, useAuthSuspense } from "@tailor-platform/app-shell";
import { createMemoryAuthClient, MemoryAuthProvider } from "@tailor-platform/app-shell/testing";
import { describe, expect, it } from "vitest";

function SignInGuard() {
  const { login } = useAuth();
  return <Button onClick={() => void login()}>Sign in</Button>;
}

function Account() {
  const { logout } = useAuth();
  return <Button onClick={() => void logout()}>Sign out</Button>;
}

function AccountStatus() {
  const { isAuthenticated } = useAuthSuspense();
  return <p>{isAuthenticated ? "Account ready" : "Please sign in"}</p>;
}

// These imports exercise the shipped ESM entry points, not source aliases.
describe("published memory auth helpers", () => {
  it("shares the real auth context across main and testing entry points", async () => {
    const user = userEvent.setup();
    render(
      <MemoryAuthProvider guardComponent={SignInGuard}>
        <Account />
      </MemoryAuthProvider>,
    );
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeDefined();
  });

  it("settles the public Suspense hook through the external client's state setter", async () => {
    const auth = createMemoryAuthClient({
      isReady: false,
      isAuthenticated: false,
      error: null,
    });
    render(
      <MemoryAuthProvider client={auth}>
        <Suspense fallback={<p>Checking session</p>}>
          <AccountStatus />
        </Suspense>
      </MemoryAuthProvider>,
    );
    expect(screen.getByText("Checking session")).toBeDefined();
    await act(async () => {
      auth.setState({ isReady: true, isAuthenticated: true, error: null });
    });
    expect(await screen.findByText("Account ready")).toBeDefined();
    expect(screen.queryByText("Checking session")).toBeNull();
  });
});
