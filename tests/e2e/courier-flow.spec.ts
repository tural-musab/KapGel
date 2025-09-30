import { test, expect } from "@playwright/test";

test.describe("Courier workspace", () => {
  test("courier dashboard route is not yet implemented", async ({ page }) => {
    await page.goto("/courier");

    await expect(
      page.getByText("This page could not be found.", { exact: true })
    ).toBeVisible();
  });
});
