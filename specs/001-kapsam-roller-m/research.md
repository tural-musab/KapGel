# Research Log: KapGel MVP Foundations

**Feature Branch**: `001-kapsam-roller-m`  \
**Owner**: Product/Platform Team  \
**Last Updated**: 2025-09-30

This research log captures the key investigations required to deliver the KapGel web-based order and delivery MVP. Each section documents the question we set out to answer, the evaluation we performed, the selected direction, and any remaining follow-ups.

---

## 0. Business Model: Vendor-Owned Courier System

- **Question**: Should KapGel operate as a centralized logistics provider with a shared courier pool, or as a management platform for vendors with their own delivery staff?
- **Investigation**:
  - Analyzed market positioning against platforms like DoorDash, Uber Eats, and Getir that provide courier services.
  - Evaluated operational complexity and liability of managing a courier workforce.
  - Assessed target market of established local businesses that already have delivery capabilities but lack digital infrastructure.
  - Reviewed technical implications: courier-vendor relationship in data model, RLS policies for courier isolation, vendor onboarding requirements.
- **Decision**:
  - **KapGel is a logistics management platform, NOT a logistics provider.**
  - Only vendors with their own courier staff can join the platform.
  - Each courier is associated with a single vendor (`couriers.vendor_id` foreign key).
  - The platform provides order orchestration, tracking infrastructure, and customer experience tools.
  - Vendors retain full control over courier management, scheduling, and service quality.
  - This reduces operational complexity, liability, and positions KapGel as a B2B SaaS tool rather than a gig-economy platform.
- **Follow-ups**:
  - Add vendor onboarding checklist to verify courier capacity (minimum number of couriers, delivery zones coverage).
  - Update KYC process to include proof of existing delivery operations.
  - Document in marketing materials and vendor FAQs that platform does not provide courier services.
  - Consider future "courier-as-a-service" integration for vendors who want to expand beyond their own staff (Phase 2+).

---

## 0.1. Business Type Classification Strategy

- **Question**: Should we support multiple vendor types (restaurant vs market) from day one, or start with restaurants only?
- **Investigation**:
  - Analyzed schema flexibility: ENUM type allows adding new types without breaking changes
  - Reviewed UI complexity: Type selection adds one step to onboarding
  - Assessed business logic differences: Minimal for MVP (both need menu, orders, couriers)
  - Evaluated analytics needs: Business intelligence requires type segmentation
- **Decision**:
  - **Add `business_type` ENUM to vendors table immediately**
  - Types: `restaurant`, `market`, `grocery`, `cafe`
  - Default: `restaurant` (MVP focus)
  - MVP UI only shows "restaurant" option initially
  - Schema future-proof: Markets can be enabled by UI change only
  - Analytics ready: Reports can segment by type from day one
- **Technical Implementation**:
  - Create ENUM type: `vendor_business_type`
  - Add column: `vendors.business_type` with default `restaurant`
  - Seed data: All test vendors start as restaurants
  - UI: Onboarding shows business type selection (restaurant only for MVP)
- **Follow-ups**:
  - Phase 2: Enable market option in onboarding UI
  - Phase 2: Different commission rates per business type
  - Phase 3: Type-specific features (e.g., prescription upload for pharmacies)
  - Monitor: Track conversion rates by business type

---

## 0.2. Courier Onboarding Flow Evolution

- **Question**: Should couriers apply independently via `courier_applications` table, or should vendor admins add them directly?
- **Investigation**:
  - Analyzed current schema: `courier_applications` exists and is actively used in admin dashboard
  - Reviewed business model: "Vendor-owned couriers" means employment relationship with vendor, not platform
  - Assessed user experience: Independent application doesn't align with vendor-managed model
  - Evaluated transition complexity: Current admin UI depends on `courier_applications`
- **Decision**:
  - **Gradual transition approach** (not immediate removal)
  - Phase 1: Keep `courier_applications` functional (current Week 6)
  - Phase 2: Implement vendor admin "Add Courier" functionality (Week 7-8)
  - Phase 3: Migrate existing data and deprecate `courier_applications` (Week 9+)
- **Rationale**:
  - Aligns with "vendor manages own couriers" principle
  - Reduces admin overhead (one approval instead of two)
  - Simpler user journey for established businesses
  - Risk mitigation: No breaking changes during MVP phase
- **Technical Implementation Plan**:
  - Phase 2: Vendor dashboard "Team Management" section
  - Phase 2: Direct courier creation + email invitation system
  - Phase 3: Data migration script + table deprecation
- **Follow-ups**:
  - Phase 2: Vendor dashboard "Add Courier" functionality
  - Phase 2: Courier invitation email templates
  - Phase 3: Safe migration path for existing courier applications

---

## 1. MapLibre + Next.js App Router

- **Question**: How do we embed MapLibre maps inside a Next.js 15 App Router project without breaking server rendering or increasing bundle size excessively?
- **Investigation**:
  - Reviewed MapLibre GL’s SSR limitations and community guidance for dynamic imports inside the App Router (`use client` components).  
  - Prototyped a lightweight wrapper using `dynamic(() => import('maplibre-gl'), { ssr: false })` coupled with Tailwind utility classes.  
  - Validated custom tile hosting requirements using OSM tiles with attribution banners.
- **Decision**:
  - Create a dedicated `Map` client component under `src/components/Map.tsx` that defers MapLibre loading to the client and accepts `deliveryZone` and `courierPosition` props.  
  - Persist vendor delivery zones as GeoJSON in Supabase and hydrate via server actions for initial render.  
  - Apply `ResizeObserver` fallback for responsive map sizing.
