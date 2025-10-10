# Tasks: Full-Stack Order and Delivery Platform MVP

**Last Updated:** 2025-10-05  
**Progress:** Phase 1-2 Complete (Contracts, Security, Observability) ✅  
**Current Phase:** Phase 3.4 (Core Implementation)

---

## ✅ Phase 1: Design & Contracts (COMPLETE - Week 1-3)

### Week 1: API Contracts ✅
- [X] T034 [P] Create `specs/001-kapsam-roller-m/contracts/` folder
- [X] T035 [P] Document courier location API contract (courier-location-api.md)
- [X] T036 [P] Document orders API contract (orders-api.md)
- [X] T037 [P] Document vendor API contract (vendor-api.md)
- [X] T060 Document notifications API contract (notifications-api.md)
- [X] T061 Document realtime channels specification (realtime-channels.md)
- [X] T062 Create contracts/README.md with usage guidelines

### Week 2: Security & RBAC ✅
- [X] T038 Complete RLS policies with INSERT/UPDATE/DELETE (db/rls-complete.sql)
- [X] T063 Create RLS migration (20251005000100_complete_rls_policies.sql)
- [X] T064 Implement helper functions (get_my_role, is_admin, get_my_courier_id, get_my_vendor_id)
- [X] T065 Add state machine guards to order transitions
- [X] T066 Create Next.js middleware for route protection (middleware.ts)
- [X] T067 Create Supabase middleware client (lib/supabase/middleware.ts)

### Week 3: Observability & Performance ✅
- [X] T068 Implement structured logger (lib/logger.ts)
- [X] T069 Create optional logs table migration (20251005000200_optional_logs_table.sql)
- [X] T070 Setup Sentry client config (lib/sentry.client.config.ts)
- [X] T071 Setup Sentry server config (lib/sentry.server.config.ts)
- [X] T072 Create ErrorBoundary component (src/components/ErrorBoundary.tsx)
- [X] T073 Define performance budgets (docs/performance-budgets.md)
- [X] T074 Create environment variables template (.env.example)

---

## ✅ Phase 2: Contract Tests (COMPLETE - Week 4)

### Week 4: Contract Test Implementation ✅
- [X] T039 Setup contract tests infrastructure (tests/contract/)
- [X] T075 Write orders API contract tests (18 test cases)
- [X] T076 Write courier location API contract tests (15 test cases)
- [X] T077 Write vendor API contract tests (20 test cases)
- [X] T078 Create contract tests README with guidelines
- [X] T079 Update package.json with test scripts
- [ ] T080 Write notifications API contract tests (TODO)
- [ ] T081 Write realtime channels contract tests (TODO)

**Total Contract Tests:** 53/70 (76% complete)

---

## Phase 3.1: Setup & Foundation ✅

- [X] T001 [P] Initialize Next.js 15 with TypeScript, Tailwind, shadcn/ui
- [X] T002 [P] Create PWA assets (manifest, icons, service-worker)
- [X] T003 [P] Write Supabase schema SQL (db/schema.sql)
- [X] T004 [P] Write initial RLS policies (db/rls.sql) - **Enhanced in Phase 1**
- [X] T005 [P] Create seed script (db/seed.mjs)
- [X] T006 [P] Configure Supabase CLI and migrations
- [X] T007 [P] Setup Playwright and Vitest
- [X] T008 [P] Create CI workflow (.github/workflows/ci.yml)
- [X] T009 [P] Create app layout (app/layout.tsx)

---

## Phase 3.2: Tests First (TDD) ✅

- [X] T010 [P] Write E2E test: customer flow
- [X] T011 [P] Write E2E test: vendor flow
- [X] T012 [P] Write E2E test: courier flow
- [X] T013 [P] Write unit tests: RBAC logic

---

## Phase 3.3: Customer Flow (80% Complete)

