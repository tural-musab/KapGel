# Data Model Blueprint: KapGel MVP

**Spec**: `specs/001-kapsam-roller-m/spec.md`  \
**Plan**: `specs/001-kapsam-roller-m/plan.md`  \
**Last Updated**: 2025-09-30

This document details the relational schema, lifecycle state machines, and access considerations for the KapGel order & delivery MVP. It expands upon the base schema defined in `db/schema.sql` and the security policies defined in `db/rls.sql`.

---

## 1. Entity Overview

| Domain | Entity | Purpose | Key Fields |
| --- | --- | --- | --- |
| Identity | `users` | All authenticated actors. | `role`, `phone`, `email`, `created_at` |
| Vendors | `vendors` | Legal business; ties to owner. | `tax_no`, `owner_user_id`, `verified` |
| Vendors | `branches` | Physical fulfilment location. | `vendor_id`, `address_text`, `geo_point`, `delivery_zone_geojson` |
| Vendors | `categories`, `products`, `inventories` | Menu management + stock rules per branch. | Category `sort`, product `price`, inventory `stock_policy` |
| Couriers | `couriers` | Delivery workforce assigned per vendor. | `user_id`, `vendor_id`, `shift_status`, `vehicle_type` |
| Orders | `orders` | Customer order header. | `customer_id`, `branch_id`, `courier_id`, `type`, `status`, totals |
| Orders | `order_items` | Line items snapshot for auditing. | `order_id`, `product_id`, `unit_price`, `qty` |
| Orders | `events` | Event-sourcing table for status timeline. | `order_id`, `type`, `payload_json` |
| Notifications | `notifications` | Push/email subscription registry. | `user_id`, `channel`, `token_or_addr`, `is_active` |
| Plans/Billing | `plans`, `subscriptions` | Future monetisation scaffolding. | `plan_id`, `status`, `period_start` |
| Logistics | `courier_locations` | Time-series of courier pings. | `courier_id`, `order_id`, `position`, `updated_at` |
| Geography | `cities`, `districts`, `neighborhoods` | Reference data for addresses. | `name`, foreign keys |

---

## 2. Relationships & Ownership

```
users 1---* vendors (owner_user_id)
users 1---* couriers (user_id)
vendors 1---* branches
branches 1---* inventories
branches 1---* orders
vendors 1---* categories 1---* products
orders 1---* order_items
orders 1---* events
couriers 1---* courier_locations
vendors 1---* couriers
```

- **Tenant Boundary**: Vendor-owned data (branches, products, orders, courier assignments) must never cross vendor IDs. RLS ensures each vendor admin and courier only sees rows where `vendor_id` matches their allowed scope.
- **Customer Privacy**: Customers can only read their own orders via `orders.customer_id`. Admins bypass restrictions via elevated JWT claim `role = 'admin'`.
- **Geography Reuse**: `branches.address_text` stores free-form address while `geo_point` stores the PostGIS geometry for map rendering. Normalised `cities/districts/neighborhoods` tables support search & analytics.

---

## 3. Order Lifecycle State Machine

```
NEW -> (vendor approves) -> CONFIRMED
CONFIRMED -> PREPARING -> PICKED_UP -> ON_ROUTE -> DELIVERED
CONFIRMED -> REJECTED
NEW/CONFIRMED -> CANCELED_BY_USER
CONFIRMED/PREPARING -> CANCELED_BY_VENDOR
```

- **Transitions**:
  - `NEW → CONFIRMED`: Vendor accepts order, assigns prep time.  _Actor: Vendor admin._
  - `CONFIRMED → PREPARING`: Kitchen starts prep; optional timer begins.  _Actor: Vendor admin._
  - `PREPARING → PICKED_UP`: Courier collects items.  _Actor: Courier or vendor admin._
  - `PICKED_UP → ON_ROUTE`: Courier signals departure.  _Actor: Courier._
  - `ON_ROUTE → DELIVERED`: Courier confirms drop-off; capture proof metadata.  _Actor: Courier._
  - `CONFIRMED → REJECTED`: Vendor rejects (out of stock).  _Actor: Vendor admin._
  - `NEW/CONFIRMED → CANCELED_BY_USER`: Customer cancels before prep.  _Actor: Customer._
  - `CONFIRMED/PREPARING → CANCELED_BY_VENDOR`: Vendor cancels due to operational issue.  _Actor: Vendor admin or admin._

