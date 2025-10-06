# API Contract: Vendor Management

**Version:** 1.0  
**Last Updated:** 2025-10-05  
**Status:** Draft  
**Related Specs:** FR-006, FR-011

---

## Overview

This document specifies the API contract for vendor operations including menu management, order processing, and courier assignment in the KapGel platform.

---

## Endpoint: Get Vendor Dashboard Stats

### Route

```
GET /api/vendor/dashboard/stats
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `branch_id` | uuid | - | Specific branch (optional, defaults to all branches) |
| `period` | string | today | Time period: `today`, `week`, `month` |

### Response: Success (200 OK)

```json
{
  "period": "today",
  "stats": {
    "total_orders": 45,
    "active_orders": 12,
    "completed_orders": 30,
    "canceled_orders": 3,
    "revenue": 1250.50,
    "average_order_value": 27.79,
    "average_preparation_time": 18
  },
  "status_breakdown": {
    "NEW": 3,
    "CONFIRMED": 2,
    "PREPARING": 5,
    "READY": 2,
    "PICKED_UP": 1,
    "ON_ROUTE": 2
  },
  "hourly_orders": [
    {"hour": "09:00", "count": 2},
    {"hour": "10:00", "count": 5},
    {"hour": "11:00", "count": 8}
  ],
  "top_products": [
    {
      "product_id": "uuid",
      "name": "Pizza Margherita",
      "orders_count": 15,
      "revenue": 675.00
    }
  ]
}
```

---

## Endpoint: List Products (Menu)

### Route

```
GET /api/vendor/products
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `branch_id` | uuid | - | Filter by branch |
| `category_id` | uuid | - | Filter by category |
| `is_available` | boolean | - | Filter by availability |
| `search` | string | - | Search by name |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |

### Response: Success (200 OK)

```json
{
  "products": [
    {
      "id": "uuid",
      "vendor_id": "uuid",
      "category_id": "uuid",
      "category_name": "Pizza",
      "name": "Pizza Margherita",
      "description": "Classic Italian pizza with tomato and mozzarella",
      "price": 45.00,
      "image_url": "https://storage.example.com/pizza.jpg",
      "is_available": true,
      "preparation_time": 20,
      "inventory_count": 50,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-10-05T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_pages": 3,
    "total_count": 125
  }
}
```

---

## Endpoint: Create Product

### Route

```
POST /api/vendor/products
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`

### Request Body

```json
{
  "category_id": "uuid",
  "name": "Pizza Margherita",
  "description": "Classic Italian pizza with tomato and mozzarella",
  "price": 45.00,
  "image_url": "https://storage.example.com/pizza.jpg",
  "preparation_time": 20,
  "is_available": true,
  "inventory_count": 50
}
```

### Validation Rules

1. **Category Validation:**
   - `category_id` must exist and belong to the vendor
   
2. **Price Validation:**
   - `price` must be greater than 0
   - Maximum 2 decimal places

3. **Name Validation:**
   - `name` must be unique within the vendor's menu
   - Minimum 3 characters, maximum 100 characters

### Response: Success (201 Created)

```json
{
  "id": "uuid",
  "vendor_id": "uuid",
  "category_id": "uuid",
  "name": "Pizza Margherita",
  "description": "Classic Italian pizza with tomato and mozzarella",
  "price": 45.00,
  "image_url": "https://storage.example.com/pizza.jpg",
  "is_available": true,
  "preparation_time": 20,
  "inventory_count": 50,
  "created_at": "2025-10-05T14:30:00Z",
  "updated_at": "2025-10-05T14:30:00Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": ["Product name already exists"],
    "price": ["Price must be greater than 0"]
  }
}
```

---

## Endpoint: Update Product

### Route

```
PUT /api/vendor/products/{product_id}
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`
- **Ownership:** Product must belong to the vendor

### Request Body

```json
{
  "name": "Pizza Margherita (Updated)",
  "description": "New description",
  "price": 47.00,
  "is_available": false,
  "preparation_time": 25,
  "inventory_count": 30
}
```

### Response: Success (200 OK)

```json
{
  "id": "uuid",
  "name": "Pizza Margherita (Updated)",
  "price": 47.00,
  "is_available": false,
  "updated_at": "2025-10-05T15:00:00Z"
}
```

---

## Endpoint: Delete Product

### Route

```
DELETE /api/vendor/products/{product_id}
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`
- **Ownership:** Product must belong to the vendor

### Business Rules

- Cannot delete if product has pending orders
- Soft delete (sets `deleted_at` timestamp)

### Response: Success (200 OK)

```json
{
  "message": "Product deleted successfully",
  "product_id": "uuid",
  "deleted_at": "2025-10-05T15:30:00Z"
}
```

### Error Responses

#### 409 Conflict
```json
{
  "error": "Cannot delete product with active orders",
  "code": "ACTIVE_ORDERS_EXIST",
  "details": "Product has 3 pending orders"
}
```

---

## Endpoint: Bulk Update Product Availability

### Route

```
POST /api/vendor/products/bulk-availability
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`

### Request Body

```json
{
  "product_ids": ["uuid1", "uuid2", "uuid3"],
  "is_available": false
}
```

### Response: Success (200 OK)

```json
{
  "updated_count": 3,
  "products": [
    {
      "id": "uuid1",
      "name": "Pizza Margherita",
      "is_available": false
    }
  ]
}
```

