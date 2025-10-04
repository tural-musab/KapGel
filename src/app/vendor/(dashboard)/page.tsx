import { Bike, DollarSign, Filter, Hourglass, Package, Star } from 'lucide-react';

import { DashboardStatCard, OrderActionButton, OrderStatusBadge } from '@/components/ui/dashboard';
import type { DashboardStatCardProps } from '@/components/ui/dashboard';
import { OrderTimeline } from '@/components/ui/dashboard/order-timeline';
import { requireRole } from 'lib/auth/server-guard';

const ACTIVE_STATUSES = new Set(['NEW', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'ON_ROUTE']);

const TIMELINE_TEMPLATE = [
  {
    id: 'pending',
    title: 'Sipariş Alındı',
    description: 'Siparişiniz işletmeye iletildi.',
    state: 'complete' as const,
  },
  {
    id: 'preparing',
    title: 'Hazırlanıyor',
    description: 'Mutfak siparişinizi hazırlıyor.',
    state: 'current' as const,
  },
  {
    id: 'ready',
    title: 'Teslime Hazır',
    description: 'Kurye teslim almak üzere.',
    state: 'upcoming' as const,
  },
  {
    id: 'en_route',
    title: 'Yolda',
    description: 'Kurye siparişinizi teslimata çıkardı.',
    state: 'upcoming' as const,
  },
  {
    id: 'delivered',
    title: 'Teslim Edildi',
    description: 'Sipariş müşteriye ulaştı.',
    state: 'upcoming' as const,
  },
];

const STATUS_BADGE_MAP: Record<string, 'pending' | 'preparing' | 'ready' | 'en_route' | 'delivered' | 'cancelled'> = {
  NEW: 'pending',
  CONFIRMED: 'pending',
  PREPARING: 'preparing',
  PICKED_UP: 'ready',
  ON_ROUTE: 'en_route',
  DELIVERED: 'delivered',
  REJECTED: 'cancelled',
  CANCELED_BY_VENDOR: 'cancelled',
  CANCELED_BY_USER: 'cancelled',
};

type VendorRow = {
  id: string;
  name: string | null;
};

