import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page renders with disabled form when Supabase missing", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Giriş Yap" })).toBeVisible();
    await expect(
      page.getByText("Supabase anahtarları tanımlanmadığı için giriş devre dışı.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Giriş Yap" })).toBeDisabled();
  });

  test("register page renders with disabled form when Supabase missing", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: "Kayıt Ol" })).toBeVisible();
    await expect(
      page.getByText("Supabase anahtarları tanımlanmadığı için kayıt devre dışı.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Kayıt Ol" })).toBeDisabled();
  });
});