---

## Endpoint: Assign Courier to Order

### Route

```
POST /api/vendor/orders/{order_id}/assign-courier
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`

### Request Body

```json
{
  "courier_id": "uuid"
}
```

### Validation Rules

1. **Order Validation:**
   - Order must belong to vendor's branch
   - Order status must be `READY`
   
2. **Courier Validation:**
   - Courier must belong to the vendor
   - Courier must be `online` (shift_status)
   - Courier must not have active delivery

### Response: Success (200 OK)

```json
{
  "order_id": "uuid",
  "courier_id": "uuid",
  "courier_name": "Kurye Adı",
  "assigned_at": "2025-10-05T14:50:00Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid order status",
  "code": "INVALID_STATUS",
  "details": "Order must be in READY status to assign courier"
}
```

#### 409 Conflict
```json
{
  "error": "Courier unavailable",
  "code": "COURIER_UNAVAILABLE",
  "details": "Courier is currently on another delivery"
}
```

---

## Endpoint: Get Available Couriers

### Route

```
GET /api/vendor/couriers/available
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `branch_id` | uuid | - | Filter by branch proximity |
| `vehicle_type` | string | - | Filter by vehicle: `motorcycle`, `bicycle`, `car` |

### Response: Success (200 OK)

```json
{
  "couriers": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Kurye Adı",
      "phone": "0501234567",
      "vehicle_type": "motorcycle",
      "shift_status": "online",
      "current_location": {
        "lat": 40.4093,
        "lng": 49.8671
      },
      "active_delivery": null,
      "completed_deliveries_today": 8,
      "average_rating": 4.7
    }
  ],
  "total_count": 5
}
```

---

## Endpoint: Update Business Hours

### Route

```
PUT /api/vendor/branches/{branch_id}/business-hours
```

### Authentication

- **Required:** Valid Supabase session
- **Role:** `vendor_admin`
- **Ownership:** Branch must belong to the vendor

### Request Body

```json
{
  "business_hours": {
    "monday": {"open": "09:00", "close": "22:00", "is_closed": false},
    "tuesday": {"open": "09:00", "close": "22:00", "is_closed": false},
    "wednesday": {"open": "09:00", "close": "22:00", "is_closed": false},
    "thursday": {"open": "09:00", "close": "22:00", "is_closed": false},
    "friday": {"open": "09:00", "close": "23:00", "is_closed": false},
    "saturday": {"open": "10:00", "close": "23:00", "is_closed": false},
    "sunday": {"open": "10:00", "close": "22:00", "is_closed": false}
  }
}
```

### Response: Success (200 OK)

```json
{
  "branch_id": "uuid",
  "business_hours": {
    "monday": {"open": "09:00", "close": "22:00", "is_closed": false}
  },
  "updated_at": "2025-10-05T16:00:00Z"
}
```

---

## Real-time Subscriptions

### Subscribe to New Orders

```typescript
import { supabase } from '@/lib/supabase'

function subscribeToNewOrders(branchId: string, onNewOrder: (order: any) => void) {
  const channel = supabase
    .channel(`branch:${branchId}:new-orders`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `branch_id=eq.${branchId}`
      },
      (payload) => {
        // Play notification sound
        const audio = new Audio('/sounds/new-order.mp3')
        audio.play()
        
        onNewOrder(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

### Subscribe to Order Status Changes

```typescript
function subscribeToOrderUpdates(orderId: string, onUpdate: (order: any) => void) {
  const channel = supabase
    .channel(`order:${orderId}:updates`)
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

---

## Database Schema

### Table: products

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id),
  
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price > 0),
  image_url text,
  
  is_available boolean DEFAULT true,
  preparation_time integer, -- in minutes
  inventory_count integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  UNIQUE (vendor_id, name)
);

-- Indexes
CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Vendors can manage own products
CREATE POLICY "Vendors can manage own products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE id = products.vendor_id
      AND owner_user_id = auth.uid()
    )
  );

-- Customers can view available products
CREATE POLICY "Customers can view available products"
  ON products FOR SELECT
  TO authenticated
  USING (is_available = true AND deleted_at IS NULL);
```

---

## Testing

### Unit Tests

```typescript
describe('Vendor Product Management', () => {
  it('should create product', async () => {
    const response = await fetch('/api/vendor/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vendorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category_id: testCategoryId,
        name: 'Pizza Margherita',
        price: 45.00,
        is_available: true
      })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.name).toBe('Pizza Margherita')
  })

  it('should reject duplicate product name', async () => {
    // Create first product
    await createProduct('Pizza Margherita')

    // Try to create duplicate
    const response = await fetch('/api/vendor/products', {
      method: 'POST',
      body: JSON.stringify({
        category_id: testCategoryId,
        name: 'Pizza Margherita',
        price: 45.00
      })
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.code).toBe('VALIDATION_ERROR')
  })
})
```

---

## Related Documentation

- [Orders API](./orders-api.md)
- [Courier Location API](./courier-location-api.md)
- [Notifications API](./notifications-api.md)
- [FR-006: Vendor Order Management](../spec.md#fr-006)
- [FR-011: Menu Management](../spec.md#fr-011)

---

## Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-05 | Initial draft | AI Assistant |
