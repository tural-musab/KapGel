# Feature Specification: Full-Stack Order and Delivery Platform MVP

**Feature Branch**: `001-kapsam-roller-m`
**Created**: 2025-09-29
**Status**: Draft
**Input**: User description: "Kapsam: - Roller: müşteri, vendor admin, kurye, admin. - Akışlar: 1) Müşteri: menü → sepet → checkout → (teslimat|gel-al) → canlı takip. 2) Vendor: siparişi onayla → hazırlık → kurye ata → teslim edildi işaretle. 3) Kurye: vardiya aç/kapat → görev al → yola çıktı/teslim etti + konum paylaş. - Kısıtlar: - Sadece PWA (iOS/Android native yok). - MVP ödeme: kapıda veya gel-alde ödeme. - Harita/adres: MapLibre + OSM; adres arama server proxy. - Bildirim: Web Push (VAPID); iOS izin uyarısı. - Çıktılar: - Next.js 15 + TS + Tailwind + shadcn iskeleti. - Supabase şema + RLS + seed. - Vendor ve kurye panelleri ilk sürüm. - Sipariş durum makinesi ve gerçek zamanlı takip."

---

## Clarifications

### Session 2025-09-29

- Q: How should the data model support multiple cities? → A: Use a `cities > districts > neighborhoods` hierarchy. Orders will store `address_text` and a `geo_point`.
- Q: How should delivery zones be defined? → A: Each vendor branch will have a `delivery_zone_geojson` field (Polygon/MultiPolygon).
- Q: What is the courier location ping interval? → A: 15 seconds when the app is in the foreground, with a server TTL of 45 seconds. A manual "check-in" button will be used when the app is passive.
- Q: What is the fallback for Web Push notifications? → A: Email will be used for the MVP; SMS will be considered later.
- Q: How are vendors verified? → A: A manual KYC process involving `tax_no`, document uploads, and admin approval.

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

As a customer, I want to browse a vendor's menu, add items to my cart, place an order for delivery or pickup, and track my order in real-time.

As a vendor, I want to manage incoming orders, assign them to couriers, and track their status until completion.

As a courier, I want to manage my availability, accept delivery tasks, and update my status and location throughout the delivery process.

### Acceptance Scenarios

1. **Given** a customer is viewing a vendor's menu, **When** they add items to their cart and complete the checkout process, **Then** they MUST be able to place an order for either "delivery" or "pickup".
2. **Given** a customer has placed an order, **When** a vendor or courier updates the order status, **Then** the customer MUST see the status change in real-time on a live tracking page.
3. **Given** a vendor receives a new order, **When** they approve the order and assign a courier, **Then** the assigned courier MUST receive a notification for the new delivery task.
4. **Given** a courier accepts a delivery task, **When** they update their status (e.g., "On the way", "Delivered"), **Then** the order status MUST be updated in real-time for both the customer and the vendor.

### Edge Cases

- What happens if a courier loses their connection while their location is being shared? (The system should rely on the server-side TTL of 45s and show the last known location).
- How does the system handle a customer attempting to cancel an order after it has been prepared?
- What is the process for a vendor to reject a new order?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support four distinct user roles: `customer`, `vendor admin`, `courier`, and `system admin`.
- **FR-002**: The system MUST provide dedicated web panels for `vendor admin` and `courier` roles.
- **FR-003**: Customers MUST be able to choose between "delivery" and "pickup" at checkout.
- **FR-004**: The system MUST provide a real-time order tracking page for customers.
- **FR-005**: Couriers MUST share their location every 15 seconds while the app is in the foreground. When the app is not active, a manual "check-in" button MUST be available.
- **FR-006**: For the MVP, the system MUST only support "cash on delivery" and "pay on pickup" payment methods.
- **FR-007**: The application MUST be a Progressive Web App (PWA) and not a native iOS/Android application.
- **FR-008**: The system MUST use Web Push (VAPID) for notifications. For the MVP, email will be the only fallback mechanism.
- **FR-009**: All map and address-related features MUST use MapLibre and OpenStreetMap, with address searches proxied through the server.
- **FR-010**: The system MUST implement a state machine to manage order statuses throughout the entire lifecycle.
- **FR-011**: The system MUST support a hierarchical address structure of `City > District > Neighborhood`.
- **FR-012**: Vendor branches MUST be able to define their delivery zones using a GeoJSON Polygon or MultiPolygon.
- **FR-013**: The system MUST include a manual KYC (Know Your Customer) process for vendor verification, requiring document uploads and admin approval.

