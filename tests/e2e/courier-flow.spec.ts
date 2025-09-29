import { test, expect } from "@playwright/test";
test("courier can manage deliveries", async ({ page }) => {
  await page.goto("http://localhost:3000/courier");
  expect(true).toBe(false); // intentionally failing until implement
});
