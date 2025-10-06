/**
 * Courier Dashboard Client Component
 * 
 * Features:
 * - Shift management (online/offline)
 * - Active delivery tracking
 * - Location sharing toggle
 * - Real-time order updates
 * 
 * @see specs/001-kapsam-roller-m/contracts/courier-api.md
 * @see specs/001-kapsam-roller-m/contracts/courier-location-api.md
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from 'lib/supabase/client';
import {
  MapPinned,
  Power,
  Package,
  Navigation,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

type Courier = {
  id: string;
  user_id: string;
  shift_status: 'online' | 'offline';
  vehicle_type: string | null;
};

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  address_text: string | null;
  branch_id: string;
  customer_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  READY: 'Hazır - Teslim Al',
  PICKED_UP: 'Toplandı - Yola Çık',
  ON_ROUTE: 'Yolda - Teslim Et',
  DELIVERED: 'Teslim Edildi',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value);
}

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  const delta = Date.now() - date.getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  return `${hours} sa önce`;
}

type CourierDashboardClientProps = {
  courier: Courier;
  assignedOrders: Order[];
};

export function CourierDashboardClient({
  courier: initialCourier,
  assignedOrders: initialOrders,
}: CourierDashboardClientProps) {
  const [courier, setCourier] = useState<Courier>(initialCourier);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationInterval, setLocationInterval] = useState<number | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // T023-3: Shift Management
  async function handleShiftToggle() {
    setShiftLoading(true);
    try {
      const newStatus = courier.shift_status === 'online' ? 'offline' : 'online';

      const supabase = createClient();
      if (!supabase) {
        alert('Service unavailable');
        return;
      }

      const { error } = await supabase
        .from('couriers')
        .update({ shift_status: newStatus })
        .eq('id', courier.id);

      if (error) {
        console.error('Failed to toggle shift:', error);
        alert('Failed to toggle shift status');
        return;
      }

      setCourier((prev) => ({ ...prev, shift_status: newStatus }));

      // If going offline, stop location sharing
      if (newStatus === 'offline') {
        setLocationSharing(false);
        if (locationInterval) {
          clearInterval(locationInterval);
          setLocationInterval(null);
        }
      }
    } catch (error) {
      console.error('Shift toggle error:', error);
      alert('Failed to toggle shift');
    } finally {
      setShiftLoading(false);
    }
  }

  // T023-4: Location Sharing Toggle
  async function handleLocationToggle() {
    if (!locationSharing) {
      // Start location sharing
      if (courier.shift_status !== 'online') {
        alert('You must be online to share location');
        return;
      }

      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      // Start interval for location updates (every 15 seconds)
      const interval = window.setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const response = await fetch('/api/courier/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  heading: position.coords.heading,
                  speed: position.coords.speed,
                  order_id: orders.find((o) => o.status === 'ON_ROUTE')?.id,
                }),
              });

              if (!response.ok) {
                console.error('Failed to update location');
              }
            } catch (error) {
              console.error('Location update error:', error);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          }
        );
      }, 15000);

      setLocationInterval(interval);
      setLocationSharing(true);
    } else {
      // Stop location sharing
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }
      setLocationSharing(false);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [locationInterval]);

  // Real-time order updates
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('courier:order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `courier_id=eq.${courier.id}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courier.id]);

  const activeOrder = orders.find((o) => ['PICKED_UP', 'ON_ROUTE'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const completedToday = orders.filter((o) => o.status === 'DELIVERED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-16 pt-20">
      <div className="mx-auto max-w-5xl px-6">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600">Courier Dashboard</p>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Management</h1>
          <p className="text-sm text-gray-600">
            Manage your shift, track deliveries, and share your location
          </p>
        </header>

        {/* Shift Status Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  courier.shift_status === 'online'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Power className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Shift Status</h3>
                <p
                  className={`text-sm font-medium ${
                    courier.shift_status === 'online' ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {courier.shift_status === 'online' ? '🟢 Online & Ready' : '⚫ Offline'}
                </p>
              </div>
            </div>
            <button
              onClick={handleShiftToggle}
              disabled={shiftLoading}
              className={`rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all ${
                courier.shift_status === 'online'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              } ${shiftLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {shiftLoading
                ? 'Loading...'
                : courier.shift_status === 'online'
                  ? 'End Shift'
                  : 'Start Shift'}
            </button>
          </div>

          {/* Location Sharing Toggle */}
          {courier.shift_status === 'online' && (
            <div className="border-t border-gray-100 bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Navigation className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Location Sharing</p>
                    <p className="text-xs text-gray-600">
                      {locationSharing ? 'Updating every 15 seconds' : 'Enable to share your location'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLocationToggle}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    locationSharing
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {locationSharing ? 'Stop Sharing' : 'Start Sharing'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
                <p className="text-sm text-gray-600">Completed Today</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{readyOrders.length}</p>
                <p className="text-sm text-gray-600">Ready for Pickup</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <MapPinned className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {activeOrder ? '1' : '0'}
                </p>
                <p className="text-sm text-gray-600">Active Delivery</p>
              </div>
            </div>
          </div>
        </div>

        {/* T023-2: Active Delivery Card */}
        {activeOrder && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Active Delivery</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Order ID:</span>
                <span className="font-mono text-sm text-gray-900">
                  {activeOrder.id.slice(0, 8)}...
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="font-semibold text-orange-600">
                  {STATUS_LABELS[activeOrder.status] || activeOrder.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(activeOrder.total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Address:</span>
                <span className="text-sm text-gray-900">
                  {activeOrder.address_text || 'No address'}
                </span>
              </div>
            </div>
            <button className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600">
              Mark as Delivered
            </button>
          </div>
        )}

        {/* Orders List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Your Orders</h3>
            <p className="text-sm text-gray-600">Assigned deliveries and tasks</p>
          </div>
          <div className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm text-gray-500">No orders assigned yet</p>
                <p className="text-xs text-gray-400">
                  Orders will appear here when you go online
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-500">
                          {order.id.slice(0, 8)}...
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            order.status === 'DELIVERED'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'ON_ROUTE'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {order.address_text || 'No address'}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatRelative(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </p>
                      {order.status === 'DELIVERED' && (
                        <CheckCircle className="ml-auto mt-1 h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
