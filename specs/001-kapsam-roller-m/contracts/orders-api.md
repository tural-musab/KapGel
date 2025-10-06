# API Contract: Orders Management

**Version:** 1.0  
**Last Updated:** 2025-10-05  
**Status:** Draft  
**Related Specs:** FR-001, FR-002, FR-003, FR-007

---

## Overview

This document specifies the API contract for order creation, retrieval, and state management in the KapGel platform. The order lifecycle follows a strict state machine pattern with role-based transition permissions.

---

## Order State Machine

```
┌─────┐
│ NEW │
└──┬──┘
   │
   ├──→ CONFIRMED (vendor accepts)
   │
   ├──→ REJECTED (vendor rejects)
   │
   ├──→ CANCELED_BY_USER (customer cancels before CONFIRMED)
   │
   ↓
┌────────────┐
│ CONFIRMED  │
└──┬─────────┘
   │
   ├──→ PREPARING (vendor starts preparing)
   │
   ├──→ CANCELED_BY_VENDOR (vendor cancels)
   │
   ↓
┌──────────┐
│ PREPARING│
└──┬───────┘
   │
   ├──→ READY (food ready for pickup)
   │
   ├──→ CANCELED_BY_VENDOR
   │
   ↓
┌───────┐
│ READY │
└──┬────┘
   │
   ├──→ PICKED_UP (courier collected)
   │
   ↓
┌───────────┐
│ PICKED_UP │
└──┬────────┘
   │
   ├──→ ON_ROUTE (courier departed)
   │
   ↓
┌──────────┐
│ ON_ROUTE │
└──┬───────┘
   │
   ├──→ DELIVERED (successful delivery)
   │
   ↓
┌───────────┐
│ DELIVERED │
└───────────┘
```

---

## Endpoint: Create Order

### Route

```
POST /api/orders
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `customer`

### Request Headers

```
Authorization: Bearer {supabase_session_token}
Content-Type: application/json
```

### Request Body

```json
{
  "branch_id": "uuid",
  "type": "delivery" | "pickup",
  "items": [
    {
      "product_id": "uuid",
      "quantity": number,
      "notes": "string (optional)"
    }
  ],
  "delivery_address": {
    "text": "string (required if type=delivery)",
    "lat": number,
    "lng": number,
    "district_id": "uuid"
  },
  "payment_method": "cash" | "card_on_delivery",
  "notes": "string (optional)",
  "scheduled_for": "ISO8601 datetime (optional)"
}
```

### Validation Rules

1. **Branch Validation:**
   - `branch_id` must exist and be active
   - Branch must be open (check `business_hours`)

2. **Delivery Zone Validation:**
   - If `type = "delivery"`, customer address must be within branch's `delivery_zone_geojson`
   - Use PostGIS `ST_Within` function

3. **Product Validation:**
   - All `product_id`s must exist and belong to the specified branch
   - Products must be available (`is_available = true`)

4. **Order Total:**
   - Calculate `subtotal` from product prices
   - Apply delivery fee if applicable
   - Minimum order value check

### Response: Success (201 Created)

```json
{
  "order_id": "uuid",
  "order_number": "KG-20251005-0001",
  "status": "NEW",
  "type": "delivery",
  "branch": {
    "id": "uuid",
    "name": "Restoran Adı",
    "address": "string",
    "phone": "string"
  },
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "name_snapshot": "Ürün Adı",
      "unit_price": 25.00,
      "quantity": 2,
      "subtotal": 50.00
    }
  ],
  "subtotal": 50.00,
  "delivery_fee": 5.00,
  "total": 55.00,
  "payment_method": "cash",
  "estimated_delivery_time": 30,
  "created_at": "2025-10-05T14:30:00.123Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "branch_id": ["Branch is closed"],
    "items": ["Product not available: Pizza Margherita"]
  }
}
```

#### 403 Forbidden
```json
{
  "error": "Address outside delivery zone",
  "code": "OUTSIDE_DELIVERY_ZONE",
  "details": "The selected address is not within the restaurant's delivery area"
}
```

#### 422 Unprocessable Entity
```json
{
  "error": "Minimum order value not met",
  "code": "MINIMUM_ORDER_VALUE",
  "details": "Minimum order is 30.00 TL, current total is 25.00 TL"
}
```

---

## Endpoint: Get Order Details

### Route

```
GET /api/orders/{order_id}
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `customer`, `vendor_admin`, `courier`, `admin`

