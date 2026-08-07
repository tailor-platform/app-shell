import { expect, test, type Page } from "@playwright/test";

const loginAt = async (page: Page, path: string) => {
  await page.goto(path);
  await expect(page.getByTestId("local-auth-guard")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.getByTestId("local-login-button").click();
};

test.describe("local auth routing smoke", () => {
  test("keeps a protected deep link after login", async ({ page }) => {
    await loginAt(page, "/local-auth/dashboard/orders");

    await expect(page.getByTestId("local-page-orders")).toBeVisible();
    await expect(page.getByTestId("local-auth-status")).toHaveText("Logged in");
    await expect(page).toHaveURL(/\/local-auth\/dashboard\/orders$/);
  });

  test("covers both Link navigation and useNavigate navigation", async ({ page }) => {
    await loginAt(page, "/local-auth/dashboard/orders");

    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByTestId("local-page-reports")).toBeVisible();
    await expect(page).toHaveURL(/\/local-auth\/dashboard\/reports$/);

    await page.getByTestId("local-go-orders").click();
    await expect(page.getByTestId("local-page-orders")).toBeVisible();
    await expect(page).toHaveURL(/\/local-auth\/dashboard\/orders$/);
  });

  test("applies route-level redirects after auth resolves", async ({ page }) => {
    await loginAt(page, "/local-auth/legacy");

    await expect(page.getByTestId("local-page-reports")).toBeVisible();
    await expect(page).toHaveURL(/\/local-auth\/dashboard\/reports$/);
  });

  test("keeps the authenticated nested route on reload", async ({ page }) => {
    await loginAt(page, "/local-auth/dashboard/orders");

    await page.getByTestId("local-go-reports").click();
    await expect(page.getByTestId("local-page-reports")).toBeVisible();

    await page.reload();

    await expect(page.getByTestId("local-page-reports")).toBeVisible();
    await expect(page.getByTestId("local-auth-status")).toHaveText("Logged in");
    await expect(page).toHaveURL(/\/local-auth\/dashboard\/reports$/);
  });

  test("returns to the auth guard on logout from a nested route", async ({ page }) => {
    await loginAt(page, "/local-auth/dashboard/reports");

    await expect(page.getByTestId("local-page-reports")).toBeVisible();
    await page.getByTestId("local-logout-button").click();

    await expect(page.getByTestId("local-auth-guard")).toBeVisible();
    await expect(page).toHaveURL(/\/local-auth\/dashboard\/reports$/);
  });
});
