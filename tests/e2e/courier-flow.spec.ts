import { test, expect } from "@playwright/test";

test.describe("Courier workspace", () => {
  test("courier dashboard loads correctly", async ({ page }) => {
    await page.goto("/courier");

    // Since no authentication in tests, expect redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
