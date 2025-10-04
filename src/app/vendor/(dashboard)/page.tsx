import { Bike, DollarSign, Filter, Package, Star } from 'lucide-react';

import { DashboardStatCard, OrderActionButton, OrderStatusBadge } from '@/components/ui/dashboard';
import { OrderTimeline } from '@/components/ui/dashboard/order-timeline';

const STAT_CARDS = [
  {
    title: 'Toplam Sipariş',
    value: '1.234',
    changeLabel: '+12.5%',
    trend: 'up' as const,
    icon: Package,
    accentGradient: 'from-orange-500 to-red-500',
    backgroundGradient: 'from-orange-50 to-red-50',
  },
  {
    title: 'Bu Ay Gelir',
    value: '₺48.345',
    changeLabel: '+18.2%',
    trend: 'up' as const,
    icon: DollarSign,
    accentGradient: 'from-green-500 to-emerald-600',
    backgroundGradient: 'from-green-50 to-emerald-50',
  },
  {
    title: 'Aktif Siparişler',
    value: '8',
    changeLabel: '+3',
    trend: 'up' as const,
    icon: Bike,
    accentGradient: 'from-blue-500 to-indigo-600',
    backgroundGradient: 'from-blue-50 to-indigo-50',
  },
  {
    title: 'Ortalama Puan',
    value: '4.8',
    changeLabel: '+0.3',
    trend: 'up' as const,
    icon: Star,
    accentGradient: 'from-yellow-400 to-orange-500',
    backgroundGradient: 'from-yellow-50 to-orange-50',
  },
];

const MOCK_ORDERS = [
  {
    id: 'ORD-2025-001',
    customer: 'Ayşe Demir',
    items: 'Margherita Pizza, Ayran',
    status: 'pending',
    total: '₺250,00',
    time: '2 dk önce',
    address: 'Ataşehir, İstanbul',
  },
  {
    id: 'ORD-2025-002',
    customer: 'Mehmet Kaya',
    items: 'Karışık Pizza, Su',
    status: 'preparing',
    total: '₺220,00',
    time: '5 dk önce',
    address: 'Kadıköy, İstanbul',
  },
  {
    id: 'ORD-2025-003',
    customer: 'Elif Yılmaz',
    items: 'Sucuklu Pizza',
    status: 'ready',
    total: '₺240,00',
    time: '8 dk önce',
    address: 'Üsküdar, İstanbul',
  },
];

const MOCK_TIMELINE = [
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

export default function VendorDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-16 pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-8">
          <p className="text-sm font-medium text-orange-600">İşletme Paneli</p>
          <h1 className="text-3xl font-bold text-gray-900">Pizza Master - İstanbul</h1>
          <p className="text-sm text-gray-600">
            Canlı sipariş akışı, menü yönetimi ve performans metrikleri
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map((card) => (
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
                      <th className="px-6 py-4">Müşteri</th>
                      <th className="px-6 py-4">Ürünler</th>
                      <th className="px-6 py-4">Durum</th>
                      <th className="px-6 py-4">Tutar</th>
                      <th className="px-6 py-4">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {MOCK_ORDERS.map((order) => (
                      <tr key={order.id} className="hover:bg-orange-50/60">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{order.id}</p>
                          <p className="text-xs text-gray-500">{order.time}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{order.customer}</p>
                          <p className="text-xs text-gray-500">{order.address}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">{order.items}</td>
                        <td className="px-6 py-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{order.total}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {order.status === 'pending' ? (
                              <OrderActionButton label="Onayla" variant="approve" />
                            ) : null}
                            {order.status === 'preparing' ? (
                              <OrderActionButton label="Hazır" variant="ready" />
                            ) : null}
                            {order.status === 'ready' ? (
                              <OrderActionButton label="Teslim Et" variant="handover" />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 backdrop-blur-sm">
              <h2 className="mb-6 text-lg font-semibold text-gray-900">Sipariş Akışı</h2>
              <OrderTimeline steps={MOCK_TIMELINE} />
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
