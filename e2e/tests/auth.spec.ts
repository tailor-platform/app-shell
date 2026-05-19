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
});
