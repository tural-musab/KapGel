# Realtime Channels Specification

**Version:** 1.0  
**Last Updated:** 2025-10-05  
**Status:** Draft  
**Related Specs:** FR-004, FR-005, FR-009

---

## Overview

This document specifies the Supabase Realtime channels architecture for the KapGel platform, including channel naming conventions, subscription patterns, and event handling.

---

## Channel Architecture

### Channel Types

| Channel Type | Purpose | Subscribers | Events |
|--------------|---------|-------------|--------|
| Order Channels | Order status updates | Customer, Vendor, Courier | UPDATE |
| Location Channels | Courier GPS tracking | Customer, Vendor | INSERT |
| Branch Channels | New orders, menu changes | Vendor Staff | INSERT, UPDATE |
| Notification Channels | Real-time notifications | All users | INSERT |
| Presence Channels | Online couriers, vendors | Admins, Dispatchers | Presence |

---

## Channel Naming Conventions

### Format

```
{scope}:{id}:{subject}
```

### Examples

```typescript
// Order-specific channels
`order:${orderId}`                    // All order updates
`order:${orderId}:location`           // Courier location for order
`order:${orderId}:status`             // Status changes only

// Branch-specific channels
`branch:${branchId}:orders`           // New orders for branch
`branch:${branchId}:menu`             // Menu updates

// User-specific channels
`user:${userId}:notifications`        // User notifications
`user:${userId}:orders`               // User's orders

// Global channels
`platform:couriers:online`            // Online couriers presence
`platform:orders:live`                // Live order feed (admin)
```

---

## Order Status Updates Channel

### Channel Name

```
order:{order_id}
```

### Subscribers

- **Customer:** Owner of the order
- **Vendor:** Branch that owns the order
- **Courier:** Assigned courier
- **Admin:** All orders

### Events

#### Event: ORDER_STATUS_CHANGED

```typescript
{
  eventType: 'UPDATE',
  table: 'orders',
  schema: 'public',
  old: {
    id: 'uuid',
    status: 'PREPARING',
    updated_at: '2025-10-05T14:40:00Z'
  },
  new: {
    id: 'uuid',
    status: 'READY',
    updated_at: '2025-10-05T14:45:00Z',
    // ... other fields
  }
}
```

### Implementation

```typescript
// Customer subscribing to order updates
import { supabase } from '@/lib/supabase'

function subscribeToOrderUpdates(orderId: string) {
  const channel = supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        const { old: oldOrder, new: newOrder } = payload
        
        if (oldOrder.status !== newOrder.status) {
          // Status changed
          handleStatusChange(newOrder.status)
          
          // Show notification
          showToast(`Order ${newOrder.status}`)
        }
        
        if (oldOrder.courier_id !== newOrder.courier_id) {
          // Courier assigned
          handleCourierAssigned(newOrder.courier_id)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Connected to order updates')
      }
    })

  return () => {
    supabase.removeChannel(channel)
  }
}
```

---

## Courier Location Channel

### Channel Name

```
order:{order_id}:location
```

### Subscribers

- **Customer:** Viewing live delivery tracking
- **Vendor:** Monitoring delivery progress

### Events

#### Event: LOCATION_UPDATE

```typescript
{
  eventType: 'INSERT',
  table: 'courier_locations',
  schema: 'public',
  new: {
    id: 12345,
    courier_id: 'uuid',
    order_id: 'uuid',
    position: {
      type: 'Point',
      coordinates: [49.8671, 40.4093] // [lng, lat]
    },
    accuracy: 15.5,
    heading: 270.0,
    speed: 5.2,
    created_at: '2025-10-05T14:50:00Z'
  }
}
```

### Implementation

