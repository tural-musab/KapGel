/**
 * Courier Dashboard Page
 * 
 * Server Component that fetches courier data and renders client dashboard
 */

import { requireRole } from 'lib/auth/server-guard';
import { CourierDashboardClient } from '@/components/courier/DashboardClient';

type CourierRow = {
  id: string;
  user_id: string;
  shift_status: 'online' | 'offline';
  vehicle_type: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  total: number | string;
  created_at: string;
  address_text: string | null;
  branch_id: string;
  customer_id: string;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default async function CourierDashboardPage() {
  const { supabase, user } = await requireRole(['courier', 'admin']);

  // Get courier data
  const { data: courierData, error: courierError } = await supabase
    .from('couriers')
    .select('id, user_id, shift_status, vehicle_type')
    .eq('user_id', user.id)
    .single<CourierRow>();

  if (courierError || !courierData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">Courier Profile Not Found</h1>
          <p className="mt-2 text-sm text-gray-600">
            No courier profile found for your account. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Get assigned orders
  const { data: ordersData } = await supabase
    .from('orders')
    .select('id, status, total, created_at, address_text, branch_id, customer_id')
    .eq('courier_id', courierData.id)
    .in('status', ['READY', 'PICKED_UP', 'ON_ROUTE', 'DELIVERED'])
    .order('created_at', { ascending: false })
    .limit(50);

  const orders = (ordersData || []) as OrderRow[];

  // Format orders
  const formattedOrders = orders.map((order) => ({
    ...order,
    total: toNumber(order.total),
  }));

  return (
    <CourierDashboardClient courier={courierData} assignedOrders={formattedOrders} />
  );
}
