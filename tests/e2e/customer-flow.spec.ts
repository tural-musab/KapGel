import { test, expect } from "@playwright/test";
test("customer can place pickup order", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  expect(true).toBe(false); // intentionally failing until implement
});
