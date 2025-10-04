# Orders API Contract (Phase 1-lite Draft)

## Overview
Minimal specification covering customer order creation, retrieval, and lifecycle transitions. Authenticated users interact via Supabase JWT (Next.js server routes). All responses JSON.

## Endpoints

### `POST /api/orders`
- **Auth**: `customer`
- **Purpose**: Create a delivery order with line items.
- **Body**:
  ```json
  {
    "branchId": "uuid",
    "addressText": "string",
    "paymentMethod": "cash" | "pickup_card",
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "price": 0,
        "quantity": 1
      }
    ]
  }
  ```
- **Response 201**:
  ```json
  {
    "id": "uuid",
    "status": "pending",
    "total": 0,
    "branchId": "uuid",
    "customerId": "uuid",
    "createdAt": "2025-01-01T10:00:00Z"
  }
  ```
- **Errors**: `400` invalid payload, `401` unauthenticated, `422` inventory/branch closed, `500` Supabase RPC failure.
- **RLS Expectations**: Customer can only create orders for own `customer_id` derived from JWT; price totals computed server-side.

### `GET /api/orders/{id}`
- **Auth**: `customer`, `vendor_admin`, `courier`, `admin`
- **Purpose**: Retrieve order details with tracking metadata.
- **Response 200**:
  ```json
  {
    "id": "uuid",
    "status": "pending|preparing|ready|en_route|delivered|cancelled",
    "customerId": "uuid",
    "branchId": "uuid",
    "courierId": "uuid|null",
    "items": [
      {
        "id": "uuid",
        "name": "string",
        "qty": 1,
        "unitPrice": 0
      }
    ],
    "events": [
      {
        "status": "preparing",
        "actor": "system|vendor|courier",
        "timestamp": "2025-01-01T10:15:00Z"
      }
    ]
  }
  ```
- **Errors**: `403` access denied, `404` unknown order.
- **RLS Expectations**:
  - Customers: own orders.
  - Vendors: orders where `vendor_id` in JWT vendor list.
  - Couriers: assigned orders.
  - Admin: full.

### `POST /api/orders/{id}/transition`
- **Auth**: `vendor_admin` or `courier` depending on transition, `admin` (all transitions).
- **Purpose**: Advance order state using guard checks.
- **Body**:
  ```json
  {
    "targetStatus": "preparing|ready|en_route|delivered|cancelled",
    "metadata": {
      "note": "optional string"
    }
  }
  ```
- **Response 200**:
  ```json
  {
    "id": "uuid",
    "status": "ready",
    "previousStatus": "preparing",
    "updatedAt": "2025-01-01T10:30:00Z"
  }
  ```
- **Errors**: `409` invalid transition, `403` unauthorized actor, `500` state machine failure.
- **Validation**:
  - Status progression enforced against enum graph defined in `db/schema.sql`.
  - Vendor can move `pending→preparing→ready`.
  - Courier can move `ready→en_route→delivered`.
  - Cancel requires vendor or admin with justification.

## Non-functional Notes
- **Telemetry**: Emit `order_transition` event with actor, old/new status.
- **Rate Limits**: max 5 create attempts/minute per customer (future).
- **Open Questions**: Delivery fee calculation, promo codes (flag in backlog).