- **Follow-ups**:
  - Add unit tests that mock MapLibre to ensure component contracts remain stable.  
  - Document environment variables for map tile providers if switching away from public OSM tiles.

## 2. Supabase Realtime for Orders & Couriers

- **Question**: How should we model real-time order and courier updates so each role receives only the data they are authorised to see?
- **Investigation**:
  - Reviewed Supabase channel filtering with Postgres row-level security (RLS) policies.  
  - Tested `realtime.listen` with topic names scoped to branch IDs and courier IDs.  
  - Analyzed pricing limits (up to 200 concurrent connections on the Launch tier) and fallback polling strategies.
- **Decision**:
  - Use logical channels: `orders:branch_id:<uuid>` for vendor dashboards, `orders:customer_id:<uuid>` for customer tracking, and `couriers:courier_id:<uuid>` for courier updates.  
  - Maintain an `order_events` table as the authoritative event log and broadcast new rows via database triggers.  
  - Enforce RLS to ensure users can only subscribe to channels referencing their own actor IDs.
- **Follow-ups**:
  - Author database triggers that publish events with minimal payloads (status, ETA, courier location).  
  - Load-test connection churn with 50 simulated couriers.

## 3. Web Push + Email Fallback

- **Question**: How do we deliver real-time notifications across desktop Chrome, Android Chrome, and iOS Safari within PWA constraints?
- **Investigation**:
  - Evaluated VAPID-based push registration via service workers and Supabase Edge Functions.  
  - Tested iOS 17+ Safari behaviour (permission prompts, background pushes) and identified the need for an onboarding modal.  
  - Reviewed Resend’s API for transactional email as fallback when push permissions are declined.
- **Decision**:
  - Store push subscriptions in `notifications` table with `channel = 'webpush'`.  
  - Implement `components/PushManager.tsx` to orchestrate permission prompts, subscription creation, and unsubscribes.  
  - Use Supabase Edge Function to trigger Web Push and send fallback email via Resend when push delivery fails.
- **Follow-ups**:
  - Capture browser capabilities in analytics to measure opt-in conversion.  
  - Create a runbook for rotating VAPID keys.

## 4. Accessibility Standards for Real-Time Dashboards

- **Question**: What accessibility measures are required to ensure the multi-role dashboards meet WCAG 2.2 AA criteria?
- **Investigation**:
  - Audited current UI components for semantic gaps (heading levels, button roles, focus states).  
  - Reviewed WCAG success criteria relevant to real-time updates, such as 2.2.1 Timing Adjustable, 2.2.2 Pause/Stop, and 4.1.3 Status Messages.  
  - Collected best practices for table navigation on mobile devices.
- **Decision**:
  - Adopt a pattern of announcing realtime changes through ARIA live regions and providing user controls to pause auto-refresh lists.  
  - Enforce keyboard traps avoidance in modals and ensure focus outlines remain visible.  
  - Add automated accessibility checks via `@axe-core/playwright` in CI.
- **Follow-ups**:
  - Document accessible colour tokens in the design system.  
  - Conduct manual screen reader testing before launch.

## 5. Observability & Telemetry

- **Question**: Which telemetry stack provides visibility into Supabase, Next.js server actions, and client-side performance with minimal overhead?
- **Investigation**:
  - Compared Supabase Logflare integration versus external APM (Sentry).  
  - Evaluated Next.js instrumentation hooks and Supabase Edge logging capabilities.  
  - Assessed cost implications for early-stage traffic.
- **Decision**:
  - Instrument client and server with Sentry (self-hosted plan) for error tracking.  
  - Emit structured JSON logs from server actions to Supabase Logflare for retention.  
  - Add custom metrics (order lifecycle duration, courier idle time) via Supabase Functions writing to a `telemetry_events` table.
- **Follow-ups**:
  - Define alert thresholds and pager rotation for SLA breaches.  
  - Automate log retention policy compliance (delete PII after 30 days).

## 6. Security & Performance Hardening

- **Question**: What actions must we take to close the security, performance, and observability gaps flagged in the constitution check?
- **Investigation**:
  - Reviewed existing RLS policies (`db/rls.sql`) and identified missing constraints for inserts/updates on `orders`, `courier_locations`, and `notifications`.  
  - Benchmarked hydration cost of current customer storefront to ensure it meets FCP requirements.  
  - Verified that service worker currently lacks caching strategies beyond precache.
- **Decision**:
  - Draft RBAC middleware referencing Supabase JWT claims to gate server actions by role.  
  - Expand RLS to validate branch ownership on courier updates and enforce tenant isolation on orders.  
  - Adopt a stale-while-revalidate caching policy for menu data and implement background sync for cart submissions.
- **Follow-ups**:
  - Write load-test scripts using k6 for API endpoints.  
  - Schedule a security review once RBAC policies land.

---

### Summary of Next Actions

1. Implement the Map component and supporting Supabase GeoJSON queries (Phase 1 deliverable).  
2. Finalise realtime triggers and RBAC middleware before opening vendor/courier dashboards (Phase 1 → Phase 2 dependency).  
3. Stand up observability instrumentation (Sentry + Logflare) and document alerting in the runbook.  
4. Integrate accessibility tooling into CI alongside Web Push onboarding flows.  
5. Reassess constitution check after the above items to flip Security, Performance, Accessibility, and Observability to "Pass".
