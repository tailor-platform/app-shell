import { expect, test, type Page } from "@playwright/test";

/**
 * E2E tests for AuthProvider authentication flow.
 *
 * Prerequisites:
 * 1. Deploy backend to the Tailor Platform workspace:
 *    cd e2e/backend && TAILOR_PLATFORM_WORKSPACE_ID=<id> pnpm deploy
 * 2. Create a test user via the IDP API (see README)
 * 3. Set environment variables in e2e/.env
 */

const requireRealAuthCredentials = () => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  test.skip(!email || !password, "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");

  return { email: email!, password: password! };
};

// Drive the complete real OAuth sign-in round-trip used by the smoke tests.
//
// What this helper does:
// 1. open a real-auth page inside the suite-local AppShell app
// 2. click AppShell's "Sign in" button, which hands control to the Tailor IDP
// 3. wait until the browser is actually on the hosted IDP sign-in page
// 4. fill the credentials from the test environment
// 5. submit the IDP form and wait until the browser lands back on the local app
//
// The helper intentionally stops there. Each test then asserts the post-login
// behavior it cares about (authenticated content, logout, reload persistence,
// AI smoke, etc.) instead of hiding those expectations inside the login step.
const loginViaTailor = async (page: Page) => {
  const { email, password } = requireRealAuthCredentials();

  await page.goto("/auth");
  await page.getByTestId("login-button").click();
  await page.waitForURL(/idp\.erp\.dev\/.*\/signin/);
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in|log in|submit/i }).click();
  await page.waitForURL(/http:\/\/localhost:3100\/auth$/);
};

test.describe("AuthProvider", () => {
  test.skip(
    !process.env.VITE_TAILOR_APP_URL || !process.env.VITE_TAILOR_CLIENT_ID,
    "VITE_TAILOR_APP_URL and VITE_TAILOR_CLIENT_ID must be set",
  );

  test("shows auth guard when not authenticated", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByTestId("auth-guard")).toBeVisible();
    await expect(page.getByTestId("login-button")).toBeVisible();
  });

  test("login redirects to Tailor Platform and back", async ({ page }) => {
    await loginViaTailor(page);

    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("auth-status")).toHaveText("Logged in");
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("logout returns to auth guard", async ({ page }) => {
    await loginViaTailor(page);

    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("logout-button").click();
    await expect(page.getByTestId("auth-guard")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("maintains session on page reload after login", async ({ page }) => {
    await loginViaTailor(page);

    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await page.reload();
    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("auth-status")).toHaveText("Logged in");
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("authenticated user can reach AI Gateway with an OpenAI smoke prompt", async ({ page }) => {
    test.skip(!process.env.VITE_TAILOR_AI_GATEWAY_URL, "VITE_TAILOR_AI_GATEWAY_URL must be set");

    await loginViaTailor(page);

    await page.goto("/ai");
    await expect(page.getByTestId("ai-page")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/\/ai$/);
    await page.getByTestId("ai-smoke-button").click();
    await expect(page.getByTestId("ai-smoke-response")).toContainText(/pong/i, {
      timeout: 30000,
    });
    await expect(page.getByTestId("ai-smoke-status")).toHaveText("ready");
  });
});
