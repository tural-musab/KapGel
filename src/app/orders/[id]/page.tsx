import { notFound } from 'next/navigation';

import { OrderTrackingClient, type OrderStatus } from '@/components/orders/OrderTrackingClient';
import { createClient } from 'lib/supabase/server';

const statusMap: Record<string, OrderStatus> = {
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

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();

  if (!supabase) {
    return (
      <OrderTrackingClient
        orderId={id}
        initialStatus="pending"
        items={[]}
        total={0}
        supabaseReady={false}
      />
    );
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id,status,total,order_items(id, qty, unit_price, total, products(name))')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const status = statusMap[data.status ?? 'NEW'] ?? 'pending';
  const items = (data.order_items ?? []).map((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    return {
      id: item.id,
      name: product?.name ?? null,
      qty: item.qty ?? 0,
      unitPrice: typeof item.unit_price === 'number' ? item.unit_price : Number(item.unit_price ?? 0),
      total: typeof item.total === 'number' ? item.total : Number(item.total ?? 0),
    };
  });
  const total = typeof data.total === 'number' ? data.total : Number(data.total ?? 0);

  return (
    <OrderTrackingClient
      orderId={data.id}
      initialStatus={status}
      items={items}
      total={total}
      supabaseReady
    />
  );
}