```typescript
import { supabase } from '@/lib/supabase'
import { Map, Marker } from 'maplibre-gl'

function subscribeToCourierLocation(
  orderId: string,
  onLocationUpdate: (location: CourierLocation) => void
) {
  const channel = supabase
    .channel(`order:${orderId}:location`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'courier_locations',
        filter: `order_id=eq.${orderId}`
      },
      (payload) => {
        const location = payload.new
        const [lng, lat] = location.position.coordinates
        
        onLocationUpdate({
          lat,
          lng,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
          timestamp: location.created_at
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Usage in React component
function DeliveryMap({ orderId }: { orderId: string }) {
  const [courierPosition, setCourierPosition] = useState(null)
  const mapRef = useRef<Map>(null)
  const markerRef = useRef<Marker>(null)

  useEffect(() => {
    const unsubscribe = subscribeToCourierLocation(orderId, (location) => {
      setCourierPosition(location)
      
      // Update marker on map
      if (markerRef.current) {
        markerRef.current.setLngLat([location.lng, location.lat])
        
        // Rotate marker based on heading
        if (location.heading) {
          markerRef.current.setRotation(location.heading)
        }
      }
      
      // Pan map to follow courier
      mapRef.current?.easeTo({
        center: [location.lng, location.lat],
        duration: 1000
      })
    })

    return unsubscribe
  }, [orderId])

  return <div id="map" ref={mapRef} />
}
```

---

## Branch Orders Channel

### Channel Name

```
branch:{branch_id}:orders
```

### Subscribers

- **Vendor Staff:** All staff members of the branch
- **Admin:** Platform administrators

### Events

#### Event: NEW_ORDER

```typescript
{
  eventType: 'INSERT',
  table: 'orders',
  schema: 'public',
  new: {
    id: 'uuid',
    order_number: 'KG-20251005-0001',
    customer_id: 'uuid',
    branch_id: 'uuid',
    status: 'NEW',
    type: 'delivery',
    total: 52.00,
    created_at: '2025-10-05T14:30:00Z'
  }
}
```

### Implementation

```typescript
function subscribeToNewOrders(branchId: string) {
  const channel = supabase
    .channel(`branch:${branchId}:orders`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `branch_id=eq.${branchId}`
      },
      async (payload) => {
        const order = payload.new
        
        // Play notification sound
        const audio = new Audio('/sounds/new-order.mp3')
        audio.play()
        
        // Show desktop notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Yeni Sipariş', {
            body: `${order.order_number} - ${order.total} TL`,
            icon: '/icons/icon-192.png',
            tag: order.id,
            requireInteraction: true
          })
        }
        
        // Fetch full order details
        const { data: fullOrder } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              product:products (name, price)
            ),
            customer:users (name, phone)
          `)
          .eq('id', order.id)
          .single()
        
        // Add to order list
        addOrderToList(fullOrder)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

---

## User Notifications Channel

### Channel Name

```
user:{user_id}:notifications
```

### Subscribers

- **User:** The specific user

### Events

#### Event: NEW_NOTIFICATION

```typescript
{
  eventType: 'INSERT',
  table: 'notifications',
  schema: 'public',
  new: {
    id: 'uuid',
    user_id: 'uuid',
    type: 'ORDER_CONFIRMED',
    title: 'Sipariş Onaylandı',
    body: 'KG-20251005-0001 numaralı siparişiniz onaylandı',
    data: {
      order_id: 'uuid',
      order_number: 'KG-20251005-0001'
    },
    is_read: false,
    created_at: '2025-10-05T14:31:00Z'
  }
}
```

### Implementation

