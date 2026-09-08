import { expect, test } from "@playwright/test";

test.describe("nextjs smoke", () => {
  test("opens the orders resource from a direct URL", async ({ page }) => {
    await page.goto("/dashboard/sales/orders");

    await expect(page.getByTestId("nextjs-page-orders")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/sales\/orders$/);
  });

  test("keeps a dynamic sub-resource deep link on reload", async ({ page }) => {
    await page.goto("/dashboard/sales/orders/123");

    await expect(page.getByTestId("nextjs-page-order-detail")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/sales\/orders\/123$/);

    await page.reload();

    await expect(page.getByTestId("nextjs-page-order-detail")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/sales\/orders\/123$/);
  });

  test("navigates between list and detail inside the mounted AppShell", async ({ page }) => {
    await page.goto("/dashboard/sales/orders");

    await page.getByTestId("nextjs-order-link").click();
    await expect(page.getByTestId("nextjs-page-order-detail")).toBeVisible();

    await page.getByTestId("nextjs-back-link").click();
    await expect(page.getByTestId("nextjs-page-orders")).toBeVisible();
  });

  test("applies redirect guards inside the Next.js mount", async ({ page }) => {
    await page.goto("/dashboard/legacy");

    await expect(page.getByTestId("nextjs-page-orders")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/sales\/orders$/);
  });
});
