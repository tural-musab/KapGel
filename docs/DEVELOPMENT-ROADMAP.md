# Development Roadmap - Week 5-10

**Created:** 2025-10-05  
**Strategy:** Hybrid Approach (Seçenek 1.5)  
**Status:** Active Development Phase

---

## 📖 Document Purpose

Bu doküman projeye yeni katılan bir developer'ın:
1. Neyi, hangi sırada yapacağını anlaması
2. Hangi dokümanları takip edeceğini bilmesi
3. Her adımın context'ini kavraması
4. Progress'i track edebilmesi

için hazırlanmıştır.

---

## 🎯 Genel Strateji

### Contract-First Development

```
1. Contract oku     → API ne yapmalı?
2. Test yaz/çalıştır → Nasıl test edilmeli?
3. Implement et     → Contract'a uygun kod
4. Test geç         → Validation
5. TODO işaretle    → Progress tracking
```

### Paralel Track Execution

Week 5'te 3 track paralel çalışır:
- **Track 1:** Courier Location (Critical Path)
- **Track 2:** Vendor Dashboard (Parallel)
- **Track 3:** Menu Management (Parallel)

---

## 📚 Referans Dokümanları

### Mutlaka Okunmalı (Başlamadan Önce)

| Doküman | Ne İçerir | Ne Zaman Okunmalı |
|---------|-----------|-------------------|
| `README.md` | Setup, environment, quick start | İlk gün |
| `specs/001-kapsam-roller-m/spec.md` | Functional requirements | İlk gün |
| `specs/001-kapsam-roller-m/plan.md` | Overall roadmap | İlk gün |
| `specs/001-kapsam-roller-m/data-model.md` | Database schema | İlk gün |

### Task'a Göre Okunmalı

| Doküman | İlgili Task'lar | Ne İçerir |
|---------|-----------------|-----------|
| `specs/001-kapsam-roller-m/contracts/courier-location-api.md` | T024 | Courier location API spec |
| `specs/001-kapsam-roller-m/contracts/vendor-api.md` | T020, T021 | Vendor dashboard & menu API |
| `specs/001-kapsam-roller-m/contracts/orders-api.md` | T020 (transitions) | Order state machine |
| `specs/001-kapsam-roller-m/contracts/notifications-api.md` | T025, T026, T080 | Push notifications |
| `specs/001-kapsam-roller-m/contracts/realtime-channels.md` | T089, T091, T092 | Supabase Realtime |
| `db/rls-complete.sql` | Her task | RLS policies, helper functions |
| `tests/contract/README.md` | Test yazarken | Testing guidelines |
| `docs/performance-budgets.md` | T094 | Performance targets |

---

## 🗓️ Week 5: Critical Implementation

**Hedef:** T024 + T020 + T021 tamamlanmalı  
**Süre:** 5 iş günü  
**Blocker:** Hiçbiri (foundation hazır)

### Günlük Breakdown

#### Gün 1 (Pazartesi)

**Sabah (4 saat): T024 - Courier Location API Setup**

1. **Doküman oku (30 dk):**
   - `specs/001-kapsam-roller-m/contracts/courier-location-api.md`
   - Özellikle: "RPC Functions", "Validation Rules", "Error Handling"

2. **Migration oluştur (30 dk):**
   ```bash
   npx supabase migration new courier_location_rpc
   ```
   
   İçerik:
   - `insert_courier_location()` function
   - Coordinate validation (lat: -90 to 90, lng: -180 to 180)
   - Shift status check
   - Error codes (INVALID_COORDINATES, COURIER_OFFLINE)

3. **RLS policies kontrol et (30 dk):**
   - `db/rls-complete.sql` aç
   - courier_locations INSERT policy'yi oku
   - Shift status validation'ı anla

4. **API route oluştur (2.5 saat):**
   ```typescript
   // src/app/api/courier/location/route.ts
   
   - POST handler yaz
   - RPC function çağır
   - Error handling ekle
   - Logger entegre et (lib/logger.ts)
   ```

**Öğleden Sonra (4 saat): T020 - Vendor Dashboard Setup**