type BranchRow = {
  id: string;
  name: string | null;
  vendor_id: string | null;
  address_text: string | null;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelative(dateString: string | null) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const delta = Date.now() - date.getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default async function VendorDashboardPage() {
  const { supabase, user, role } = await requireRole(['vendor_admin', 'admin']);

  const { data: vendorRows } = await supabase
    .from('vendors')
    .select('id,name')
    .eq('owner_user_id', user.id);

  const vendors = (vendorRows ?? []) as VendorRow[];
  const vendorIds = vendors.map((vendor) => vendor.id);

  const { data: branchRows } = vendorIds.length
    ? await supabase
        .from('branches')
        .select('id,name,address_text,vendor_id')
        .in('vendor_id', vendorIds)
    : { data: [] };

  const branches = (branchRows ?? []) as BranchRow[];
  const branchIds = branches.map((branch) => branch.id);

  const { data: orderRows } = branchIds.length
    ? await supabase
        .from('orders')
        .select('id,status,total,created_at,address_text,branch_id,order_items(name_snapshot,qty)')
        .in('branch_id', branchIds)
        .order('created_at', { ascending: false })
        .limit(25)
    : { data: [] };

  const orders = (orderRows ?? []) as OrderRow[];

  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
  const vendorName = vendors[0]?.name ?? 'İşletme Paneli';

  const totalOrders = orders.length;
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.has(order.status ?? '')).length;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = orders
    .filter((order) => {
      if (order.status !== 'DELIVERED') return false;
      if (!order.created_at) return false;
      const date = new Date(order.created_at);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    })
    .reduce((acc, order) => acc + toNumber(order.total), 0);

  const statCards: DashboardStatCardProps[] = [
    {
      title: 'Toplam Sipariş',
      value: totalOrders,
      changeLabel: totalOrders ? `${totalOrders} kayıt listeleniyor` : 'Henüz sipariş yok',
      trend: totalOrders > 0 ? 'up' : 'neutral',
      icon: Package,
      accentGradient: 'from-orange-500 to-red-500',
      backgroundGradient: 'from-orange-50 to-red-50',
    },
    {
      title: 'Bu Ay Gelir',
      value: formatCurrency(monthlyRevenue),
      changeLabel: 'Teslim edilen siparişler',
      trend: monthlyRevenue > 0 ? 'up' : 'neutral',
      icon: DollarSign,
      accentGradient: 'from-green-500 to-emerald-600',
      backgroundGradient: 'from-green-50 to-emerald-50',
    },
    {
      title: 'Aktif Siparişler',
      value: activeOrders,
      changeLabel: activeOrders ? 'İşlem bekleyen siparişler' : 'Tüm siparişler tamamlandı',
      trend: activeOrders > 0 ? 'up' : 'neutral',
      icon: Bike,
      accentGradient: 'from-blue-500 to-indigo-600',
      backgroundGradient: 'from-blue-50 to-indigo-50',
    },
    {
      title: 'Müşteri Memnuniyeti',
      value: '4.8',
      changeLabel: 'Anket entegrasyonu planlandı',
      trend: 'neutral',
      icon: Star,
      accentGradient: 'from-yellow-400 to-orange-500',
      backgroundGradient: 'from-yellow-50 to-orange-50',
    },
  ];

  const tableRows = orders.slice(0, 10).map((order) => {
    const branch = branchMap.get(order.branch_id ?? '') ?? null;
    const itemSummary = (order.order_items ?? [])
      .map((item) => (item.name_snapshot ? `${item.name_snapshot}${item.qty ? ` × ${item.qty}` : ''}` : null))
      .filter(Boolean)
      .join(', ');

    return {
      id: order.id,
      status: STATUS_BADGE_MAP[order.status ?? 'NEW'] ?? 'pending',
      total: formatCurrency(toNumber(order.total)),
      time: formatRelative(order.created_at),
      address: order.address_text ?? branch?.address_text ?? 'Adres bilgisi yok',
      branchName: branch?.name ?? 'Şube bilgisi yok',
      items: itemSummary || 'Ürün bilgisi bulunmuyor',
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-16 pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-8">
          <p className="text-sm font-medium text-orange-600">İşletme Paneli</p>
          <h1 className="text-3xl font-bold text-gray-900">{vendorName}</h1>
          <p className="text-sm text-gray-600">
            Canlı sipariş akışı, menü yönetimi ve performans metrikleri
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <DashboardStatCard key={card.title} {...card} />
          ))}
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/80 p-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Aktif Siparişler</h2>
                <p className="text-sm text-gray-600">Yeni siparişleri onaylayın, hazırlananları teslim edin.</p>
              </div>
              <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-orange-400">
                <Filter className="h-4 w-4" />
                Filtrele
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm font-semibold text-gray-700">
                      <th className="px-6 py-4">Sipariş</th>
                      <th className="px-6 py-4">Şube</th>
                      <th className="px-6 py-4">Ürünler</th>
                      <th className="px-6 py-4">Durum</th>
                      <th className="px-6 py-4">Tutar</th>
                      <th className="px-6 py-4">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {tableRows.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={6}>
                          Henüz sipariş bulunmuyor. Supabase üzerinde yeni sipariş oluşturduğunuzda liste otomatik dolacaktır.
                        </td>
                      </tr>
                    ) : (
                      tableRows.map((order) => (
                        <tr key={order.id} className="hover:bg-orange-50/60">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{order.id}</p>
                            <p className="text-xs text-gray-500">{order.time}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{order.branchName}</p>
                            <p className="text-xs text-gray-500">{order.address}</p>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-600">{order.items}</td>
                          <td className="px-6 py-4">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">{order.total}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <OrderActionButton label="Yakında" variant="approve" disabled icon={Hourglass} />
                              <OrderActionButton label="Yakında" variant="ready" disabled icon={Hourglass} />
                              <OrderActionButton label="Yakında" variant="handover" disabled icon={Hourglass} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 backdrop-blur-sm">
              <h2 className="mb-6 text-lg font-semibold text-gray-900">Sipariş Akışı</h2>
              <OrderTimeline steps={TIMELINE_TEMPLATE} />
            </div>
            <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 p-6 text-sm text-orange-700">
              Canlı veri bağlantısı yakında: Supabase Realtime sayesinde siparişleriniz otomatik güncellenecek.
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
