# Tasks: Full-Stack Order and Delivery Platform MVP

**Input**: Design details from /plan command arguments
**Prerequisites**: User-provided context

## Phase 3.1: Setup & Foundation

- [X] T001 [P] Initialize Next.js 15 application with TypeScript, Tailwind CSS, and shadcn/ui.
- [X] T002 [P] Create PWA assets: `public/manifest.webmanifest`, icons, and `workers/service-worker.ts`.
- [X] T003 [P] Write Supabase schema SQL for all tables (users, vendors, orders, etc.) in `db/schema.sql`.
- [X] T004 [P] Write Supabase RLS policies for all tables in `db/rls.sql`.
- [X] T005 [P] Create a seed script `db/seed.mjs` to populate the database with sample data.
- [X] T006 [P] Configure Drizzle ORM and create initial migration scripts in `db/migrations/`.
- [X] T007 [P] Set up Playwright and Vitest for testing, including configuration files.
- [X] T008 [P] Create a basic CI workflow file `.github/workflows/ci.yml` for linting, type-checking, and running tests.
- [X] T009 [P] Create the basic application layout in `app/layout.tsx`.

## Phase 3.2: Tests First (TDD)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [X] T010 [P] Write Playwright E2E test for the customer order flow in `tests/e2e/customer-flow.spec.ts`.
- [X] T011 [P] Write Playwright E2E test for the vendor order management flow in `tests/e2e/vendor-flow.spec.ts`.
- [X] T012 [P] Write Playwright E2E test for the courier delivery flow in `tests/e2e/courier-flow.spec.ts`.
- [X] T013 [P] Write Vitest unit tests for RBAC logic in `lib/rbac.ts` to ensure RLS rules are correctly implemented in functions.

## Phase 3.3: Core Implementation (Customer Flow)

- [X] T014 [P] Implement the city selection and vendor search page at `app/page.tsx`.
- [X] T015 [P] Implement the vendor menu page at `app/vendors/[slug]/page.tsx`.
- [X] T016 [P] Implement the shopping cart state management using Zustand in `lib/cart-store.ts`.
- [X] T017 [P] Implement the checkout page at `app/(customer)/checkout/page.tsx` with address and payment options.
- [X] T018 [P] Implement the order tracking page at `app/orders/[id]/page.tsx`.
- [X] T019 Implement the API route for order creation in `app/api/orders/route.ts`.

## Phase 3.4: Core Implementation (Vendor & Courier Panels)

- [ ] T020 [P] Implement the vendor dashboard for managing orders at `app/vendor/(dashboard)/page.tsx`.
- [ ] T021 [P] Implement the menu management CRUD page for vendors at `app/vendor/menu/page.tsx`.
- [ ] T022 Implement the API route for order state transitions at `app/api/orders/[id]/transition/route.ts`.
- [ ] T023 [P] Implement the courier dashboard for managing shifts and tasks at `app/courier/page.tsx`.
- [ ] T024 Implement the API route for courier location updates at `app/api/courier/location/route.ts`.

## Phase 3.5: Integration & Polish

- [ ] T025 [P] Implement Web Push notification subscription logic in `components/PushManager.tsx`.
- [ ] T026 Implement the backend logic to send a push notification when an order's status changes.
- [ ] T027 [P] Create the reusable Map component in `components/Map.tsx` using MapLibre GL.
- [ ] T028 [P] Create the `InstallPWA` component in `components/InstallPWA.tsx`.
- [X] T029 [P] Write a comprehensive `README.md` with setup and local development instructions. *(Delivered 2025-09-30)*
- [ ] T030 [P] Add comments to complex code sections, especially in `lib/rbac.ts` and the service worker.

## Phase 3.6: Documentation & Governance Catch-up

- [X] T031 Produce `specs/001-kapsam-roller-m/research.md` capturing MapLibre, Supabase Realtime, Web Push, accessibility, and observability decisions. *(Delivered 2025-09-30)*
- [X] T032 Produce `specs/001-kapsam-roller-m/data-model.md` detailing entities, relationships, and order state machine with RLS implications. *(Delivered 2025-09-30 — requires DBML follow-up)*
- [X] T033 Produce `specs/001-kapsam-roller-m/quickstart.md` outlining UI architecture, routing, and developer environment steps; update `tasks.md` status flags once documents are complete. *(Delivered 2025-09-30)*

## Dependencies

- **Setup (T001-T009)** must be completed before all other phases.
- **Tests (T010-T013)** must be written before their corresponding implementation tasks.
- **Core Implementation (T014-T024)** depends on the setup phase.
- **T019** (Order API) blocks **T017** (Checkout Page).
- **T022** (Transition API) blocks **T020** (Vendor Dashboard) and **T023** (Courier Dashboard).

## Parallel Example

```
# Launch initial setup tasks together:
Task: "Initialize Next.js 15 application..."
Task: "Create PWA assets..."
Task: "Write Supabase schema SQL..."
Task: "Write Supabase RLS policies..."
Task: "Configure Drizzle ORM..."

# Launch E2E test creation together:
Task: "Write Playwright E2E test for the customer order flow..."
Task: "Write Playwright E2E test for the vendor order management flow..."
Task: "Write Playwright E2E test for the courier delivery flow..."
```
