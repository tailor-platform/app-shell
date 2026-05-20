import { test, expect } from "@playwright/test";

/**
 * E2E tests for AuthProvider authentication flow.
 *
 * Prerequisites:
 * 1. Deploy backend to the Tailor Platform workspace:
 *    cd e2e/backend && TAILOR_PLATFORM_WORKSPACE_ID=<id> pnpm deploy
 * 2. Create a test user via the IDP API (see README)
 * 3. Set environment variables in e2e/.env
 */

test.describe("AuthProvider", () => {
  test("shows auth guard when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("auth-guard")).toBeVisible();
    await expect(page.getByTestId("login-button")).toBeVisible();
  });

  test("login redirects to Tailor Platform and back", async ({ page }) => {
    await page.goto("/");

    // Click the login button to initiate OAuth flow
    await page.getByTestId("login-button").click();

    // Should be redirected to Tailor Platform's IDP signin page
    await page.waitForURL(/idp\.erp\.dev\/.*\/signin/);

    // Fill in credentials on the Tailor Platform login page
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");
      return;
    }

    // The login form on erp.dev typically has email/password fields
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in|log in|submit/i }).click();

    // After successful auth, should redirect back to the app
    await page.waitForURL("http://localhost:3100/**");

    // Should now show authenticated content
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("auth-status")).toHaveText("Logged in");
  });

  test("logout returns to auth guard", async ({ page }) => {
    // First, login
    await page.goto("/");
    await page.getByTestId("login-button").click();

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");
      return;
    }

    await page.waitForURL(/idp\.erp\.dev\/.*\/signin/);
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in|log in|submit/i }).click();

    // Wait for authenticated state
    await page.waitForURL("http://localhost:3100/**");
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });

    // Click logout
    await page.getByTestId("logout-button").click();

    // Should return to auth guard
    await expect(page.getByTestId("auth-guard")).toBeVisible({
      timeout: 10000,
    });
  });

  test("OAuth callback does not flash the auth guard or trip React rules of hooks", async ({
    page,
  }) => {
    // Regression for two interacting bugs:
    //  1. AuthGuard used to render guardComponent during a pending OAuth
    //     callback when the auth client surfaced a stale isReady &&
    //     !isAuthenticated state — flashing the sign-in screen the user
    //     just returned from.
    //  2. AuthGuard invoked the slots as plain function calls, which
    //     inlined slot hooks into AuthGuard's own hook scope. Because
    //     the slots render conditionally, any slot that called a hook
    //     (this app's <AuthGuard> calls useAuth) would change AuthGuard's
    //     hook order across renders → "React has detected a change in
    //     the order of Hooks called by AuthGuard".
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/");
    await page.getByTestId("login-button").click();

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");
      return;
    }

    await page.waitForURL(/idp\.erp\.dev\/.*\/signin/);
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in|log in|submit/i }).click();

    await page.waitForURL("http://localhost:3100/**");
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });

    // Callback blackout: after we land back on the app, the sign-in
    // screen must not be in the DOM at all — the AuthProvider should
    // have rendered nothing during the callback exchange and then
    // transitioned directly to authenticated content.
    await expect(page.getByTestId("auth-guard")).toHaveCount(0);

    // Hooks isolation: the slot (AuthGuard, which uses useAuth) was
    // rendered at least once during the unauthenticated state. If the
    // slot were invoked as a plain function call instead of as its own
    // fiber, the transition out of !isAuthenticated would log a hook-
    // order warning here.
    const reactErrors = consoleErrors.filter(
      (e) =>
        e.includes("order of Hooks") ||
        e.includes("Invalid hook call") ||
        e.includes("Rendered fewer hooks") ||
        e.includes("Rendered more hooks"),
    );
    expect(reactErrors, `Unexpected React hook errors:\n${reactErrors.join("\n")}`).toEqual([]);
  });

  test("maintains session on page reload after login", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("login-button").click();

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");
      return;
    }

    await page.waitForURL(/idp\.erp\.dev\/.*\/signin/);
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in|log in|submit/i }).click();

    await page.waitForURL("http://localhost:3100/**");
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });

    // Reload the page
    await page.reload();

    // Should still be authenticated (session persisted)
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("auth-status")).toHaveText("Logged in");
  });

  test("reloading an authenticated session does not flash the auth guard", async ({ page }) => {
    // Regression for the AuthGuard flash on reload: while the initial
    // auth check is in flight (`!isReady`), the guardComponent slot
    // must not render — even for a single frame — when the user has
    // a valid persisted session. We catch a flash by installing a
    // MutationObserver via addInitScript (which runs before any page
    // render), so we observe the very first DOM mutations after
    // reload.
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");
      return;
    }

    // The init script re-runs on every navigation and reload, so the
    // sentinel starts `false` on the reloaded page regardless of what
    // happened on previous navigations.
    await page.addInitScript(() => {
      (window as unknown as { __authGuardEverSeen: boolean }).__authGuardEverSeen = false;
      const check = () => {
        if (document.querySelector("[data-testid='auth-guard']")) {
          (window as unknown as { __authGuardEverSeen: boolean }).__authGuardEverSeen = true;
        }
      };
      const startObserving = () => {
        if (document.body) {
          new MutationObserver(check).observe(document.body, {
            childList: true,
            subtree: true,
          });
          check();
        } else {
          requestAnimationFrame(startObserving);
        }
      };
      startObserving();
    });

    // Log in first to establish a persisted session.
    await page.goto("/");
    await page.getByTestId("login-button").click();
    await page.waitForURL(/idp\.erp\.dev\/.*\/signin/);
    await page.getByLabel(/email/i).fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in|log in|submit/i }).click();
    await page.waitForURL("http://localhost:3100/**");
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });

    // Reload — the init script reinstalls a fresh observer on the new
    // document before any React render, so any moment the auth guard
    // appears (even for one frame) sets the sentinel.
    await page.reload();
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });

    const guardSeenOnReload = await page.evaluate(
      () => (window as unknown as { __authGuardEverSeen: boolean }).__authGuardEverSeen,
    );
    expect(guardSeenOnReload, "auth-guard appeared during reload of authenticated session").toBe(
      false,
    );
  });
});
