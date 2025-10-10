import { test, expect } from '@playwright/test';
import { getSupabaseAdminClient } from './utils/supabase';

async function updateOrderStatus(orderId: string, status: string) {
  const admin = getSupabaseAdminClient();

  if (admin) {
    const { error } = await admin
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      throw new Error(`Supabase admin status update failed: ${error.message}`);
    }
    return;
  }

  const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';
  const vendorToken = process.env.TEST_VENDOR_TOKEN;

  if (!vendorToken) {
    throw new Error('Supply TEST_VENDOR_TOKEN or TEST_SUPABASE_SERVICE_KEY to run this test');
  }

  const response = await fetch(`${apiUrl}/api/orders/${orderId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${vendorToken}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update order status via API: ${response.status}`);
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
