# Implementation Plan: Full-Stack Order and Delivery Platform MVP

**Branch**: `001-kapsam-roller-m` | **Date**: 2025-09-30 | **Spec**: `specs/001-kapsam-roller-m/spec.md`
**Input**: Feature specification from `/specs/001-kapsam-roller-m/spec.md`

## Summary

The MVP must deliver a web-only (PWA) experience that covers the entire order lifecycle for customers, vendor admins, couriers, and platform admins. The current codebase already includes the customer discovery flow (`app/page.tsx`), checkout, order tracking shells, Supabase schema/RLS stubs, a cart Zustand store, Playwright/Vitest harness, and the service worker scaffold. Missing work concentrates on B2B (vendor/courier) panels, real-time order orchestration, notification infrastructure, MapLibre components, and production-ready documentation. This plan prioritises solidifying security (RLS + RBAC), completing Supabase integration, and delivering polished UI across all roles in parallel with robust observability. The supporting research, data model, and developer quickstart documents are now in place to guide Phase 1 execution.

## Technical Context

- **Language/Version**: TypeScript 5 on Next.js 15 (Node.js 20 runtime via Vercel default).
- **Primary Dependencies**: Supabase JS SDK, Drizzle ORM (type inference only), Tailwind CSS 4, shadcn/ui (to be added), Zustand, Playwright, Vitest, MapLibre GL (not yet installed).
- **Storage**: Supabase Postgres with schema defined in `db/schema.sql`, migrations under `db/migrations/`, and seed data in `db/seed.mjs`.
- **Testing**: Vitest unit tests (`tests/unit`), Playwright E2E suites (`tests/e2e`). CI workflow pending.
- **Target Platform**: Cross-platform browsers (PWA). Deployed via Vercel + Supabase.
- **Project Type**: Monolithic web application (App Router) with shared server/client code inside `src/`.
- **Performance Goals**: FCP ≤ 2.5s on mid-tier Android, realtime status propagation ≤ 2s, background sync for carts.
- **Constraints**: Cash/pickup payments only, MapLibre + OSM tiles, Web Push with email fallback, manual KYC, mobile-first courier UI, offline-capable cart.
- **Scale/Scope**: Designed for launch in 1–2 pilot cities (≤500 concurrent sessions, ≤200 active couriers), 3 dashboards (customer, vendor, courier) plus admin workflows.

## Constitution Check

- **Güvenlik (Security)**: *At Risk*. RLS policies exist but lack granular INSERT/UPDATE coverage for orders, courier locations, and notifications. Admin tooling not yet gated. Requires RBAC middleware and Supabase policies review.
- **Performans (Performance)**: *At Risk*. Service worker scaffold present but offline caching not configured; MapLibre and realtime updates not optimised. Need performance budgets and instrumentation.
- **Basitlik (Simplicity)**: *Pass with follow-up*. Codebase still small; must enforce consistent module boundaries (`src/app`, `lib`, `components`). Avoid premature microservices.
- **Erişilebilirlik (Accessibility)**: *Missing*. No documented accessibility criteria in UI components; tests absent. Needs accessibility checklist and linting.
- **İzlenebilirlik (Observability)**: *Missing*. No logging/telemetry wiring. Need Supabase log tables or external APM, plus structured event schema.
- **Ürün Odağı (Product Focus)**: *Pass*. Spec clearly targets marketplace logistics with defined personas and flows.

*Action*: Security/performance/accessibility/observability gaps must be addressed during Phase 1 before task execution.

## Project Structure

### Documentation (this feature)

```
specs/001-kapsam-roller-m/
├── spec.md          # Updated feature definition (complete)
├── plan.md          # This plan (complete)
├── research.md      # ✅ Completed 2025-09-30 – integration studies & constitution mitigation actions
├── data-model.md    # ✅ Completed 2025-09-30 – schema, lifecycle, access controls
├── quickstart.md    # ✅ Completed 2025-09-30 – onboarding & workflow guide
├── contracts/       # ❌ Missing – to be produced in Phase 1 (REST/OpenAPI + tests)
└── tasks.md         # Existing tasks backlog (requires revision after Phase 1)
```

### Source Code (repository root)

```
src/
├── app/
│   ├── (customer)/checkout/page.tsx
│   ├── api/orders/route.ts
│   ├── orders/[id]/page.tsx
│   ├── vendors/[slug]/page.tsx
│   └── layout.tsx, page.tsx, globals.css
├── lib/
│   ├── cart-store.ts
│   ├── rbac.ts
│   └── supabase/{client,server}.ts
├── components/            # 🚧 To add: shared UI (Map, PushManager, InstallPWA)
└── workers/service-worker.ts

db/
├── schema.sql
├── schema.ts
├── migrations/
├── rls.sql
└── seed.mjs

tests/
├── e2e/*.spec.ts
└── unit/rbac.spec.ts
```