1. **Doküman oku (30 dk):**
   - `specs/001-kapsam-roller-m/contracts/vendor-api.md`
   - Section: "GET /api/vendor/dashboard/stats"

2. **Page oluştur (1 saat):**
   ```bash
   mkdir -p src/app/vendor/\(dashboard\)
   touch src/app/vendor/\(dashboard\)/page.tsx
   ```

3. **Stats API integration (2 saat):**
   - Supabase client setup
   - Stats query yaz (orders aggregation)
   - Loading states ekle

4. **Basic UI render (30 dk):**
   - Stats cards göster
   - Skeleton loader ekle

**TODO Update:**
```markdown
- [X] T024-1: API route created
- [X] T020-1: Dashboard page created
- [~] T024-2: RPC function (in progress)
```

---

#### Gün 2 (Salı)

**Sabah: T024 devam + T021 başlat**

1. **T024 - Validation tamamla (2 saat):**
   - Coordinate range checks
   - Heading validation (0-360)
   - Speed/accuracy non-negative checks
   - Test et: `npm run test:contract -- courier-location`

2. **T021 - Menu page setup (2 saat):**
   - `src/app/vendor/menu/page.tsx` oluştur
   - Products list fetch et
   - Basic table render

**Öğleden Sonra: T020 devam**

1. **Realtime integration (3 saat):**
   - `specs/001-kapsam-roller-m/contracts/realtime-channels.md` oku
   - Orders channel subscribe
   - UI update on new order

2. **Order list render (1 saat):**
   - Order cards oluştur
   - Status badges ekle

**TODO Update:**
```markdown
- [X] T024-3: Validation complete
- [X] T021-1: Menu page created
- [~] T020-3: Realtime (in progress)
```

---

#### Gün 3 (Çarşamba)

**Sabah: T024 finalize + T020 state transitions**

1. **T024 - Contract test (2 saat):**
   ```bash
   npm run test:contract -- courier-location
   ```
   - Test fail'leri fix et
   - Edge cases handle et
   - Pass olana kadar iterate

2. **T020 - Status transition UI (2 saat):**
   - `specs/001-kapsam-roller-m/contracts/orders-api.md` oku (State Machine)
   - Transition buttons ekle (CONFIRM, REJECT, etc.)
   - POST /api/orders/:id/transition çağır

**Öğleden Sonra: T021 CRUD**

1. **Create product form (2 saat):**
   - Modal/drawer ekle
   - Form validation (Zod)
   - POST /api/vendor/products

2. **Update/Delete (2 saat):**
   - Edit modal
   - DELETE confirmation
   - Optimistic updates

**TODO Update:**
```markdown
- [X] T024: COMPLETE ✅
- [X] T020-4: Transitions UI complete
- [~] T021-2: CRUD (in progress)
```

---

#### Gün 4 (Perşembe)

**Sabah: T021 finalize**

1. **Bulk availability (2 saat):**
   - Multi-select checkboxes
   - POST /api/vendor/products/bulk-availability
   - Success feedback

