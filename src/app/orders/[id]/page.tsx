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
    .select(`
      id,
      status,
      total,
      address_text,
      courier_id,
      order_items(id, qty, unit_price, total, products(name)),
      branches(
        name,
        address_text,
        geo_point
      )
    `)
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

  // Extract branch location from geo_point
  const branch = Array.isArray(data.branches) ? data.branches[0] : data.branches;
  const branchLocation = branch?.geo_point
    ? extractCoordinates(branch.geo_point)
    : null;

  // Extract delivery address coordinates (if available)
  // Note: Currently address_text is string, geo_point would need to be added to orders table
  const deliveryAddress = data.address_text
    ? {
        lat: 40.4093, // Placeholder - needs geo_point field in orders table
        lng: 49.8671,
        text: data.address_text,
      }
    : null;

  return (
    <OrderTrackingClient
      orderId={data.id}
      initialStatus={status}
      items={items}
      total={total}
      supabaseReady
      branchLocation={branchLocation}
      deliveryAddress={deliveryAddress}
      courierId={data.courier_id}
    />
  );
}

// Helper function to extract lat/lng from PostGIS geography
function extractCoordinates(geoPoint: unknown): { lat: number; lng: number; name?: string } | null {
  if (!geoPoint || typeof geoPoint !== 'string') return null;

  // PostGIS returns WKT format: POINT(lng lat)
  const match = geoPoint.match(/POINT\(([0-9.-]+) ([0-9.-]+)\)/);
  if (!match) return null;

  return {
    lng: parseFloat(match[1]),
    lat: parseFloat(match[2]),
  };
}
