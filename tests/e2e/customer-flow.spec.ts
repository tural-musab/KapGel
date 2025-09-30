import { test, expect } from "@playwright/test";

test.describe("Customer checkout experience", () => {
  test("customer can review the cart and place a pickup order", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Kapgel" })).toBeVisible();
    await expect(page.getByText("Gönder Gelsin")).toBeVisible();

    await expect(
      page.getByText(
        "Supabase yapılandırması bulunamadığı için canlı veriler gösterilemiyor.",
        { exact: true }
      )
    ).toBeVisible();

    await page.goto("/checkout");

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("Sepetiniz boş.")).toBeVisible();

    await page.getByLabel("Adres").fill("Test Mah. 123 Sk. No:5");

    let dialogMessage = "";
    page.once("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await page.getByRole("button", { name: "Siparişi Tamamla" }).click();

    await expect
      .poll(() => dialogMessage, { timeout: 2_000 })
      .not.toBe("");
    await expect.soft(dialogMessage).toContain("Siparişiniz alındı!");

    await expect(page.getByText("Sepetiniz boş.")).toBeVisible();
  });
});
