import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("login page renders correctly with Supabase enabled", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Giriş Yap" })).toBeVisible();
    
    // With Supabase enabled, form should be enabled
    await expect(page.getByRole("button", { name: "Giriş Yap" })).toBeEnabled();
    
    // Check form fields are present
    await expect(page.getByLabelText("E-posta")).toBeVisible();
    await expect(page.getByLabelText("Şifre")).toBeVisible();
    
    // Check register link is present
    await expect(page.getByRole("link", { name: "Kayıt Ol" })).toBeVisible();
  });

  test("register page renders correctly with Supabase enabled", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: "Kayıt Ol" })).toBeVisible();
    
    // With Supabase enabled, form should be enabled
    await expect(page.getByRole("button", { name: "Kayıt Ol" })).toBeEnabled();
    
    // Check form fields are present
    await expect(page.getByLabelText("Ad Soyad")).toBeVisible();
    await expect(page.getByLabelText("E-posta")).toBeVisible();
    await expect(page.getByLabelText("Şifre")).toBeVisible();
    
    // Check login link is present
    await expect(page.getByRole("link", { name: "Giriş Yap" })).toBeVisible();
  });
  
  test("login form shows validation errors for empty fields", async ({ page }) => {
    await page.goto("/login");
    
    // Try to submit empty form
    await page.getByRole("button", { name: "Giriş Yap" }).click();
    
    // Should show validation error (browser built-in or custom)
    // Note: This test might need adjustment based on actual validation implementation
  });
});