### Key Entities *(include if feature involves data)*

- **User**: Represents an actor in the system with an assigned role (`customer`, `vendor admin`, `courier`, `admin`).
- **Vendor**: Represents a business entity, which undergoes a manual verification process (KYC) including `tax_no` and document checks.
- **Branch**: Represents a physical location of a Vendor, with its own address and an optional `delivery_zone_geojson`.
- **Courier**: Represents a user responsible for delivering orders for a specific Vendor.
- **Order**: Represents a customer's request, containing items, delivery/pickup choice, status, and a delivery address stored as `address_text` and a `geo_point`.
- **Menu Item**: Represents a single product offered by a Vendor.
- **City, District, Neighborhood**: Represents the hierarchical geographical data for addresses.

### Technical Constraints

- **TC-001**: The frontend and backend MUST be built as a monolithic application using Next.js 15.
- **TC-002**: The technology stack is defined as TypeScript, Tailwind CSS, and shadcn/ui.
- **TC-003**: The database MUST be Supabase, with a defined schema, Row Level Security (RLS) policies, and seed data.

---

## Product Overview & Goals

- **Value Proposition**: KapGel enables local restaurants and markets to offer rapid delivery and pickup without building their own logistics stack. Customers gain a reliable ordering experience with real-time tracking.
- **Business Outcomes**: Increase order completion rate, support at least 20 concurrent vendors per city, and provide auditable courier performance data for operations teams.
- **MVP Success Criteria**:
  - First vendor onboarded with at least one active branch.
  - 90% of orders completed without manual admin intervention.
  - End-to-end order flow demonstrated in staging with live Supabase backend.

## Personas & Experience Principles

- **Customer (B2C)**: Prioritises fast search, clear delivery expectations, and frictionless reorder flow.
- **Vendor Admin (B2B)**: Needs dashboard clarity, status prioritisation, and easy courier assignment.
- **Courier (Operations)**: Requires quick task triage, mobile-friendly controls, and minimal data entry.
- **System Admin**: Oversees vendor onboarding, dispute resolution, and platform health.

**Experience Principles**
- Surfaces next-best action within 3 taps/clicks.
- Uses optimistic updates with rollback messaging for real-time flows.
- Provides bilingual UI scaffolding (TR/EN) readiness.

## End-to-End Journey Maps

1. **Customer Ordering**
   - Discover vendors by city/district → filter by category/promotions.
   - Browse vendor menu with modifiers and availability indicators.
   - Add to cart with delivery fee + ETA preview.
   - Checkout with address autocomplete, delivery instructions, payment choice (cash/pickup).
   - Receive confirmation page + push notification.
   - Track order timeline: `Hazırlanıyor → Kurye Yolda → Teslim Edildi` with live map.

2. **Vendor Fulfilment**
   - Dashboard shows new orders queue with SLA countdown.
   - Vendor accepts/rejects order; sets preparation time.
   - Assign courier from available list or request platform dispatch.
   - Update order status when food ready and when courier pickup complete.
   - View analytics (orders/hour, cancellations, courier punctuality) — post-MVP placeholder.

3. **Courier Operations**
   - Toggle availability, view assigned tasks sorted by pickup time.
   - Accept/decline tasks; once accepted, follow stepper: `Yola Çık → Teslim Et`.
   - Share GPS pings every 15s foreground; manual "Konumu Güncelle" fallback.
   - Confirm delivery with optional photo/signature upload (MVP stores metadata, file upload backlog).

4. **Admin Oversight**
   - Review vendor KYC submissions, approve/deny.
   - Monitor active orders, intervene on SLA breaches.
   - Export activity logs for auditing.

## UI/UX Design Direction

