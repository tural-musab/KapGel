/**
 * Vendor Dashboard Page
 * 
 * Server Component that fetches initial data and renders client dashboard
 */

import { requireRole } from 'lib/auth/server-guard';
import { VendorDashboardClient } from '@/components/vendor/DashboardClient';
import { createAdminClient } from 'lib/supabase/admin';

type VendorRow = {
  id: string;
  name: string | null;
};

type BranchRow = {
  id: string;
  name: string | null;
  vendor_id: string | null;
};

type OrderItemRow = {
  name_snapshot: string | null;
  qty: number | null;
};

type OrderRow = {
  id: string;
  status: string | null;
  total: number | string | null;
  created_at: string | null;
  address_text: string | null;
  branch_id: string | null;
  order_items: OrderItemRow[] | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default async function VendorDashboardPage() {
  const { supabase, user } = await requireRole(['vendor_admin', 'admin']);
  const adminClient = createAdminClient();

  let vendors: VendorRow[] = [];

  if (adminClient) {
    const { data: adminVendorRows, error: adminVendorError } = await adminClient
      .from('vendors')
      .select('id,name')
      .eq('owner_user_id', user.id);

    if (adminVendorError) {
      console.error('Admin vendor fetch error', adminVendorError);
    }

    vendors = (adminVendorRows ?? []).map((vendor) => ({
      id: vendor.id,
      name: vendor.name ?? null,
    }));
  } else {
    const { data: vendorRows, error: vendorFetchError } = await supabase
      .from('vendors')
      .select('id,name')
      .eq('owner_user_id', user.id);

    if (vendorFetchError) {
      console.error('Vendor fetch error', vendorFetchError);
    }

    vendors = (vendorRows ?? []) as VendorRow[];
  }

  let vendorIds = vendors.map((vendor) => vendor.id);

  if (vendorIds.length === 0 && adminClient) {
    const { data: vendorInfo } = await adminClient
      .from('vendor_applications')
      .select('business_name,business_type,status')
      .eq('user_id', user.id)
      .maybeSingle();

    const isApproved = vendorInfo?.status === 'approved';
    const fallbackName =
      vendorInfo?.business_name?.trim()?.length
        ? vendorInfo?.business_name.trim()
        : user.email?.split('@')[0] ?? `Vendor ${user.id.slice(0, 8)}`;

    if (isApproved) {
      const { error: insertError } = await adminClient
        .from('vendors')
        .insert({
          owner_user_id: user.id,
          name: fallbackName,
          business_type: vendorInfo?.business_type ?? 'restaurant',
          verified: false,
        });

      if (insertError && insertError.code !== '23505') {
        console.error('Vendor insert failed in dashboard self-heal', {
          userId: user.id,
          message: insertError.message,
          code: insertError.code,
        });
      }

      if (!insertError || insertError?.code === '23505') {
        const { data: refreshedVendors, error: refreshedVendorError } = await adminClient
          .from('vendors')
          .select('id,name')
          .eq('owner_user_id', user.id);

        if (refreshedVendorError) {
          console.error('Vendor refetch error after insert', refreshedVendorError);
        }

        vendors = (refreshedVendors ?? []).map((vendor) => ({
          id: vendor.id,
          name: vendor.name ?? null,
        }));
        vendorIds = vendors.map((vendor) => vendor.id);
      }
    }
  }

  if (vendorIds.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Vendor Bulunamadı</h1>
          <p className="mt-2 text-sm text-gray-600">
            Bu hesap ile ilişkili bir vendor bulunamadı.
          </p>
        </div>
      </div>
    );
  }

  // Get branches
  const { data: branchRows } = await supabase
    .from('branches')
    .select('id,name,vendor_id')
    .in('vendor_id', vendorIds);

  const branches = (branchRows ?? []) as BranchRow[];
  const branchIds = branches.map((branch) => branch.id);

  // Get initial orders (for SSR)
  const { data: orderRows } = branchIds.length
    ? await supabase
        .from('orders')
        .select('id,status,total,created_at,address_text,branch_id,order_items(name_snapshot,qty)')
        .in('branch_id', branchIds)
        .order('created_at', { ascending: false })
        .limit(25)
    : { data: [] };

  const orders = (orderRows ?? []) as OrderRow[];

  // Convert orders to proper format
  const formattedOrders = orders.map((order) => ({
    ...order,
    status: order.status || 'NEW', // Ensure non-null status
    created_at: order.created_at || new Date().toISOString(), // Ensure non-null date
    branch_id: order.branch_id || '', // Ensure non-null branch_id
    total: toNumber(order.total),
  }));

  const vendorName = vendors[0]?.name ?? 'İşletme Paneli';

  return (
    <VendorDashboardClient
      vendorId={vendorIds[0]}
      branchIds={branchIds}
      vendorName={vendorName}
      initialOrders={formattedOrders}
    />
  );
}