2. **Image placeholder (1 saat):**
   - Upload zone UI (Phase 2'de real upload)
   - Preview göster

3. **Validation feedback (1 saat):**
   - Form errors göster
   - Toast notifications

**Öğleden Sonra: T020 finalize + Testing**

1. **T020 polish (2 saat):**
   - Loading states
   - Empty states
   - Error boundaries

2. **Contract tests (2 saat):**
   ```bash
   npm run test:contract -- vendor-api
   ```
   - Dashboard stats test
   - Products CRUD tests
   - Fix failures

**TODO Update:**
```markdown
- [X] T021: COMPLETE ✅
- [~] T020-5: Testing (in progress)
```

---

#### Gün 5 (Cuma)

**Sabah: T020 complete + Week review**

1. **T020 final tests (2 saat):**
   - All contract tests pass
   - E2E smoke test
   - Manual testing

2. **Code cleanup (2 saat):**
   - Remove console.logs
   - Add comments (complex logic)
   - Format code

**Öğleden Sonra: Week 6 prep + Demo**

1. **Demo hazırlık (2 saat):**
   - Test data seed et
   - Demo scenario hazırla
   - Screenshots/video

2. **Week 6 planning (2 saat):**
   - T023 research
   - GPS tracking araştır
   - Blocker'ları identify et

**TODO Update:**
```markdown
- [X] T024: COMPLETE ✅
- [X] T020: COMPLETE ✅
- [X] T021: COMPLETE ✅

Week 5 Progress: [██████████] 15/15 tasks (100%)
```

---

## 🗓️ Week 6: Courier Dashboard + Complete Tests

**Hedef:** T023 tamamlanmalı + T080-T081 test'ler yazılmalı  
**Blocker:** T024 tamamlanmalı (Week 5'te bitti ✅)

### Task Breakdown

#### T023: Courier Dashboard (3 gün)

**Gün 1 - Setup**
1. Doküman:
   - `specs/001-kapsam-roller-m/contracts/courier-location-api.md`
   - Focus: "Courier Dashboard UI"

2. Sayfa oluştur:
   ```bash
   mkdir -p src/app/courier
   touch src/app/courier/page.tsx
   ```

3. Active delivery card:
   - Order details
   - Customer info (masked phone)
   - Delivery address
   - Navigation button

**Gün 2 - Location Sharing**
1. GPS integration:
   - Browser Geolocation API
   - Permission handling
   - Error states

2. Location update loop:
   ```typescript
   useEffect(() => {
     const interval = setInterval(() => {
       if (isOnline && hasPermission) {
         sendLocation()
       }
     }, 15000) // 15 seconds
   }, [isOnline])
   ```

3. Manual location send button

**Gün 3 - Shift Management**
1. Online/Offline toggle
2. Shift status persistence
3. RLS validation (can only insert when online)
4. Contract tests:
   ```bash
   npm run test:contract -- courier-location
   ```

#### T080: Notifications Contract Tests (1 gün)

1. Doküman oku:
   - `specs/001-kapsam-roller-m/contracts/notifications-api.md`

2. Test file oluştur:
   ```bash
   touch tests/contract/notifications-api.contract.test.ts
   ```

3. Test senaryoları (10 tests):
   - Subscribe to push
   - Send notification on order status change
   - User preferences
   - Unsubscribe
   - RLS policies

#### T081: Realtime Contract Tests (1 gün)

1. Doküman oku:
   - `specs/001-kapsam-roller-m/contracts/realtime-channels.md`

2. Test file oluştur:
   ```bash
   touch tests/contract/realtime-channels.contract.test.ts
   ```

3. Test senaryoları (7 tests):
   - Order channel subscription
   - Courier location channel
   - Vendor orders channel
   - Access control (RLS)
   - Message filtering

---

## 🗓️ Week 7-9: Integration

### Week 7: Push + Maps

#### T025-T026: Web Push (2 gün)

**Gün 1:**
1. Research: `specs/001-kapsam-roller-m/research.md` (Web Push section)
2. Service worker setup
3. Push subscription flow
4. Vapid keys generate

**Gün 2:**
1. Backend trigger (order status change)
2. Notification payload
3. Click handling
4. Contract test: T080

#### T027: Map Component (3 gün)

**Gün 1:**
1. Research: `specs/001-kapsam-roller-m/research.md` (MapLibre section)
2. Component setup
3. Basic map render
4. Style configuration

**Gün 2:**
1. Markers (delivery address, courier location)
2. Route polyline
3. Bounds fitting

**Gün 3:**
1. Real-time courier position update
2. Smooth animation
3. Performance optimization

### Week 8: Realtime Features

#### T089: GPS Tracking (2 gün)

1. Continuous location updates
2. Battery optimization
3. Background sync (if supported)
4. Offline queue

#### T091-T092: Realtime Integration (3 gün)

1. Order status channel
2. Courier location stream
3. Optimistic UI updates
4. Conflict resolution

### Week 9: Polish

1. Loading states all pages
2. Error boundaries everywhere
3. Offline support basics
4. PWA features test

---

## 🗓️ Week 10: Launch Prep

### Testing (3 gün)

#### T093: Accessibility
```bash
npm run lighthouse -- --only=accessibility
npx axe-cli http://localhost:3000
```

Fixes:
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader test

#### T094: Performance
```bash
npm run lighthouse -- --only=performance
```

Checks:
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1
- Bundle size < 200KB

Optimizations:
- Image optimization
- Code splitting
- Tree shaking
- Lazy loading

#### T095-T096: Cross-browser + Mobile
- Chrome (Desktop + Mobile)
- Safari (Desktop + Mobile)
- Firefox
- Responsive breakpoints

### Documentation (1 gün)

#### T030: Code Comments

Priority areas:
```typescript
// lib/rbac.ts
- canAccess() logic explain
- vendorIds extraction flow

// workers/service-worker.ts
- Cache strategies
- Push notification handling
- Background sync logic
```

### Launch Checklist (1 gün)

```markdown
- [ ] .env.production configured
- [ ] Supabase migrations deployed
- [ ] RLS policies verified
- [ ] Sentry DSN configured
- [ ] Performance budgets met
- [ ] All tests passing (unit + E2E + contract)
- [ ] Security audit complete
- [ ] GDPR compliance checked
- [ ] Monitoring setup (logs, APM)
- [ ] Backup strategy defined
```

---

## 🎯 Success Criteria

### Per Week

**Week 5:**
- [X] T024, T020, T021 complete
- [X] All related contract tests pass
- [X] Demo ready

**Week 6:**
- [X] T023 complete
- [X] Contract tests 100% (70/70)
- [X] Courier workflow functional

**Week 7-9:**
- [X] Push notifications working
- [X] Maps integrated
- [X] Realtime updates live
- [X] PWA installable

**Week 10:**
- [X] Lighthouse: Performance > 90
- [X] All tests green
- [X] Launch checklist complete

### Overall (Week 10 End)

```
Production-ready MVP with:
✅ Customer order flow
✅ Vendor order management
✅ Courier delivery tracking
✅ Real-time updates
✅ Push notifications
✅ Maps integration
✅ PWA features
✅ 90+ Lighthouse score
✅ Full test coverage
✅ Security hardened
```

---

## 🆘 Troubleshooting

### Stuck on a Task?

1. **Re-read the contract**
   - What does the API promise?
   - What are the edge cases?

2. **Check the test**
   - What is the test expecting?
   - Run test in watch mode: `npm run test:contract -- --watch`

3. **Review RLS**
   - Is the policy blocking you?
   - Test with service-role key temporarily

4. **Use the logger**
   ```typescript
   import logger from '@/lib/logger'
   logger.debug('Step X reached', { data })
   ```

5. **Check Supabase logs**
   ```bash
   npx supabase logs
   ```

### Common Issues

**RLS denying access:**
- Check `db/rls-complete.sql` policies
- Verify user role in database
- Test helper functions (`get_my_role()`)

**Contract test failing:**
- Contract expectations vs implementation mismatch
- Re-read contract specification
- Check request/response schema

**Realtime not working:**
- RLS policies on subscribed table?
- Correct channel name?
- User authenticated?

---

## 📊 Progress Tracking

Update after each task completion:

```bash
# Update TODO.md
code TODO.md

# Mark task complete
- [X] T024-1: API route created

# Update progress bar
Week 5 Progress: [███▱▱▱▱▱▱▱] 3/15 tasks (20%)
```

Haftalık review (Cuma):
- Tamamlanan tasklar?
- Blocker'lar?
- Next week planning?
- Demo ready?

---

## 🎓 Learning Resources

### Supabase
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Next.js
- [Next.js Docs](https://nextjs.org/docs)
- [App Router](https://nextjs.org/docs/app)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### Testing
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Contract Testing](https://martinfowler.com/bliki/ContractTest.html)

---

**🎯 Remember:** Contract-first, Test-driven, Security-focused!  
**🚀 Goal:** Production-ready MVP in 6 weeks!  
**✅ Method:** One task at a time, momentum maintained!