**Structure Decision**: Single Next.js monorepo with App Router. Maintain feature folders under `src/app` separated by role. Shared UI lives under `src/components`, shared logic under `src/lib`, database artefacts under `db`, and automation/tests under `tests`. No additional packages required for MVP.

## Phase 0: Outline & Research

1. **Outstanding Unknowns**
   - MapLibre integration best practices within Next.js App Router (SSR + CSR balance).
   - Supabase Realtime channel design for order + courier streams (channels, filters, auth).
   - Web Push + VAPID implementation for PWA with Supabase Edge Functions.
   - Accessibility expectations for courier mobile UX (WCAG mobile form factors).
   - Observability stack options compatible with Vercel + Supabase (Sentry vs. Logflare).

2. **Research Tasks**
   - Document integration patterns for MapLibre GL + Next.js (static vs. dynamic import, map token storage).
   - Capture Supabase best practices for RLS on multi-tenant vendor data and live location updates.
   - Evaluate Web Push service worker patterns for multi-role dashboards and offline support.
   - Compile accessibility checklist for forms, tables, realtime updates (aria-live, focus management).
   - Select observability tooling (logs, metrics, alerting) and outline instrumentation hooks.

3. **Deliverable**: `research.md` summarising decisions, rationale, and alternatives. ✅ **Delivered** (2025-09-30). Close any `NEEDS CLARIFICATION` markers before moving to Phase 1.

## Phase 1: Design & Contracts

1. **Data Model Detailing** (`data-model.md`)
   - Expand Supabase schema into entity diagrams, relations, computed fields, and state machine transitions.
   - Define order workflow (NEW → CONFIRMED → …) with guard conditions and actor permissions.
   - Specify notification payload schemas and storage strategy for courier location history.
   - ✅ **Status**: Draft delivered (2025-09-30); refine with DBML diagram once tooling ready.

2. **API Contracts** (`contracts/`)
   - RESTful endpoints for:
     - Customer order lifecycle (`POST /api/orders`, `GET /api/orders/{id}` realtime subscription handshake).
     - Vendor management (`GET/POST /api/vendor/orders`, `PATCH /api/orders/{id}/status`).
     - Courier availability & location (`POST /api/courier/shifts`, `POST /api/courier/location`).
     - Notification subscriptions (`POST /api/notifications/subscribe`).
   - Provide OpenAPI spec or typed contract files, plus contract tests in `tests/contract/` that currently fail.

3. **Frontend Design Docs** (`quickstart.md`)
   - Outline component hierarchy per role, data fetching strategy (server/client components), and routing map.
   - Document state management decisions (Zustand slices, React Query adoption timeline).
   - Include UI wireframe references (textual description + acceptance criteria) to guide implementation.
   - ✅ **Status**: Developer onboarding quickstart published (2025-09-30).

4. **Security & Observability Plan**
   - Update `lib/rbac.ts` design with mapping from Supabase JWT claims → role guards.
   - Outline logging strategy (structured events, telemetry endpoints) and error reporting flows.
   - Document monitoring/alerting approach using Supabase + third-party tooling.
   - ✅ **Status**: Mitigation roadmap captured in `research.md`; implementation pending.

5. **Re-evaluate Constitution Check**
   - Confirm RLS coverage, performance budgets, accessibility plan, and observability instrumentation are defined.
   - Update this plan with status ticks before proceeding to /tasks.
   - ✅ **Status**: Mitigation roadmap captured (2025-09-30); mark "Pass" after execution.

## Phase 2: Task Planning Approach

*Executed by `/tasks` once Phase 1 artefacts exist.*

- Refresh `tasks.md` to align with Phase 1 outputs. Existing checklist marks many incomplete items as `[X]`; must be corrected to reflect reality.
- Follow TDD-first sequencing: generate contract/unit tests, implement APIs, then UIs.
- Parallelisable tracks:
  - **Security/Data**: RLS hardening, RBAC middleware, telemetry.
  - **Vendor Panel**: Dashboard UI, order management workflows.
  - **Courier Panel**: Shift/task UI, location updates, map integration.
  - **Customer Enhancements**: Map + tracking, notifications, offline cart.
- Ensure tasks include documentation updates (README, runbooks) and release checklist (Supabase migrations, env setup).

## Progress Tracking

- **Initial Constitution Check**: Failing (security, performance, accessibility, observability gaps) — must be resolved in Phase 1.
- **Post-Design Constitution Check**: Documentation and mitigation plans delivered (2025-09-30); awaiting technical execution to mark as Pass.

## Complexity & Risk Notes

- Vendor/courier dashboards share similar data but require role-specific filters; reuse components carefully to avoid leakage.
- Realtime updates risk race conditions; consider server-side `order_events` table as source of truth with event sourcing.
- Web Push user consent flows differ on iOS Safari; include education modals early to avoid drop-off.
- Supabase geography types require PostGIS; confirm extension enabled in migrations.
