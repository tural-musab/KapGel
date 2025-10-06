# API Contract: Notifications System

**Version:** 1.0  
**Last Updated:** 2025-10-05  
**Status:** Draft  
**Related Specs:** FR-010

---

## Overview

This document specifies the API contract for the notifications system in the KapGel platform, including Web Push, in-app notifications, and notification preferences management.

---

## Notification Types

| Type | Recipients | Trigger | Priority |
|------|-----------|---------|----------|
| `ORDER_PLACED` | Vendor | New order created | HIGH |
| `ORDER_CONFIRMED` | Customer | Vendor confirms order | MEDIUM |
| `ORDER_PREPARING` | Customer | Order preparation started | LOW |
| `ORDER_READY` | Customer, Courier | Order ready for pickup | HIGH |
| `ORDER_PICKED_UP` | Customer | Courier picked up order | MEDIUM |
| `ORDER_ON_ROUTE` | Customer | Courier started delivery | MEDIUM |
| `ORDER_DELIVERED` | Customer, Vendor | Order delivered | HIGH |
| `ORDER_CANCELED` | Customer, Vendor, Courier | Order canceled | HIGH |
| `COURIER_ASSIGNED` | Courier | New delivery assigned | HIGH |
| `COURIER_NEAR` | Customer | Courier approaching (500m) | MEDIUM |
| `PAYMENT_DUE` | Vendor | Payment cycle | MEDIUM |

---

## Endpoint: Subscribe to Web Push

### Route

```
POST /api/notifications/subscribe
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles

### Request Body

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BEl62...",
      "auth": "16ByteString"
    }
  },
  "device_info": {
    "type": "mobile" | "desktop",
    "os": "iOS" | "Android" | "Windows" | "macOS",
    "browser": "Chrome" | "Firefox" | "Safari"
  }
}
```

### Response: Success (201 Created)

```json
{
  "subscription_id": "uuid",
  "user_id": "uuid",
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "created_at": "2025-10-05T14:30:00Z"
}
```

---

## Endpoint: Unsubscribe from Web Push

### Route

```
DELETE /api/notifications/subscribe
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles

### Request Body

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

### Response: Success (200 OK)

```json
{
  "message": "Unsubscribed successfully",
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

---

## Endpoint: Get User Notifications

### Route

```
GET /api/notifications
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `is_read` | boolean | - | Filter by read status |
| `type` | string | - | Filter by notification type |
| `from_date` | ISO8601 | - | Filter from date |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

### Response: Success (200 OK)

```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "ORDER_PLACED",
      "title": "Yeni Sipariş",
      "body": "KG-20251005-0001 numaralı yeni sipariş geldi",
      "data": {
        "order_id": "uuid",
        "order_number": "KG-20251005-0001",
        "customer_name": "Müşteri Adı"
      },
      "is_read": false,
      "created_at": "2025-10-05T14:30:00Z",
      "read_at": null
    }
  ],
  "unread_count": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_pages": 1,
    "total_count": 15
  }
}
```

---

## Endpoint: Mark Notification as Read

### Route

```
PUT /api/notifications/{notification_id}/read
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles
- **Ownership:** Notification must belong to the user

### Response: Success (200 OK)

```json
{
  "notification_id": "uuid",
  "is_read": true,
  "read_at": "2025-10-05T14:35:00Z"
}
```

---

## Endpoint: Mark All as Read

### Route

```
PUT /api/notifications/read-all
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles

### Response: Success (200 OK)

```json
{
  "updated_count": 5,
  "read_at": "2025-10-05T14:35:00Z"
}
```

---

## Endpoint: Get Notification Preferences

### Route

```
GET /api/notifications/preferences
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles

### Response: Success (200 OK)

```json
{
  "user_id": "uuid",
  "preferences": {
    "push_enabled": true,
    "email_enabled": false,
    "sms_enabled": false,
    "notification_types": {
      "ORDER_PLACED": {
        "push": true,
        "email": false,
        "sms": false
      },
      "ORDER_CONFIRMED": {
        "push": true,
        "email": false,
        "sms": false
      },
      "ORDER_DELIVERED": {
        "push": true,
        "email": true,
        "sms": true
      }
    },
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

---

## Endpoint: Update Notification Preferences

### Route

```
PUT /api/notifications/preferences
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles

### Request Body

```json
{
  "push_enabled": true,
  "email_enabled": false,
  "notification_types": {
    "ORDER_PLACED": {
      "push": true,
      "email": false
    }
  },
  "quiet_hours": {
    "enabled": true,
    "start": "23:00",
    "end": "07:00"
  }
}
```

### Response: Success (200 OK)