- **Information Architecture**
  - `app/` namespaces: `(customer)` for consumer flows, `vendor/` for B2B, `courier/` for operations, `admin/` reserved.
  - Persistent top navigation for customer; side navigation for vendor admin.
- **Visual System**
  - Tailwind + shadcn/ui; primary colour `#FF6B35`, neutral greys for backgrounds.
  - Components: cards for vendor listings, timeline component for order status, bottom sheet for courier task details.
- **Interaction Patterns**
  - Real-time updates via Supabase Realtime channels; show toast notifications on state transitions.
  - MapLibre map with overlays for courier route and delivery zone boundaries.
- **Accessibility**
  - WCAG AA contrast, keyboard navigation for forms, live region announcements for status updates.
- **Responsive Targets**
  - Mobile-first for customer & courier (≤768px), desktop-first for vendor admin (≥1024px).

## Technical Architecture Overview

- **Application**: Next.js 15 App Router with Server Actions for mutations, React Server Components for data fetching.
- **State Management**: Zustand store for cart and session caches; React Query (planned) for vendor dashboards.
- **Backend Services**: Supabase Postgres with Supabase CLI-managed SQL migrations (`supabase/migrations/`) and generated TypeScript types for IDE support, row-level security enforced via policies.
- **Realtime**: Supabase Realtime for order status and courier location; fallback to polling when WebSocket unavailable.
- **Maps**: MapLibre GL JS with custom tiles from OSM; geocoding proxied via Supabase Edge Function.
- **Notifications**: Web Push using VAPID keys stored in Supabase secrets; email fallback via Supabase Functions + Resend (candidate).
- **Background Workers**: `workers/service-worker.ts` handles offline cart sync, push notifications, and caching strategy (Stale-While-Revalidate for menus).

## Data Model Outline

- **users** (`id`, `role`, `phone`, `email`, `last_login_at`).
- **vendors** (`id`, `name`, `tax_no`, `kyc_status`, `owner_user_id`).
- **branches** (`id`, `vendor_id`, `address_id`, `delivery_zone_geojson`, `is_active`, `avg_prep_minutes`).
- **couriers** (`id`, `user_id`, `vendor_id`, `status`, `last_ping_at`, `location_geom`).
- **menus**, **menu_items**, **modifiers** (future), **inventory_items` (backlog).
- **orders** (`id`, `customer_id`, `branch_id`, `status`, `items`, `total_amount`, `delivery_mode`, `address_text`, `geo_point`).
- **order_events** for timeline, **order_assignments** for courier relation.
- **addresses** referencing `cities`, `districts`, `neighborhoods` reference tables.

## Non-Functional Requirements

- **Performance**: First Contentful Paint ≤ 2.5s on mid-tier Android devices; API response p95 ≤ 400ms for core order endpoints.
- **Scalability**: Support 500 concurrent sessions per city with Supabase connection pooling; design for horizontal scaling via Vercel Edge.
- **Reliability**: Graceful degradation when realtime channel drops; offline cart persistence using IndexedDB via service worker.
- **Security & Compliance**: Enforce Supabase RLS, audit logs on sensitive actions, GDPR-compliant data retention policy (delete PII on request).
- **Observability**: Structured logging via Supabase Functions, Sentry integration for client errors, analytics events for funnel metrics.

## Risks & Open Questions

- Supabase Realtime pricing impact when courier count grows beyond 200 concurrent connections.
- Vendor KYC document storage approach (Supabase storage vs. external provider) — decision pending.
- Push notification support on iOS Safari (requires user education overlay).
- Need to validate courier GPS accuracy in dense urban areas; may require smoothing algorithm.
- Determine SLA for manual admin escalation (target ≤ 5 minutes response).

## Review & Acceptance Checklist

*GATE: Automated checks run during main() execution*

### Content Quality

- [X] No implementation details (languages, frameworks, APIs) in non-technical sections.
- [X] Focused on user value and business needs.
- [X] Written for non-technical stakeholders.
- [X] All mandatory sections completed.

### Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain.
- [X] Requirements are testable and unambiguous.
- [X] Success criteria are measurable.
- [X] Scope is clearly bounded.
- [X] Dependencies and assumptions identified.
