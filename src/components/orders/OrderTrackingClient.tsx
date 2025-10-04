"use client";

import { useEffect, useMemo, useState } from 'react';

import { OrderTimeline } from '@/components/ui/dashboard/order-timeline';
import type { TimelineState } from '@/components/ui/dashboard/order-timeline';
import { createClient } from 'lib/supabase/client';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'en_route' | 'delivered' | 'cancelled';

interface OrderTimelineStepDescriptor {
  id: OrderStatus;
  title: string;
  description: string;
}

const TIMELINE_DEFINITION: OrderTimelineStepDescriptor[] = [
  { id: 'pending', title: 'Sipariş Alındı', description: 'İşletme siparişi incelediğinde güncellenecek.' },
  { id: 'preparing', title: 'Hazırlanıyor', description: 'Siparişiniz hazırlanıyor.' },
  { id: 'ready', title: 'Teslime Hazır', description: 'Sipariş, kurye teslimi için hazır durumda.' },
  { id: 'en_route', title: 'Yolda', description: 'Kurye siparişinizi teslimata çıkardı.' },
  { id: 'delivered', title: 'Teslim Edildi', description: 'Sipariş başarıyla teslim edildi.' },
];

export interface TrackingItem {
  id: string;
  name: string | null;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface OrderTrackingClientProps {
  orderId: string;
  initialStatus: OrderStatus;
  items: TrackingItem[];
  total: number;
  supabaseReady: boolean;
}

function statusToTimeline(status: OrderStatus) {
  const currentIndex = TIMELINE_DEFINITION.findIndex((step) => step.id === status);
  return TIMELINE_DEFINITION.map((step, index) => {
    let state: TimelineState;
    if (currentIndex === -1) {
      state = 'upcoming';
    } else if (index < currentIndex) {
      state = 'complete';
    } else if (index === currentIndex) {
      state = 'current';
    } else {
      state = 'upcoming';
    }

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      state,
    };
  });
}

export function OrderTrackingClient({ orderId, initialStatus, items, total, supabaseReady }: OrderTrackingClientProps) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  useEffect(() => {
    if (!supabaseReady) return;
    const client = createClient();
    if (!client) return;

    const channel = client
      .channel(`public:orders:id=${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string } | null)?.status?.toUpperCase();
          switch (newStatus) {
            case 'PREPARING':
              setStatus('preparing');
              break;
            case 'PICKED_UP':
              setStatus('ready');
              break;
            case 'ON_ROUTE':
              setStatus('en_route');
              break;
            case 'DELIVERED':
              setStatus('delivered');
              break;
            case 'REJECTED':
            case 'CANCELED_BY_USER':
            case 'CANCELED_BY_VENDOR':
              setStatus('cancelled');
              break;
            case 'NEW':
            case 'CONFIRMED':
              setStatus('pending');
              break;
            default:
              break;
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [orderId, supabaseReady]);

  const timeline = useMemo(() => statusToTimeline(status), [status]);

  const statusLabels: Record<OrderStatus, string> = {
    pending: 'Sipariş Alındı',
    preparing: 'Hazırlanıyor',
    ready: 'Teslime Hazır',
    en_route: 'Yolda',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
  };

  return (
    <div className="container mx-auto p-4">
      <header className="my-8">
        <h1 className="text-4xl font-bold">Sipariş Takibi</h1>
        <p className="text-gray-600">Sipariş ID: {orderId}</p>
      </header>

      <main className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg border p-4 xl:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Sipariş Durumu</h2>
          <p className="mb-6 text-gray-700">
            Mevcut durum: <span className="font-semibold">{statusLabels[status]}</span>
          </p>
          <OrderTimeline
            steps={timeline.map((step) => ({
              id: step.id,
              title: step.title,
              description: step.description,
              state: step.state,
            }))}
            className="mb-6"
            showIndices
          />
          {!supabaseReady ? (
            <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              Supabase yapılandırması bulunmadığı için gerçek zamanlı güncellemeler devre dışı. Örnek veri gösteriliyor.
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-2xl font-semibold mb-4">Sipariş Detayları</h2>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <div>
                  <p className="font-semibold">{item.name ?? 'Ürün'}</p>
                  <p className="text-sm text-gray-600">
                    {item.qty} x {item.unitPrice.toFixed(2)} TL
                  </p>
                </div>
                <span className="font-semibold">{item.total.toFixed(2)} TL</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t pt-4">
            <p className="flex justify-between text-lg font-bold">
              <span>Toplam</span>
              <span>{total.toFixed(2)} TL</span>
            </p>
          </div>
        </section>

        <section className="rounded-lg border p-4 xl:col-span-3">
          <h2 className="text-2xl font-semibold mb-4">Harita</h2>
          <div className="flex h-48 items-center justify-center rounded bg-gray-100 text-sm text-gray-500">
            Harita bileşeni yakında eklenecek
          </div>
        </section>
      </main>
    </div>
  );
}
