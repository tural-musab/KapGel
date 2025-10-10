import { test, expect } from '@playwright/test';

async function updateOrderStatus(orderId: string, status: string) {
  const response = await fetch(`${process.env.TEST_API_URL || 'http://localhost:3000'}/api/orders/${orderId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.TEST_VENDOR_TOKEN ?? ''}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update order status: ${response.status}`);
  }
}

test.describe('Realtime order updates', () => {
  test('customer sees status change in realtime', async ({ page }) => {
    const testOrderId = process.env.TEST_ORDER_ID;
    if (!testOrderId) {
      test.skip(true, 'TEST_ORDER_ID not configured');
    }

    await page.goto(`/orders/${testOrderId}`);

    await expect(page.getByText('Realtime')).toBeVisible({ timeout: 5000 });

    await updateOrderStatus(testOrderId!, 'CONFIRMED');

    await expect(page.getByText('Onaylandı')).toBeVisible({ timeout: 5000 });
  });
});
