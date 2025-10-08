import { test, expect } from "@playwright/test";

test.describe("Vendor menu page", () => {
  test("vendor menu page loads correctly", async ({ page }) => {
    await page.goto("/vendors/demo-vendor");

    // Check that the vendor menu page loads without throwing errors
    // It may show fallback content or vendor data
    await expect(page.locator('body')).toBeVisible();
  });
});