```typescript
function subscribeToNotifications(userId: string) {
  const channel = supabase
    .channel(`user:${userId}:notifications`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const notification = payload.new
        
        // Update notification bell badge
        incrementNotificationBadge()
        
        // Show toast notification
        showToast({
          title: notification.title,
          description: notification.body,
          onClick: () => {
            if (notification.data?.order_id) {
              router.push(`/orders/${notification.data.order_id}`)
            }
          }
        })
        
        // Add to notification list
        addNotification(notification)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

---

## Presence Channel (Online Couriers)

### Channel Name

```
platform:couriers:online
```

### Subscribers

- **Admin:** Platform administrators
- **Vendor:** For viewing available couriers
- **Dispatcher:** Courier management

### Implementation

```typescript
function subscribeToCourierPresence() {
  const channel = supabase
    .channel('platform:couriers:online', {
      config: {
        presence: {
          key: userId
        }
      }
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const onlineCouriers = Object.values(state).flat()
      
      updateOnlineCouriers(onlineCouriers)
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('Courier joined:', newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('Courier left:', leftPresences)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track this courier as online
        await channel.track({
          courier_id: courierId,
          name: courierName,
          vehicle_type: 'motorcycle',
          current_location: { lat: 40.4093, lng: 49.8671 },
          available: true
        })
      }
    })

  return () => {
    supabase.removeChannel(channel)
  }
}
```

---

## Performance Considerations

### Connection Pooling

```typescript
// Reuse channels when possible
const channelCache = new Map<string, RealtimeChannel>()

function getOrCreateChannel(channelName: string) {
  if (channelCache.has(channelName)) {
    return channelCache.get(channelName)!
  }

  const channel = supabase.channel(channelName)
  channelCache.set(channelName, channel)
  
  return channel
}
```

### Rate Limiting

```typescript
import { RateLimiter } from 'limiter'

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'second'
})

channel.on('postgres_changes', {}, async (payload) => {
  const allowed = await limiter.removeTokens(1)
  
  if (!allowed) {
    console.warn('Rate limit exceeded, dropping event')
    return
  }
  
  handleUpdate(payload)
})
```

### Batch Updates

```typescript
// Batch location updates instead of updating on every event
let updateBuffer: any[] = []
let updateTimeout: NodeJS.Timeout | null = null

channel.on('postgres_changes', {}, (payload) => {
  updateBuffer.push(payload.new)
  
  if (updateTimeout) {
    clearTimeout(updateTimeout)
  }
  
  updateTimeout = setTimeout(() => {
    // Process all buffered updates
    processBatchUpdates(updateBuffer)
    updateBuffer = []
  }, 1000) // Batch every 1 second
})
```

---

## Error Handling

### Reconnection Logic

```typescript
function createResilientChannel(channelName: string, config: any) {
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5

  function connect() {
    const channel = supabase.channel(channelName, config)
    
    channel
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Channel error:', error)
          
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
            
            console.log(`Reconnecting in ${delay}ms...`)
            
            setTimeout(() => {
              supabase.removeChannel(channel)
              connect()
            }, delay)
          }
        } else if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0
          console.log('Channel connected')
        }
      })

    return channel
  }

  return connect()
}
```

---

## Security

### Row Level Security

All realtime subscriptions automatically respect RLS policies:

```sql
-- Example: Users can only subscribe to their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM vendors v
      JOIN branches b ON b.vendor_id = v.id
      WHERE b.id = orders.branch_id
      AND v.owner_user_id = auth.uid()
    )
  );
```

### Authorization Checks

```typescript
// Always verify user has permission to subscribe
async function subscribeTo Order(orderId: string) {
  // Check if user has access to this order
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single()

  if (!order) {
    throw new Error('Unauthorized or order not found')
  }

  // Proceed with subscription
  const channel = supabase.channel(`order:${orderId}`)
  // ...
}
```

---

## Testing

### Unit Tests

```typescript
describe('Realtime Subscriptions', () => {
  it('should receive order status updates', (done) => {
    const channel = supabase
      .channel(`order:${testOrderId}`)
      .on('postgres_changes', {}, (payload) => {
        expect(payload.new.status).toBe('CONFIRMED')
        done()
      })
      .subscribe()

    // Trigger update
    setTimeout(() => {
      supabase
        .from('orders')
        .update({ status: 'CONFIRMED' })
        .eq('id', testOrderId)
    }, 1000)
  })
})
```

---

## Related Documentation

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [FR-004: Real-time Order Tracking](../spec.md#fr-004)
- [FR-005: Courier Location Sharing](../spec.md#fr-005)

---

## Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-05 | Initial draft | AI Assistant |
