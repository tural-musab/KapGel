# Vendor API Contract (Phase 1-lite Draft)

## Overview
Covers vendor admin order management, menu CRUD, and analytics feeds. Authenticated vendor admins identified via JWT vendor list (`vendor_ids`).

## Endpoints

### `GET /api/vendor/orders`
- **Auth**: `vendor_admin`
- **Purpose**: List recent orders for vendor-owned branches.
- **Query Params**: `status`, `limit` (default 20), `cursor` for pagination.
- **Response 200**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "status": "pending",
        "customerName": "string",
        "items": 3,
        "total": 0,
        "placedAt": "2025-01-01T10:00:00Z"
      }
    ],
    "nextCursor": "opaque|null"
  }
  ```
- **RLS**: Filter rows using `vendor_id` intersection with JWT vendor list.

### `PATCH /api/vendor/orders/{id}/status`
- **Auth**: `vendor_admin`
- **Purpose**: Approve, mark ready, or cancel an order.
- **Body**:
  ```json
  {
    "status": "preparing" | "ready" | "cancelled",
    "reason": "string optional"
  }
  ```
- **Response 200**: order transition summary (see Orders API).
- **Errors**: `403` not owner, `409` invalid transition.

### `GET /api/vendor/menu`
- **Auth**: `vendor_admin`
- **Purpose**: Fetch menu categories and items for dashboard management UI.
- **Response 200**:
  ```json
  {
    "categories": [
      {
        "id": "uuid",
        "name": "string",
        "items": [
          {
            "id": "uuid",
            "name": "string",
            "price": 0,
            "currency": "TRY",
            "isActive": true
          }
        ]
      }
    ]
  }
  ```

### `POST /api/vendor/menu/items`
- **Auth**: `vendor_admin`
- **Purpose**: Create a new menu item.
- **Body**:
  ```json
  {
    "categoryId": "uuid",
    "name": "string",
    "description": "string",
    "price": 0,
    "currency": "TRY",
    "isActive": true
  }
  ```
- **Response 201**: new item payload with `id`.
- **Errors**: `409` duplicate name, `422` invalid pricing.

### `PATCH /api/vendor/menu/items/{id}`
- **Auth**: `vendor_admin`
- **Purpose**: Update pricing/status of an item.
- **Body** accepts partial fields (`name`, `price`, `isActive`).
- **Response 200**: updated item.

### `DELETE /api/vendor/menu/items/{id}`
- **Auth**: `vendor_admin`
- **Purpose**: Soft-delete menu item (archive flag).
- **Response 204**.

## Non-functional Notes
- All mutations emit `menu_item_changed` events for dashboard realtime sync.
- Bulk upload endpoint deferred; tracked in backlog.
- Admin (platform) may act on any vendor by passing `X-Act-As-Vendor` header (requires explicit audit logging).
