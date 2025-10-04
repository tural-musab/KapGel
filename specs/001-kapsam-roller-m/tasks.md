# Tasks: Full-Stack Order and Delivery Platform MVP

**Input**: Design details from /plan command arguments
**Prerequisites**: User-provided context

## Phase 1-lite: Minimal Contracts & Constitution Prep

- [X] T034 [P] Create `specs/001-kapsam-roller-m/contracts/` and scaffold contract documentation.
- [X] T035 [P] Draft customer orders API contract (markdown).
- [X] T036 Draft courier API contract (markdown).
- [X] T037 Draft vendor API contract (markdown).
- [X] T038 Outline failing contract test stubs under `tests/contract/` for orders, vendor, courier.
- [X] T039 Summarise RLS/RBAC and observability closure checklist for Phase 1 sign-off.

## Phase 3.1: Setup & Foundation

- [X] T001 [P] Initialize Next.js 15 application with TypeScript, Tailwind CSS, and shadcn/ui.
- [X] T002 [P] Create PWA assets: `public/manifest.webmanifest`, icons, and `workers/service-worker.ts`.
- [X] T003 [P] Write Supabase schema SQL for all tables (users, vendors, orders, etc.) in `db/schema.sql`.
- [X] T004 [P] Write Supabase RLS policies for all tables in `db/rls.sql`.
- [X] T005 [P] Create a seed script `db/seed.mjs` to populate the database with sample data.
- [X] T006 [P] Configure Supabase CLI workflows and create initial SQL migrations in `supabase/migrations/`.
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
- [X] T017 [P] Implement the checkout page at `app/(customer)/checkout/page.tsx` with address and payment options (Phase 3 skeleton; wire to Supabase order RPC and validations).
- [X] T018 [P] Implement the order tracking page at `app/orders/[id]/page.tsx` (add realtime updates, status timeline, map integration hooks).
- [X] T019 Implement the API route for order creation in `app/api/orders/route.ts` (add input validation, pricing safeguards, and tests).
- [X] T046 [UI] Port the advanced landing experience with Supabase-backed search/filtering at `app/page.tsx`.
- [ ] T047 [UI] Implement Supabase Auth login/register screens with email/password forms and error handling.
- [ ] T048 [UX] Provide a role selection/onboarding step after login (customer/vendor/courier/admin) with redirect logic. *(See T048A–T048C)*
- [ ] T048A Create `/onboarding/role` wizard that forces selection for users with `role = pending` and shows contextual CTAs per choice.
- [ ] T048B Persist selections in Supabase (`users.role` + application tables) and refresh JWT claims so guards know the active role (extends Phase 1-lite claim mapping).
- [ ] T048C Add Playwright coverage for login → role onboarding flow (customer happy-path) and update auth unit tests for claim refresh.

## Phase 3.4: Core Implementation (Vendor & Courier Panels)

- [ ] T020 [P] Implement the vendor dashboard for managing orders at `app/vendor/(dashboard)/page.tsx`.
- [ ] T021 [P] Implement the menu management CRUD page for vendors at `app/vendor/menu/page.tsx`.
- [X] T022 Implement the API route for order state transitions at `app/api/orders/[id]/transition/route.ts`.
- [ ] T023 [P] Implement the courier dashboard for managing shifts and tasks at `app/courier/page.tsx`.
- [ ] T024 Implement the API route for courier location updates at `app/api/courier/location/route.ts`.
- [ ] T041 [UI] Port shared dashboard components (stats cards, timelines, action buttons) from prototype into `src/components/ui/`.
- [X] T042 [UI] Port vendor dashboard layout with mock data and hook it to shared components (depends on T041, blocked by T022/T021 for real data).
- [ ] T043 [UI] Port courier dashboard layout with mock data and location placeholder (depends on T041, blocked by T041 and T024 for real data).
- [X] T044 [Data] Wire vendor dashboard to Supabase (orders, menu management, realtime) after T022/T021.
- [ ] T045 [Data] Wire courier dashboard to Supabase (tasks, shifts, location channel) after T022/T024.
- [X] T049 [Auth] Guard vendor/courier/admin routes with Supabase session/role checks and redirect unauthenticated users to login.
- [ ] T050 [Data] Model vendor/courier onboarding applications (pending/approved) and wire role guards to respect approval state.

## Phase 3.4b: Admin Oversight

- [X] T051 [Admin] Kurumsal KPI kartları, başvuru listeleri ve kullanıcı yönetimi tablosu ile `/admin` kontrol panelini oluştur.
- [X] T052 [Admin] Vendor/kurye başvurularını onaylamak veya reddetmek için Supabase service-role destekli sunucu aksiyonlarını ekle.
- [X] T053 [Admin] Kullanıcı rolü güncelleme kontrolleri ekleyip `auth.users` ve başvuru tablolarıyla otomatik senkronizasyon sağla.
- [X] T054 [Docs] Admin iş akışlarını ve yetkilendirme modelini dokümantasyona ekle (runbook/quickstart güncellemesi).

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
Task: "Configure Supabase CLI migrations..."

# Launch E2E test creation together:
Task: "Write Playwright E2E test for the customer order flow..."
Task: "Write Playwright E2E test for the vendor order management flow..."
Task: "Write Playwright E2E test for the courier delivery flow..."
```