- [X] T014 [P] City selection & vendor search (app/page.tsx)
- [X] T015 [P] Vendor menu page (app/vendors/[slug]/page.tsx)
- [X] T016 [P] Shopping cart (lib/cart-store.ts)
- [~] T017 [P] Checkout page (skeleton done, needs API integration)
- [X] T018 [P] Order tracking page (app/orders/[id]/page.tsx)
- [X] T019 API route: order creation (app/api/orders/route.ts)
- [X] T046 [UI] Port landing page with Supabase search
- [X] T047 [UX] Vendor başvuru akışı (register CTA + form)
- [X] T047A [Data] Vendor başvuru bilgilerini Supabase'e kaydet (business name/type, iletişim)
- [ ] T048 [Notif] Vendor onay e-postası ve dashboard aktivasyonu
- [ ] T048B [UX] Vendor başvuru durum ekranı
- [ ] T052 [UI] Customer dashboard (default rol için temel sayfa)

---

## Phase 3.4: Vendor & Courier Panels (60% Complete)

- [ ] T020 [P] Vendor dashboard (app/vendor/(dashboard)/page.tsx)
- [ ] T021 [P] Menu management CRUD (app/vendor/menu/page.tsx)
- [X] T022 API route: order transitions (app/api/orders/[id]/transition/route.ts)
- [ ] T023 [P] Courier dashboard (app/courier/page.tsx)
- [ ] T024 API route: courier location (app/api/courier/location/route.ts)
- [ ] T041 [UI] Port shared dashboard components
- [X] T042 [UI] Vendor dashboard layout (mock data)
- [ ] T043 [UI] Courier dashboard layout (mock data)
- [X] T044 [Data] Wire vendor dashboard to Supabase
- [ ] T045 [Data] Wire courier dashboard to Supabase
- [X] T049 [Auth] Guard routes with session/role checks
- [ ] T050 [Data] Vendor/courier application modellerini güncelle (kurye self-signup devre dışı, vendor kota yönetimi)

---

## Phase 3.4b: Admin Oversight ✅

- [X] T051 [Admin] Create admin dashboard (/admin)
- [X] T052 [Admin] Application approval actions
- [X] T053 [Admin] User role update controls
- [X] T054 [Docs] Admin workflows documentation

---

## Phase 3.5: Integration & Polish (20% Complete)

- [ ] T025 [P] Web Push subscription (components/PushManager.tsx)
- [ ] T026 Push notifications on order status change
- [ ] T027 [P] Reusable Map component (components/Map.tsx)
- [ ] T028 [P] InstallPWA component (components/InstallPWA.tsx)
- [X] T029 [P] Comprehensive README.md
- [ ] T030 [P] Code comments for complex sections

---

## Phase 3.6: Documentation ✅

- [X] T031 research.md (MapLibre, Realtime, Web Push, etc.)
- [X] T032 data-model.md (entities, relationships, state machine)
- [X] T033 quickstart.md (UI architecture, routing, dev setup)

---

## 📊 Progress Summary

| Phase | Progress | Status |
|-------|----------|--------|
| Phase 1: Contracts | 100% | ✅ Complete |
| Phase 2: Contract Tests | 76% | 🟡 In Progress |
| Phase 3.1: Setup | 100% | ✅ Complete |
| Phase 3.2: TDD | 100% | ✅ Complete |
| Phase 3.3: Customer | 80% | 🟡 In Progress |
| Phase 3.4: Vendor/Courier | 60% | 🟡 In Progress |
| Phase 3.4b: Admin | 100% | ✅ Complete |
| Phase 3.5: Integration | 20% | 🔴 Blocked |
| Phase 3.6: Documentation | 100% | ✅ Complete |

**Overall Progress: 65%**

---

## 🚀 Parallel Execution Tracks (Week 5-10)

Based on plan.md Öneri A, following tracks can run in parallel:

### Track 1: Security & Compliance (Week 5-6)
**Owner:** Backend Team  
**Dependencies:** Phase 1 complete ✅

