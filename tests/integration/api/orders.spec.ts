import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/orders/route';

const rpcMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('lib/supabase/server', () => ({
  createClient: createClientMock,
}));

const buildRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const basePayload = {
  items: [
    {
      id: 'item-1',
      name: 'Item 1',
      price: 10,
      quantity: 2,
    },
  ],
  branchId: 'branch-1',
  addressText: 'Test address',
  paymentMethod: 'cash',
};

const expectedOrderInput = {
  customer_id: 'user-1',
  branch_id: basePayload.branchId,
  address_text: basePayload.addressText,
  payment_method: basePayload.paymentMethod,
  items_total: 20,
  total: 20,
  type: 'delivery',
};

const expectedItemsInput = [
  {
    product_id: 'item-1',
    name_snapshot: 'Item 1',
    unit_price: 10,
    qty: 2,
    total: 20,
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  getUserMock.mockResolvedValue({
    data: {
      user: { id: 'user-1' },
    },
    error: null,
  });

  createClientMock.mockReturnValue({
    auth: { getUser: getUserMock },
    rpc: rpcMock,
  });
});

describe('POST /api/orders', () => {
  it('creates an order and related items atomically via RPC', async () => {
    const orderResponse = { id: 'order-1' };

    rpcMock.mockResolvedValue({ data: orderResponse, error: null });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(orderResponse);

    expect(rpcMock).toHaveBeenCalledWith('create_order_with_items', {
      order_input: expectedOrderInput,
      items_input: expectedItemsInput,
    });
  });

  it('returns 500 when RPC fails and surfaces an error message', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'transaction failed' },
    });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe('Failed to create order');
  });
});
