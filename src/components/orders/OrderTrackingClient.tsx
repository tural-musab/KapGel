"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { OrderTimeline } from '@/components/ui/dashboard/order-timeline';
import type { TimelineState } from '@/components/ui/dashboard/order-timeline';
import { createClient } from 'lib/supabase/client';

// Dynamic import for Map component (client-side only)
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

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
  branchLocation?: { lat: number; lng: number; name?: string } | null;
  deliveryAddress?: { lat: number; lng: number; text?: string } | null;
  courierId?: string | null;
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

export function OrderTrackingClient({
  orderId,
  initialStatus,
  items,
  total,
  supabaseReady,
  branchLocation,
  deliveryAddress,
  courierId
}: OrderTrackingClientProps) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [courierPosition, setCourierPosition] = useState<{
    lat: number;
    lng: number;
    heading?: number;
    accuracy?: number;
    timestamp?: string;
  } | null>(null);

  // Subscribe to order status updates
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

  // Subscribe to courier location updates (real-time tracking)
  useEffect(() => {
    if (!supabaseReady || !courierId || status !== 'en_route') return;

    const client = createClient();
    if (!client) return;

    // Fetch initial courier location
    const fetchInitialLocation = async () => {
      const { data } = await client
        .from('courier_locations')
        .select('*')
        .eq('courier_id', courierId)
        .eq('order_id', orderId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Extract coordinates from PostGIS geography
        const lat = data.latitude ?? 0;
        const lng = data.longitude ?? 0;

        setCourierPosition({
          lat,
          lng,
          heading: data.heading ?? undefined,
          accuracy: data.accuracy ?? undefined,
          timestamp: data.updated_at,
        });
      }
    };

    void fetchInitialLocation();

    // Subscribe to real-time location updates
    const channel = client
      .channel(`courier_location:${courierId}:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'courier_locations',
          filter: `courier_id=eq.${courierId}`,
        },
        (payload) => {
          const newLocation = payload.new as {
            order_id?: string;
            latitude?: number;
            longitude?: number;
            heading?: number;
            accuracy?: number;
            speed?: number;
            updated_at?: string;
          };

          // Only update if this location is for the current order
          if (newLocation.order_id === orderId) {
            const lat = newLocation.latitude ?? 0;
            const lng = newLocation.longitude ?? 0;

            setCourierPosition({
              lat,
              lng,
              heading: newLocation.heading ?? undefined,
              accuracy: newLocation.accuracy ?? undefined,
              timestamp: newLocation.updated_at,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [orderId, courierId, status, supabaseReady]);

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

        {(branchLocation || deliveryAddress || courierPosition) && (
          <section className="rounded-lg border p-4 xl:col-span-3">
            <h2 className="text-2xl font-semibold mb-4">Canlı Takip</h2>
            <Map
              center={
                courierPosition
                  ? [courierPosition.lng, courierPosition.lat]
                  : deliveryAddress
                  ? [deliveryAddress.lng, deliveryAddress.lat]
                  : branchLocation
                  ? [branchLocation.lng, branchLocation.lat]
                  : undefined
              }
              zoom={14}
              courierPosition={courierPosition}
              deliveryAddress={
                deliveryAddress
                  ? {
                      lat: deliveryAddress.lat,
                      lng: deliveryAddress.lng,
                      label: deliveryAddress.text ?? 'Teslimat Adresi',
                    }
                  : undefined
              }
              branchLocation={
                branchLocation
                  ? {
                      lat: branchLocation.lat,
                      lng: branchLocation.lng,
                      label: branchLocation.name ?? 'Restoran',
                    }
                  : undefined
              }
              height="h-96"
              width="w-full"
            />
          </section>
        )}
      </main>
    </div>
  );
}