- [ ] T082 Complete remaining RLS policy tests
- [ ] T083 Security audit of all endpoints
- [ ] T084 RBAC enforcement verification
- [ ] T085 Audit logging for sensitive operations
- [ ] T086 Rate limiting implementation

### Track 2: Vendor Panel (Week 5-7)
**Owner:** Frontend Team  
**Dependencies:** T022 complete ✅

- [ ] T020 Vendor dashboard implementation
- [ ] T021 Menu CRUD implementation
- [ ] T041 Shared dashboard components
- [ ] T044 Supabase integration (in progress)
- [ ] T087 Courier assignment UI
- [ ] T088 Business hours management

### Track 3: Courier Panel (Week 6-8)
**Owner:** Mobile Team  
**Dependencies:** T024 (Location API) needed

- [ ] T024 Courier location API (CRITICAL PATH)
- [ ] T023 Courier dashboard
- [ ] T043 UI layout with mock data
- [ ] T045 Supabase integration
- [ ] T089 GPS tracking implementation
- [ ] T090 Shift management

### Track 4: Integration (Week 7-9)
**Owner:** Full Stack Team  
**Dependencies:** Tracks 1-3 in progress

- [ ] T025-T026 Web Push notifications
- [ ] T027 Map component (MapLibre)
- [ ] T028 PWA install prompt
- [ ] T091 Realtime order updates
- [ ] T092 Courier location streaming

### Track 5: Polish & Testing (Week 8-10)
**Owner:** QA + Frontend  
**Dependencies:** Track 4 in progress

- [ ] T030 Code documentation
- [ ] T080-T081 Remaining contract tests
- [ ] T093 Accessibility audit
- [ ] T094 Performance optimization
- [ ] T095 Cross-browser testing
- [ ] T096 Mobile responsiveness

---

## Critical Path

```
Week 5:  T024 (Location API) - BLOCKER for Track 3
Week 6:  T020-T021 (Vendor Panel) - BLOCKER for demo
Week 7:  T025-T026 (Notifications) - MVP feature
Week 8:  T027 (Map integration) - MVP feature
Week 9:  T091-T092 (Realtime) - MVP feature
Week 10: T093-T096 (Launch prep)
```

---

## Blocking Issues

| Task | Blocked By | ETA |
|------|-----------|-----|
| T017 (Checkout) | API integration needed | Week 5 |
| T023 (Courier Dashboard) | T024 (Location API) | Week 6 |
| T025 (Web Push) | Vendor/Courier panels | Week 7 |
| T027 (Map) | T024 (Location API) | Week 7 |

---

## Next Actions (Week 5)

1. **Priority 1 (CRITICAL):**
   - [ ] T024: Implement courier location API
   - [ ] T080: Complete notifications contract tests
   - [ ] T082: RLS policy testing

2. **Priority 2 (HIGH):**
   - [ ] T020: Vendor dashboard
   - [ ] T021: Menu management
   - [ ] T087: Courier assignment

3. **Priority 3 (MEDIUM):**
   - [ ] T048: Admin onay e-postası
   - [ ] T048: Vendor onay bildirimleri
   - [ ] T041: Shared components

---

## Dependencies Matrix

```
T001-T009 (Setup) ✅
    ↓
T010-T013 (Tests) ✅
    ↓
T014-T019 (Customer) 80%
    ↓
T022 (Transitions) ✅ → T020, T021 (Vendor) ⏳
T024 (Location) ⏳ → T023, T045 (Courier) 🔴
    ↓
T025-T028 (Integration) 🔴
    ↓
T093-T096 (Polish) 🔴
```

**Legend:**
- ✅ Complete
- ⏳ In Progress
- 🔴 Blocked/Not Started

---

## Related Documentation

- [plan.md](./plan.md) - Implementation roadmap
- [spec.md](./spec.md) - Functional requirements
- [contracts/](./contracts/) - API specifications
- [data-model.md](./data-model.md) - Database design