- **Guards**:
  - Cancellation after `PICKED_UP` is disallowed via API validation.  
  - Courier transitions require an active shift (`couriers.shift_status = 'online'`).  
  - Admin override can transition any state while logging reason in `events.payload_json`.

- **Side Effects**:
  - Every transition inserts into `events` table.  
  - Notifications broadcast via Supabase trigger on `orders.status`.  
  - For delivery orders, `courier_locations` logging begins at `PICKED_UP`.

---

## 4. Access Control Matrix

| Table | Customer | Vendor Admin | Courier | Admin |
| --- | --- | --- | --- | --- |
| `orders` | R/W own rows | R/W rows for branches of their vendor | R/W rows for assigned orders | Full access |
| `order_items` | R own | R vendor branches | R assigned | Full |
| `events` | R order timeline | R vendor | R assigned | Full |
| `courier_locations` | R own order route | R vendor couriers | R own | Full |
| `products` | R public menus | R/W vendor products | R | Full |
| `notifications` | R/W own subscriptions | R own staff | R own | Full |
| `vendors`, `branches` | R vendor public fields | R/W vendor | R (read vendor contact) | Full |

- RLS must enforce the above matrix using JWT claims: `{ role, user_id, vendor_ids[] }`.  
- `vendor_ids[]` claim issued to vendor staff listing accessible vendor IDs.  
- Courier tokens include `courier_id` claim for precise filtering.

---

## 5. Derived Data & Views

- **`order_timelines_view`**: Flatten `events` rows into chronological timeline for UI consumption.  _Action_: create a materialized view refreshed on demand for analytics.
- **`active_courier_locations_view`**: Latest `courier_locations` row per courier for quick map queries.
- **`vendor_metrics_view`**: Aggregated counts (orders per status, average delivery time) updated via Supabase scheduled job.

---

## 6. Data Integrity Rules

1. **Menu Consistency**: `order_items.name_snapshot` ensures historical accuracy even if product name/price changes.
2. **Geospatial Validity**: `branches.delivery_zone_geojson` must pass GeoJSON validation; add constraint using `ST_IsValid`.
3. **Payment Modes**: For MVP only `cash` and `card_on_pickup` (POS) are enabled; reject others at API layer.
4. **Courier Availability**: Only one active courier assignment per order; enforce unique partial index on `orders (id) WHERE courier_id IS NOT NULL`.
5. **Notification Tokens**: Unique constraint on (`user_id`, `channel`, `token_or_addr`) to prevent duplicates.

---

## 7. Migration Backlog

- Add PostGIS extension migration (`CREATE EXTENSION IF NOT EXISTS postgis;`).
- Introduce `order_eta_minutes` field derived from courier routing (nullable).  _Needed for SLA dashboards._
- Add `documents` table for vendor KYC file storage (linked to Supabase Storage bucket).
- Create `service_levels` table to parameterise SLA thresholds per city.

---

## 8. Compliance & Retention

- **PII retention**: purge courier location history after 30 days; keep aggregated metrics only.  
- **GDPR**: implement soft-delete via `deleted_at` for `users` and cascade anonymisation for related orders.  
- **Audit Trail**: Keep `events` and `notifications` for 1 year for dispute resolution; archive to cold storage thereafter.

---

## 9. Open Questions

1. Should vendor analytics be real-time or nightly batch for MVP? (Impacts `vendor_metrics_view` refresh strategy.)
2. Do we need multi-vendor carts at MVP? Current schema assumes single vendor per order.
3. How will shared couriers (platform-managed) be represented? Potential join table between `couriers` and `vendors`.
4. Should `subscriptions` integrate with payment provider now or remain placeholder until monetisation phase?

---

### Implementation Checklist

- [ ] Add missing constraints and indexes identified above.  
- [ ] Author RLS policies matching access control matrix.  
- [ ] Generate ER diagram (dbml) for onboarding materials.  
- [ ] Confirm Supabase migrations include PostGIS extension.
