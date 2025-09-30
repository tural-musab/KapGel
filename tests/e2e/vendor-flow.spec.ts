import { test, expect } from "@playwright/test";

test.describe("Vendor menu page", () => {
  test("vendor sees configuration warning when Supabase is missing", async ({ page }) => {
    await page.goto("/vendors/demo-vendor");

    await expect(
      page.getByText(
        "Supabase yapılandırması bulunamadığı için işletme menüsü yüklenemiyor.",
        { exact: true }
      )
    ).toBeVisible();
  });
});
