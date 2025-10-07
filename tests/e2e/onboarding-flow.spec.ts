import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:3001'; // Updated port

function cookie(name: string, value: string) {
  return {
    name,
    value,
    url: baseURL,
    path: '/',
  } as const;
}

test.describe('Onboarding-aware header', () => {
  test('pending kullanıcı rolü için "Rolünü Tamamla" CTA’sı çıkar', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([
      cookie('x-mock-role', 'vendor_admin_pending'),
      cookie('x-mock-email', 'pending@test.dev'),
    ]);

    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Rolünü Tamamla' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Çıkış' })).toHaveCount(0);
  });

  test('vendor admin rolü için panel linki ve çıkış butonu görünür', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([
      cookie('x-mock-role', 'vendor_admin'),
      cookie('x-mock-email', 'vendor@test.dev'),
    ]);

    await page.goto('/');

    const panelLink = page.getByRole('link', { name: 'İşletme Paneli' });
    await expect(panelLink).toBeVisible();
    await expect(page.getByRole('button', { name: 'Çıkış' })).toBeVisible();

    await panelLink.click();
    await expect(page).toHaveURL(/\/vendor/);
  });
});
