import { createClient } from 'lib/supabase/server';
import { logEvent } from 'lib/logging';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const orderItemSchema = z.object({
  id: z.string().min(1, 'Ürün kimliği zorunludur'),
  name: z.string().min(1, 'Ürün adı zorunludur'),
  price: z.number().nonnegative('Ürün fiyatı negatif olamaz'),
  quantity: z.number().int().positive('Adet 1 veya daha büyük olmalıdır'),
});

const orderPayloadSchema = z.object({
  branchId: z.string().min(1, 'Şube kimliği zorunludur'),
  addressText: z.string().min(5, 'Adres en az 5 karakter olmalıdır'),
  paymentMethod: z.enum(['cash', 'pickup_card'] as const),
  items: z.array(orderItemSchema).min(1, 'En az bir ürün seçmelisiniz'),
  customerId: z.string().optional(),
  courierId: z.string().optional(),
});

type RawOrder = {
  id: string;
  customer_id: string | null;
  branch_id: string | null;
  courier_id: string | null;
  status: string | null;
  payment_method: string | null;
  items_total: number | string | null;
  delivery_fee: number | string | null;
  total: number | string | null;
  created_at: string | null;
};

type RawOrderItem = {
  id: string;
  product_id: string | null;
  name_snapshot: string | null;
  unit_price: number | string | null;
  qty: number | null;
  total: number | string | null;
};

const statusMap: Record<string, string> = {
  NEW: 'pending',
  CONFIRMED: 'pending',
  PREPARING: 'preparing',
  PICKED_UP: 'ready',
  ON_ROUTE: 'en_route',
  DELIVERED: 'delivered',
  REJECTED: 'cancelled',
  CANCELED_BY_USER: 'cancelled',
  CANCELED_BY_VENDOR: 'cancelled',
};

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function normalizeOrder(raw: RawOrder | null | undefined) {
  if (!raw) return null;
  const status = statusMap[raw.status ?? 'NEW'] ?? 'pending';

  return {
    id: raw.id,
    status,
    customerId: raw.customer_id,
    branchId: raw.branch_id,
    courierId: raw.courier_id,
    paymentMethod: raw.payment_method,
    itemsTotal: toNumber(raw.items_total),
    deliveryFee: toNumber(raw.delivery_fee),
    total: toNumber(raw.total),
    createdAt: raw.created_at,
  };
}

function normalizeOrderItems(items: RawOrderItem[] | null | undefined) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    id: item.id,
    productId: item.product_id,
    name: item.name_snapshot,
    qty: item.qty ?? 0,
    unitPrice: toNumber(item.unit_price),
    total: toNumber(item.total),
  }));
}

export async function POST(request: Request) {
  const supabase = createClient();

  if (!supabase) {
    return new NextResponse('Supabase is not configured', { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const parseResult = orderPayloadSchema.safeParse(await request.json());

  if (!parseResult.success) {
    const message = parseResult.error.issues[0]?.message ?? 'Invalid payload';
    return new NextResponse(message, { status: 400 });
  }

  const { items, branchId, addressText, paymentMethod, customerId, courierId } = parseResult.data;

  if (customerId && customerId !== user.id) {
    return new NextResponse('Customer ID mismatch', { status: 403 });
  }

  if (courierId) {
    return new NextResponse('Customers cannot assign courier', { status: 403 });
  }

  const itemsTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = itemsTotal;

  if (itemsTotal <= 0) {
    return new NextResponse('Order must contain at least one valid item', { status: 400 });
  }

  const orderItems = items.map((item) => ({
    product_id: item.id,
    name_snapshot: item.name,
    unit_price: item.price,
    qty: item.quantity,
    total: item.price * item.quantity,
  }));

  const { data, error } = await supabase.rpc('create_order_with_items', {
    order_input: {
      customer_id: user.id,
      branch_id: branchId,
      address_text: addressText,
      payment_method: paymentMethod,
      items_total: itemsTotal,
      total,
      type: 'delivery',
    },
    items_input: orderItems,
  });

  if (error) {
    logEvent({
      level: 'error',
      event: 'orders.create.failed',
      message: 'Error creating order with items',
      error,
      context: {
        branchId,
        paymentMethod,
        itemsCount: items.length,
      },
    });
    const errorMessage = error.message || 'Failed to create order';
    return new NextResponse(errorMessage, { status: 500 });
  }

  const payload = Array.isArray(data) ? data[0] : data;
  const rawOrder: RawOrder | null = payload?.order ?? payload ?? null;
  const rawItems: RawOrderItem[] | null = payload?.items ?? payload?.order_items ?? null;
  const normalizedOrder = normalizeOrder(rawOrder);
  const normalizedItems = normalizeOrderItems(rawItems);

  if (!normalizedOrder) {
    logEvent({
      level: 'error',
      event: 'orders.create.failed',
      message: 'Supabase did not return an order payload',
      context: {
        branchId,
        paymentMethod,
        itemsCount: items.length,
      },
    });
    return new NextResponse('Failed to create order', { status: 500 });
  }

  logEvent({
    level: 'info',
    event: 'orders.create.success',
    message: 'Order created successfully',
    context: {
      branchId,
      orderId: normalizedOrder.id,
      itemsCount: items.length,
      total,
    },
  });

  return NextResponse.json({
    order: normalizedOrder,
    items: normalizedItems,
  });
}