```json
{
  "user_id": "uuid",
  "preferences": {
    "push_enabled": true,
    "email_enabled": false
  },
  "updated_at": "2025-10-05T15:00:00Z"
}
```

---

## Web Push Payload Format

### Standard Notification

```json
{
  "notification": {
    "title": "Yeni Sipariş",
    "body": "KG-20251005-0001 numaralı yeni sipariş geldi",
    "icon": "/icons/icon-192.png",
    "badge": "/icons/badge-96.png",
    "image": "/images/order-notification.png",
    "vibrate": [200, 100, 200],
    "tag": "order-uuid",
    "requireInteraction": true,
    "data": {
      "type": "ORDER_PLACED",
      "order_id": "uuid",
      "url": "/vendor/orders/uuid"
    },
    "actions": [
      {
        "action": "view",
        "title": "Görüntüle"
      },
      {
        "action": "accept",
        "title": "Kabul Et"
      },
      {
        "action": "reject",
        "title": "Reddet"
      }
    ]
  }
}
```

---

## Server-Side Implementation

### Sending Web Push Notification

```typescript
// src/lib/notifications/web-push.ts
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:support@kapgel.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendWebPushNotification(
  userId: string,
  notification: {
    title: string
    body: string
    data?: any
  }
) {
  // Get user's push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0 }
  }

  const payload = JSON.stringify({
    notification: {
      title: notification.title,
      body: notification.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: notification.data
    }
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payload
        )
        return { success: true }
      } catch (error: any) {
        // Handle expired subscriptions
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id)
        }
        throw error
      }
    })
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length

  return { sent, total: subscriptions.length }
}
```

### Trigger Notification on Order Event

```typescript
// src/app/api/orders/route.ts
import { sendWebPushNotification } from '@/lib/notifications/web-push'
import { createNotification } from '@/lib/notifications/db'

export async function POST(req: NextRequest) {
  // ... order creation logic ...

  // Create in-app notification
  await createNotification({
    user_id: vendorUserId,
    type: 'ORDER_PLACED',
    title: 'Yeni Sipariş',
    body: `${orderNumber} numaralı yeni sipariş geldi`,
    data: {
      order_id: order.id,
      order_number: orderNumber
    }
  })

  // Send Web Push
  await sendWebPushNotification(vendorUserId, {
    title: 'Yeni Sipariş',
    body: `${orderNumber} numaralı yeni sipariş geldi`,
    data: {
      type: 'ORDER_PLACED',
      order_id: order.id,
      url: `/vendor/orders/${order.id}`
    }
  })

  return NextResponse.json(order)
}
```

---

## Client-Side Implementation

### Service Worker (Push Event)

```typescript
// workers/service-worker.ts
self.addEventListener('push', (event: any) => {
  if (!event.data) return

  const data = event.data.json()
  const { notification } = data

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: notification.data,
      actions: notification.actions,
      tag: notification.tag,
      requireInteraction: notification.requireInteraction
    })
  )
})

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()

  const data = event.notification.data
  const url = data.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
```

### React Hook for Notifications

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Fetch initial notifications
    fetchNotifications()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
          setUnreadCount((prev) => prev + 1)
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.new.title, {
              body: payload.new.body,
              icon: '/icons/icon-192.png'
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT'
    })
    
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return {
    notifications,
    unreadCount,
    markAsRead
  }
}
```

---

## Database Schema

### Table: notifications

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type text NOT NULL CHECK (type IN (
    'ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_PREPARING',
    'ORDER_READY', 'ORDER_PICKED_UP', 'ORDER_ON_ROUTE',
    'ORDER_DELIVERED', 'ORDER_CANCELED', 'COURIER_ASSIGNED',
    'COURIER_NEAR', 'PAYMENT_DUE'
  )),
  
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  
  is_read boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
```

### Table: push_subscriptions

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  endpoint text NOT NULL UNIQUE,
  keys jsonb NOT NULL,
  
  device_type text CHECK (device_type IN ('mobile', 'desktop')),
  device_os text,
  device_browser text,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_is_active ON push_subscriptions(is_active);
```

---

## Testing

### Unit Tests

```typescript
describe('Notifications API', () => {
  it('should send web push notification', async () => {
    const result = await sendWebPushNotification(testUserId, {
      title: 'Test Notification',
      body: 'Test Body'
    })

    expect(result.sent).toBeGreaterThan(0)
  })

  it('should create in-app notification', async () => {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        user_id: testUserId,
        type: 'ORDER_PLACED',
        title: 'New Order',
        body: 'Order #123'
      })
    })

    expect(response.status).toBe(201)
  })
})
```

---

## Related Documentation

- [Orders API](./orders-api.md)
- [Web Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [FR-010: Push Notifications](../spec.md#fr-010)

---

## Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-05 | Initial draft | AI Assistant |
