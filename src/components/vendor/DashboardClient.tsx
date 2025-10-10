/**
 * Vendor Dashboard Client Component
 * 
 * Real-time dashboard with order updates and statistics
 * 
 * Features:
 * - Dashboard stats from API
 * - Real-time order notifications
 * - Order status transitions
 * 
 * @see specs/001-kapsam-roller-m/contracts/vendor-api.md
 * @see specs/001-kapsam-roller-m/contracts/realtime-channels.md
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from 'lib/supabase/client';
import { Bike, DollarSign, Filter, Package, Star, Bell, Home, LogOut } from 'lucide-react';
import { DashboardStatCard, OrderStatusBadge } from '@/components/ui/dashboard';
import type { DashboardStatCardProps } from '@/components/ui/dashboard';

type DashboardStats = {
  period: string;
  stats: {
    total_orders: number;
    active_orders: number;
    completed_orders: number;
    canceled_orders: number;
    revenue: number;
    average_order_value: number;
    average_preparation_time: number;
  };
  status_breakdown: Record<string, number>;
  hourly_orders: Array<{ hour: string; count: number }>;
  top_products: Array<{
    product_id: string;
    name: string;
    orders_count: number;
    revenue: number;
  }>;
};

type Order = {
  id: string;
  status: string; // Non-null, defaults to 'NEW'
  total: number;
  created_at: string; // Non-null, ISO format
  address_text: string | null;
  branch_id: string; // Non-null
  order_items: Array<{
    name_snapshot: string | null;
    qty: number | null;
  }> | null;
};

const STATUS_BADGE_MAP: Record<
  string,
  'pending' | 'preparing' | 'ready' | 'en_route' | 'delivered' | 'cancelled'
> = {
  NEW: 'pending',
  CONFIRMED: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'ready',
  ON_ROUTE: 'en_route',
  DELIVERED: 'delivered',
  REJECTED: 'cancelled',
  CANCELED_BY_VENDOR: 'cancelled',
  CANCELED_BY_USER: 'cancelled',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelative(dateString: string) {
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

type VendorDashboardClientProps = {
  vendorId: string;
  branchIds: string[];
  vendorName: string;
  initialOrders: Order[];
};

export function VendorDashboardClient({
  vendorId,
  branchIds,
  vendorName,
  initialOrders,
}: VendorDashboardClientProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);

  // Fetch dashboard stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/vendor/dashboard/stats?period=today');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // T020-3: Real-time order updates
  useEffect(() => {
    if (branchIds.length === 0) return;

    const supabase = createClient();
    if (!supabase) return;

    // Subscribe to new orders for all branches
    const channels = branchIds.map((branchId) => {
      const channel = supabase
        .channel(`branch:${branchId}:new-orders`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `branch_id=eq.${branchId}`,
          },
          (payload) => {
            console.log('New order received:', payload.new);
            
            // Add new order to list
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);

            // Show alert
            setNewOrderAlert(true);
            setTimeout(() => setNewOrderAlert(false), 5000);

            // Play notification sound
            try {
              const audio = new Audio('/sounds/new-order.mp3');
              audio.play().catch((e) => console.warn('Could not play sound:', e));
            } catch (e) {
              console.warn('Audio not available');
            }

            // Refresh stats
            fetch('/api/vendor/dashboard/stats?period=today')
              .then((res) => res.json())
              .then((data) => setStats(data))
              .catch(console.error);
          }
        )
        .subscribe();

      return channel;
    });

    // Subscribe to order updates
    const updateChannel = supabase
      .channel('vendor:order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order updated:', payload.new);
          
          // Update order in list
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
          );

          // Refresh stats if status changed
          fetch('/api/vendor/dashboard/stats?period=today')
            .then((res) => res.json())
            .then((data) => setStats(data))
            .catch(console.error);
        }
      )
      .subscribe();

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
      supabase.removeChannel(updateChannel);
    };
  }, [branchIds]);

  // Prepare stat cards
  const statCards: DashboardStatCardProps[] = stats
    ? [
        {
          title: 'Toplam Sipariş',
          value: stats.stats.total_orders,
          changeLabel: `${stats.stats.total_orders} sipariş bugün`,
          trend: stats.stats.total_orders > 0 ? 'up' : 'neutral',
          icon: Package,
          accentGradient: 'from-orange-500 to-red-500',
          backgroundGradient: 'from-orange-50 to-red-50',
        },
        {
          title: 'Bugün Gelir',
          value: formatCurrency(stats.stats.revenue),
          changeLabel: `Ort: ${formatCurrency(stats.stats.average_order_value)}`,
          trend: stats.stats.revenue > 0 ? 'up' : 'neutral',
          icon: DollarSign,
          accentGradient: 'from-green-500 to-emerald-600',
          backgroundGradient: 'from-green-50 to-emerald-50',
        },
        {
          title: 'Aktif Siparişler',
          value: stats.stats.active_orders,
          changeLabel: `${stats.stats.completed_orders} tamamlandı`,
          trend: stats.stats.active_orders > 0 ? 'up' : 'neutral',
          icon: Bike,
          accentGradient: 'from-blue-500 to-indigo-600',
          backgroundGradient: 'from-blue-50 to-indigo-50',
        },
        {
          title: 'İptal Oranı',
          value: stats.stats.total_orders > 0 
            ? `${Math.round((stats.stats.canceled_orders / stats.stats.total_orders) * 100)}%`
            : '0%',
          changeLabel: `${stats.stats.canceled_orders} iptal`,
          trend: stats.stats.canceled_orders === 0 ? 'neutral' : 'down',
          icon: Star,
          accentGradient: 'from-yellow-400 to-orange-500',
          backgroundGradient: 'from-yellow-50 to-orange-50',
        },
      ]
    : [];

  // Prepare table rows
  const tableRows = orders.slice(0, 10).map((order) => {
    const itemSummary =
      (order.order_items ?? [])
        .map((item) =>
          item.name_snapshot ? `${item.name_snapshot}${item.qty ? ` × ${item.qty}` : ''}` : null
        )
        .filter(Boolean)
        .join(', ') || 'Ürün bilgisi yok';

    return {
      id: order.id,
      status: STATUS_BADGE_MAP[order.status ?? 'NEW'] ?? 'pending',
      total: formatCurrency(order.total),
      time: formatRelative(order.created_at),
      address: order.address_text ?? 'Adres bilgisi yok',
      items: itemSummary,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-16 pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <nav className="mb-8 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-600">İşletme Merkezi</p>
              <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">{vendorName}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
            >
              <Home className="h-4 w-4" />
              Ana Sayfa
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg"
              >
                <LogOut className="h-4 w-4" />
                Çıkış Yap
              </button>
            </form>
          </div>
        </nav>

        {/* New Order Alert */}
        {newOrderAlert && (
          <div className="fixed right-6 top-24 z-50 animate-slide-in-right rounded-xl border border-green-200 bg-green-50 p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Yeni Sipariş!</p>
                <p className="text-sm text-green-700">Yeni bir sipariş geldi</p>
              </div>
            </div>
          </div>
        )}

        <header className="mb-8">
          <p className="text-sm font-medium text-orange-600">İşletme Paneli</p>
          <h2 className="text-3xl font-bold text-gray-900">{vendorName}</h2>
          <p className="text-sm text-gray-600">
            Canlı sipariş akışı, menü yönetimi ve performans metrikleri
          </p>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            ))
          ) : (
            statCards.map((card) => <DashboardStatCard key={card.title} {...card} />)
          )}
        </section>

        {/* Orders Table */}
        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/80 p-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Aktif Siparişler</h2>
              <p className="text-sm text-gray-600">
                Gerçek zamanlı sipariş takibi - Yeni siparişler otomatik görünür
              </p>
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
                    <th className="px-6 py-4">Sipariş ID</th>
                    <th className="px-6 py-4">Ürünler</th>
                    <th className="px-6 py-4">Adres</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4">Tutar</th>
                    <th className="px-6 py-4">Zaman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={6}>
                        Henüz sipariş yok. Yeni siparişler otomatik olarak burada görünecek.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((order) => (
                      <tr key={order.id} className="hover:bg-orange-50/60">
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs text-gray-500">{order.id.slice(0, 8)}...</p>
                          <p className="text-xs text-gray-400">{order.time}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">{order.items}</td>
                        <td className="px-6 py-4 text-xs text-gray-600">{order.address}</td>
                        <td className="px-6 py-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{order.total}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{order.time}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
