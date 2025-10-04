import { test, expect } from "@playwright/test";

test.describe("Customer checkout experience", () => {
  test("customer can review the cart, submit the form, and reach tracking page", async ({ page }) => {
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
    await expect(page.getByRole("button", { name: "Siparişi Tamamla" })).toBeDisabled();

    await page.evaluate(() => {
      const store = (window as unknown as {
        __cartStore?: {
          getState: () => { addItem: (item: { id: string; name: string; price: number }) => void };
        };
      }).__cartStore;
      if (!store) {
        throw new Error('Cart store is not available on window');
      }
      store.getState().addItem({ id: 'item-1', name: 'Test Ürün', price: 75 });
    });

    await expect(page.getByText("Test Ürün")).toBeVisible();

    await page.getByLabel('Şube').selectOption('fallback-branch-1');
    await page.getByLabel("Adres").fill("Test Mah. 123 Sk. No:5");

    await expect(page.getByRole("button", { name: "Siparişi Tamamla" })).toBeEnabled();

    await page.route("**/api/orders", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "order-123" }),
      });
    });

    await page.getByRole("button", { name: "Siparişi Tamamla" }).click();

    await page.waitForURL("**/orders/order-123");
    await expect(page.getByRole("heading", { name: "Sipariş Takibi" })).toBeVisible();

    await expect(
      page.getByText(
        "Supabase yapılandırması bulunamadığı için sipariş bilgilerine ulaşılamıyor.",
        { exact: true }
      )
    ).toBeVisible();
  });
});