### Authorization Rules

- **Customer:** Can only view own orders (`customer_id = auth.uid()`)
- **Vendor:** Can view orders for their branches
- **Courier:** Can view assigned orders
- **Admin:** Can view all orders

### Response: Success (200 OK)

```json
{
  "order_id": "uuid",
  "order_number": "KG-20251005-0001",
  "status": "ON_ROUTE",
  "type": "delivery",
  "customer": {
    "id": "uuid",
    "name": "Müşteri Adı",
    "phone": "0501234567"
  },
  "branch": {
    "id": "uuid",
    "name": "Restoran Adı",
    "address": "string",
    "phone": "string",
    "geo_point": {"lat": 40.4093, "lng": 49.8671}
  },
  "courier": {
    "id": "uuid",
    "name": "Kurye Adı",
    "phone": "0501234567",
    "vehicle_type": "motorcycle",
    "current_location": {"lat": 40.4100, "lng": 49.8680}
  },
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "name_snapshot": "Pizza Margherita",
      "unit_price": 45.00,
      "quantity": 1,
      "subtotal": 45.00
    }
  ],
  "subtotal": 45.00,
  "delivery_fee": 7.00,
  "total": 52.00,
  "payment_method": "cash",
  "delivery_address": {
    "text": "Nizami küç. 28, Baku",
    "lat": 40.4093,
    "lng": 49.8671
  },
  "timeline": [
    {
      "status": "NEW",
      "timestamp": "2025-10-05T14:30:00Z",
      "actor": "Customer"
    },
    {
      "status": "CONFIRMED",
      "timestamp": "2025-10-05T14:31:00Z",
      "actor": "Vendor"
    },
    {
      "status": "PREPARING",
      "timestamp": "2025-10-05T14:32:00Z",
      "actor": "Vendor"
    },
    {
      "status": "READY",
      "timestamp": "2025-10-05T14:45:00Z",
      "actor": "Vendor"
    },
    {
      "status": "PICKED_UP",
      "timestamp": "2025-10-05T14:50:00Z",
      "actor": "Courier"
    },
    {
      "status": "ON_ROUTE",
      "timestamp": "2025-10-05T14:52:00Z",
      "actor": "Courier"
    }
  ],
  "estimated_delivery_time": 30,
  "created_at": "2025-10-05T14:30:00Z",
  "updated_at": "2025-10-05T14:52:00Z"
}
```

---

## Endpoint: Update Order Status (Transition)

### Route

