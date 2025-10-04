# Courier API Contract (Phase 1-lite Draft)

## Overview
Defines endpoints for courier shift lifecycle, live location reporting, and task pickup. All routes require authenticated courier JWT unless noted.

## Endpoints

### `POST /api/courier/shifts`
- **Auth**: `courier`
- **Purpose**: Open or close a courier shift.
- **Body**:
  ```json
  {
    "action": "start" | "end",
    "vehicle": "bike" | "car" | "scooter" | "on_foot",
    "startingZoneId": "uuid"
  }
  ```
- **Response 200**:
  ```json
  {
    "shiftId": "uuid",
    "status": "active|ended",
    "startedAt": "2025-01-01T08:00:00Z",
    "endedAt": "2025-01-01T14:00:00Z|null"
  }
  ```
- **Errors**: `409` active shift already exists, `400` invalid zone, `500` insert failure.
- **RLS**: Courier can only mutate rows where `courier_id` equals JWT claim.

### `POST /api/courier/location`
- **Auth**: `courier`
- **Purpose**: Upsert latest location ping (15s cadence).
- **Body**:
  ```json
  {
    "lat": 0,
    "lng": 0,
    "accuracy": 5,
    "heading": 120,
    "speed": 8,
    "trackedOrderId": "uuid|null"
  }
  ```
- **Response 202**:
  ```json
  { "status": "accepted" }
  ```
- **Errors**: `400` invalid coordinates, `401` not signed in, `413` payload too large.
- **RLS**: Courier updates row keyed by `courier_id`; insert allowed when courier has active shift.
- **Notes**: Triggers PostGIS point update + realtime broadcast on `courier_locations` channel.

### `POST /api/courier/tasks/{orderId}/accept`
- **Auth**: `courier`
- **Purpose**: Claim an available delivery job.
- **Response 200**:
  ```json
  {
    "orderId": "uuid",
    "status": "en_route",
    "courierId": "uuid"
  }
  ```
- **Errors**: `409` already assigned, `403` courier not eligible (no shift or wrong zone).
- **RLS**: Update allowed only when `courier_id` matches JWT and order status in `ready`.

### `POST /api/courier/tasks/{orderId}/handoff`
- **Auth**: `courier`
- **Purpose**: Mark delivery completed with optional proof.
- **Body**:
  ```json
  {
    "signatureUrl": "https://...",
    "dropoffNote": "left with concierge"
  }
  ```
- **Response 200** same envelope as transition endpoint (reuse order transition handler with courier guard).

## Non-functional Notes
- Location payload limited to 120/min per courier; future throttling with Supabase edge.
- Telemetry events: `courier_shift_started`, `courier_location_ping`, `courier_task_claimed`.
- MapLibre integration consumes `courier_locations` realtime channel with filtered courier ID.
