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
    await expect(response.json()).resolves.toEqual({
      order: {
        id: 'order-1',
        status: 'pending',
        customerId: undefined,
        branchId: undefined,
        courierId: undefined,
        paymentMethod: undefined,
        itemsTotal: 0,
        deliveryFee: 0,
        total: 0,
        createdAt: undefined,
      },
      items: [],
    });

    expect(rpcMock).toHaveBeenCalledWith('create_order_with_items', {
      order_input: expectedOrderInput,
      items_input: expectedItemsInput,
    });
  });

  it('returns the payload from Supabase with the newly created order and items', async () => {
    const supabasePayload = {
      order: {
        id: 'order-1',
        customer_id: 'user-1',
        branch_id: 'branch-1',
        courier_id: null,
        status: 'PREPARING',
        payment_method: 'cash',
        items_total: 20,
        delivery_fee: 0,
        total: 20,
        created_at: '2025-01-01T10:00:00Z',
      },
      items: [
        {
          id: 'order-item-1',
          product_id: 'item-1',
          name_snapshot: 'Item 1',
          unit_price: 10,
          qty: 2,
          total: 20,
        },
      ],
    };

    rpcMock.mockResolvedValue({ data: supabasePayload, error: null });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      order: {
        id: 'order-1',
        status: 'preparing',
        customerId: 'user-1',
        branchId: 'branch-1',
        courierId: null,
        paymentMethod: 'cash',
        itemsTotal: 20,
        deliveryFee: 0,
        total: 20,
        createdAt: '2025-01-01T10:00:00Z',
      },
      items: [
        {
          id: 'order-item-1',
          productId: 'item-1',
          name: 'Item 1',
          qty: 2,
          unitPrice: 10,
          total: 20,
        },
      ],
    });
  });

  it('rejects empty item list with 400', async () => {
    const response = await POST(
      buildRequest({
        ...basePayload,
        items: [],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('En az bir ürün seçmelisiniz');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns 500 when RPC fails and surfaces an error message', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'transaction failed' },
    });

    const response = await POST(buildRequest(basePayload));

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe('transaction failed');
  });

  it('rejects requests when payload customerId mismatches the authenticated user', async () => {
    const response = await POST(
      buildRequest({
        ...basePayload,
        customerId: 'someone-else',
      })
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe('Customer ID mismatch');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects requests attempting to assign a courier directly', async () => {
    const response = await POST(
      buildRequest({
        ...basePayload,
        courierId: 'courier-1',
      })
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe('Customers cannot assign courier');
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