```
POST /api/orders/{order_id}/transition
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** Depends on transition (see Transition Matrix below)

### Request Body

```json
{
  "new_status": "CONFIRMED" | "REJECTED" | "PREPARING" | "READY" | "PICKED_UP" | "ON_ROUTE" | "DELIVERED" | "CANCELED_BY_USER" | "CANCELED_BY_VENDOR",
  "reason": "string (required for cancellations)",
  "estimated_time": number (optional, for CONFIRMED status)
}
```

### Transition Matrix

| From Status | To Status | Allowed Roles | Conditions |
|-------------|-----------|---------------|------------|
| NEW | CONFIRMED | vendor_admin | Order not expired |
| NEW | REJECTED | vendor_admin | Within 5 minutes of creation |
| NEW | CANCELED_BY_USER | customer | Within 2 minutes of creation |
| CONFIRMED | PREPARING | vendor_admin | - |
| CONFIRMED | CANCELED_BY_VENDOR | vendor_admin | `reason` required |
| PREPARING | READY | vendor_admin | - |
| PREPARING | CANCELED_BY_VENDOR | vendor_admin | `reason` required |
| READY | PICKED_UP | courier | Courier must be assigned |
| PICKED_UP | ON_ROUTE | courier | - |
| ON_ROUTE | DELIVERED | courier | - |

### Response: Success (200 OK)

```json
{
  "order_id": "uuid",
  "old_status": "PREPARING",
  "new_status": "READY",
  "updated_at": "2025-10-05T14:45:00Z",
  "updated_by": {
    "user_id": "uuid",
    "role": "vendor_admin"
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid state transition",
  "code": "INVALID_TRANSITION",
  "details": "Cannot transition from DELIVERED to PREPARING"
}
```

#### 403 Forbidden
```json
{
  "error": "Unauthorized transition",
  "code": "UNAUTHORIZED_TRANSITION",
  "details": "Only vendors can confirm orders"
}
```

#### 422 Unprocessable Entity
```json
{
  "error": "Transition condition not met",
  "code": "CONDITION_NOT_MET",
  "details": "Cannot cancel order after it has been picked up"
}
```

---

## Endpoint: List Orders

### Route

```
GET /api/orders
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** All roles

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string[] | all | Filter by status (comma-separated) |
| `type` | string | all | Filter by type: `delivery`, `pickup` |
| `branch_id` | uuid | - | Filter by branch (vendor-only) |
| `courier_id` | uuid | - | Filter by courier (admin-only) |
| `from_date` | ISO8601 | - | Filter from date |
| `to_date` | ISO8601 | - | Filter to date |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort` | string | created_at | Sort field: `created_at`, `total`, `status` |
| `order` | string | desc | Sort order: `asc`, `desc` |

### Response: Success (200 OK)

```json
{
  "orders": [
    {
      "order_id": "uuid",
      "order_number": "KG-20251005-0001",
      "status": "DELIVERED",
      "type": "delivery",
      "branch_name": "Restoran Adı",
      "customer_name": "Müşteri Adı",
      "total": 52.00,
      "created_at": "2025-10-05T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_pages": 5,
    "total_count": 95
  }
}
```

---

## Real-time Subscriptions

### Subscribe to Order Updates

```typescript
import { supabase } from '@/lib/supabase'

function subscribeToOrder(orderId: string, onUpdate: (order: any) => void) {
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
        onUpdate(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

### Subscribe to All Branch Orders (Vendor)

```typescript
function subscribeTobranchOrders(branchId: string, onUpdate: (order: any) => void) {
  const channel = supabase
    .channel(`branch:${branchId}:orders`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `branch_id=eq.${branchId}`
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          // New order notification
          onUpdate(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          // Status update
          onUpdate(payload.new)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

---

## Database Schema

### Table: orders

```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES users(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  courier_id uuid REFERENCES couriers(id),
  
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN (
    'NEW', 'CONFIRMED', 'REJECTED', 'PREPARING', 'READY',
    'PICKED_UP', 'ON_ROUTE', 'DELIVERED',
    'CANCELED_BY_USER', 'CANCELED_BY_VENDOR'
  )),
  
  type text NOT NULL CHECK (type IN ('delivery', 'pickup')),
  
  subtotal decimal(10,2) NOT NULL,
  delivery_fee decimal(10,2) DEFAULT 0,
  total decimal(10,2) NOT NULL,
  
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card_on_delivery')),
  
  delivery_address_text text,
  delivery_address_geo geography(Point),
  district_id uuid REFERENCES districts(id),
  
  notes text,
  cancellation_reason text,
  estimated_delivery_time integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  delivered_at timestamptz
);

-- Indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_courier_id ON orders(courier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_delivery_address ON orders USING GIST(delivery_address_geo);
```

### Table: order_items

```sql
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  
  name_snapshot text NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal decimal(10,2) NOT NULL,
  
  notes text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

---

## Testing

### Unit Tests

```typescript
describe('Order Creation', () => {
  it('should create order with valid data', async () => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branch_id: testBranchId,
        type: 'delivery',
        items: [
          { product_id: testProductId, quantity: 2 }
        ],
        delivery_address: {
          text: 'Test Address',
          lat: 40.4093,
          lng: 49.8671
        },
        payment_method: 'cash'
      })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.status).toBe('NEW')
    expect(data.total).toBeGreaterThan(0)
  })

  it('should reject order outside delivery zone', async () => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        branch_id: testBranchId,
        type: 'delivery',
        items: [{ product_id: testProductId, quantity: 1 }],
        delivery_address: {
          lat: 41.0000, // Outside zone
          lng: 50.0000
        }
      })
    })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.code).toBe('OUTSIDE_DELIVERY_ZONE')
  })
})
```

---

## Related Documentation

- [Courier Location API](./courier-location-api.md)
- [Vendor API](./vendor-api.md)
- [Notifications API](./notifications-api.md)
- [FR-001: Customer Order Flow](../spec.md#fr-001)
- [FR-007: Order State Management](../spec.md#fr-007)

---

## Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-05 | Initial draft | AI Assistant |
