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

const loginViaTailor = async (page: Page) => {
  const { email, password } = requireRealAuthCredentials();

  await page.goto("/");
  await page.getByTestId("login-button").click();
  await page.waitForURL(/idp\.erp\.dev\/.*\/signin/);
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in|log in|submit/i }).click();
  await page.waitForURL("http://localhost:3100/**");
};

test.describe("AuthProvider", () => {
  test("shows auth guard when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("auth-guard")).toBeVisible();
    await expect(page.getByTestId("login-button")).toBeVisible();
  });

  test("login redirects to Tailor Platform and back", async ({ page }) => {
    await loginViaTailor(page);

    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("auth-status")).toHaveText("Logged in");
  });

  test("logout returns to auth guard", async ({ page }) => {
    await loginViaTailor(page);

    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("logout-button").click();
    await expect(page.getByTestId("auth-guard")).toBeVisible({ timeout: 10000 });
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
  });

  test("authenticated user can reach AI Gateway with an OpenAI smoke prompt", async ({ page }) => {
    test.skip(!process.env.VITE_TAILOR_AI_GATEWAY_URL, "VITE_TAILOR_AI_GATEWAY_URL must be set");

    await loginViaTailor(page);

    await expect(page.getByTestId("authenticated-content")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("ai-smoke-button").click();
    await expect(page.getByTestId("ai-smoke-response")).toContainText(/pong/i, {
      timeout: 30000,
    });
    await expect(page.getByTestId("ai-smoke-status")).toHaveText("ready");
  });
});
