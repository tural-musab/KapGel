import { test, expect } from "@playwright/test";
test("vendor can manage orders", async ({ page }) => {
  await page.goto("http://localhost:3000/vendor");
  expect(true).toBe(false); // intentionally failing until implement
});
