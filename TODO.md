# KapGel Development TODO

**Last Updated:** 2025-10-05  
**Approach:** Hybrid (Seçenek 1.5)  
**Current Week:** Week 5 (Implementation Starts)

---

## 🎯 Quick Start

Yeni bir developer için:
1. Bu TODO'yu takip et ✅
2. `docs/DEVELOPMENT-ROADMAP.md` oku (detaylı plan)
3. `specs/001-kapsam-roller-m/contracts/` kontratları oku
4. `tests/contract/` test'leri çalıştır

---

## ✅ TAMAMLANAN (Week 1-4)

### Phase 1: Foundation ✅
- [X] API Contracts yazıldı (6 dosya)
- [X] RLS Policies tamamlandı (30+ policy)
- [X] RBAC Middleware eklendi
- [X] Structured Logger hazır
- [X] Sentry APM entegre edildi
- [X] Performance budgets tanımlandı
- [X] Contract tests yazıldı (53/70)

**Dokümantasyon:**
- [X] `specs/001-kapsam-roller-m/contracts/` ✅
- [X] `db/rls-complete.sql` ✅
- [X] `middleware.ts` ✅
- [X] `lib/logger.ts` ✅
- [X] `tests/contract/` ✅

---

## 🚀 WEEK 5: Critical Implementation (ŞİMDİ)

### Track 1: Courier Location API ⭐ (CRITICAL PATH) ✅
- [X] **T024-1:** `app/api/courier/location/route.ts` oluştur ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/courier-location-api.md`
  - 🧪 Test: `tests/contract/courier-location-api.contract.test.ts`
  - ⏱️ Tamamlandı: 2025-10-06
  
- [X] **T024-2:** `insert_courier_location()` RPC function implement et ✅
  - 📖 Contract: Section "RPC Functions"
  - 🗄️ Migration: `20251006000100_courier_location_rpc.sql`
  - 🔧 Schema Fix: `20251007000100_fix_courier_locations_schema.sql` ✅
  
- [X] **T024-3:** Coordinate validation ekle (lat/lng range checks) ✅
  - 📖 Contract: Section "Validation Rules"
  - ✓ Lat: -90 to 90, Lng: -180 to 180
  - ✓ Heading: 0-360, Accuracy/Speed: >=0
  
- [X] **T024-4:** Courier shift status kontrolü ekle (only online couriers) ✅
  - 📖 RLS: `db/rls-complete.sql` (courier_locations policies)
  - ✓ shift_status = 'online' validation
  
- [X] **T024-5:** Contract testleri çalıştır ve geç ✅
  ```bash
  pnpm test:contract -- courier-location
  ```
  - [X] **T024-6:** Rate limiting implement et (100 req/min) ✅
  - 📁 File: `lib/rate-limit.ts`
  - ✓ Memory-based rate limiting with configurable limits

### Track 2: Vendor Dashboard 🏪 (PARALLEL) ✅
- [X] **T020-1:** `app/vendor/(dashboard)/page.tsx` güncellendi ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/vendor-api.md`
  - 🧪 Test: `tests/contract/vendor-api.contract.test.ts`
  - ⏱️ Tamamlandı: 2025-10-06
  
- [X] **T020-2:** Dashboard stats API'si oluşturuldu ✅
  - 📖 Contract: Section "GET /api/vendor/dashboard/stats"
  - 📁 Dosya: `src/app/api/vendor/dashboard/stats/route.ts`
  - ✓ Period filtreleme: today, week, month
  - ✓ Revenue, order counts, status breakdown
  - ✓ Top products calculation
  
- [X] **T020-3:** Real-time order updates eklendi ✅
  - 📖 Realtime: `specs/001-kapsam-roller-m/contracts/realtime-channels.md`
  - 📁 Component: `src/components/vendor/DashboardClient.tsx`
  - ✓ Supabase Realtime subscription
  - ✓ New order notifications with sound
  - ✓ Order status update subscriptions
  
- [X] **T020-4:** Order status transition UI mevcut ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/orders-api.md`
  - 📁 API: `src/app/api/orders/[id]/transition/route.ts`
  - ✓ State machine validation
  - ✓ Role-based permissions
  
- [X] **T020-5:** Contract testleri çalıştır
  ```bash
  pnpm test:contract -- vendor-api
  ```

### Track 3: Menu Management 📝 (PARALLEL) ✅
- [X] **T021-1:** `app/vendor/menu/page.tsx` oluşturuldu ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/vendor-api.md`
  - ⏱️ Tamamlandı: 2025-10-06
  - ✓ Product grid with search
  - ✓ Bulk selection & actions
  - ✓ Individual product management
  
- [X] **T021-2:** Products CRUD API integration ✅
  - 📖 Contract: Section "Products Management"
  - 📁 Files:
    * `src/app/api/vendor/products/route.ts` (GET list, POST create)
    * `src/app/api/vendor/products/[id]/route.ts` (PUT update, DELETE)
  - ✓ Full CRUD operations
  - ✓ Name uniqueness validation
  - ✓ Category ownership validation
  - ✓ Soft delete with pending order check
  
- [X] **T021-3:** Bulk availability toggle eklendi ✅
  - 📖 Contract: Section "POST /api/vendor/products/bulk-availability"
  - 📁 File: `src/app/api/vendor/products/bulk-availability/route.ts`
  - ✓ Bulk enable/disable products
  - ✓ Ownership verification
  - ✓ Max 100 products per request
  
- [X] **T021-4:** Image upload placeholder eklendi ✅
  - ✓ UI shows placeholder for missing images
  - ✓ photo_url field in API
  - ⚠️ Real upload Phase 2
  
- [X] **T021-5:** Validation feedback gösteriliyor ✅
  - ✓ Zod schemas in all APIs
  - ✓ Detailed error responses
  - ✓ Field-level validation messages

### Track 4: Vendor Order Management 🎯 (NEW - CRITICAL MISSING)
- [X] **T025-1:** Assign courier endpoint eklendi ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/vendor-api.md`
  - 📁 File: `src/app/api/vendor/orders/[id]/assign-courier/route.ts`
  - ✓ POST assign, DELETE unassign
  - ✓ Full validation chain
  - ✓ Rate limiting integrated
  - ⏱️ Tamamlandı: 2025-10-07
  
- [X] **T025-2:** Available couriers endpoint eklendi ✅
  - 📖 Contract: Section "GET /api/vendor/couriers/available"
  - 📁 File: `src/app/api/vendor/couriers/available/route.ts`
  - ✓ Filter by vehicle type, branch proximity
  - ✓ Exclude busy couriers
  - ✓ Real-time availability check
  - ⏱️ Tamamlandı: 2025-10-07
  
- [X] **T025-3:** Contract tests için courier assignment ✅
  - 📁 File: `tests/contract/vendor-courier-assignment.contract.test.ts`
  - ✓ 15+ test cases covering all scenarios
  - ✓ Error handling validation
  - ✓ Performance tests included

### Track 5: Vendor Başvuru & Müşteri Deneyimi (YENİ)
- [X] **T047:** Kayıt sayfasından vendor başvuru CTA'sı ve formu
- [X] **T047A:** Vendor başvuru verilerini Supabase `vendor_applications` tablosuna işlemek (business name/type, iletişim)
- [X] **T048:** Admin onay e-postası ve vendor dashboard aktivasyonu
- [ ] **T048B:** Vendor başvurusu durumu (pending/onaylandı) için kullanıcı geri bildirimi
- [X] **T052:** Müşteri rolü için basit dashboard / giriş sonrası yönlendirme

---

## 📅 WEEK 6: Courier Dashboard + Tests

### Track 3: Courier Dashboard 🚴 ✅ COMPLETED
- [X] **T023-1:** `app/courier/page.tsx` oluştur ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/courier-location-api.md`
  - ⏱️ Tamamlandı: 2025-10-07
  - ✅ Server component with courier data fetching
  
- [X] **T023-2:** Active delivery card'ı göster ✅
  - ✅ Orange gradient card showing current active delivery
  - ✅ Order details: ID, status, amount, address
  - ✅ Action button for status transitions
  
- [X] **T023-3:** Shift management (online/offline toggle) ✅
  - ✅ Online/offline status indicator
  - ✅ Shift toggle button with loading state
  - ✅ Auto-stop location sharing when going offline
  
- [X] **T023-4:** Location sharing toggle ekle ✅
  - ✅ 15-second interval GPS updates
  - ✅ Integration with courier location API
  - ✅ Error handling for geolocation
  
- [X] **T023-5:** Contract testleri çalıştır ✅
  - ✅ 9/9 contract tests passing
  - ✅ Build successful (4.57 kB courier page)

**🎯 ENHANCEMENTS ADDED:**
- ✅ Order status transition buttons (Pick Up, Start Delivery, Mark Delivered)
- ✅ Real-time order updates via Supabase Realtime
- ✅ Action buttons in orders list
- ✅ Helper functions for status flow management

### Track 4: Complete Tests 🧪 ✅ COMPLETED
- [X] **T080:** Notifications API contract tests yaz ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/notifications-api.md`
  - 📝 Dosya: `tests/contract/notifications-api.contract.spec.ts`
  - 🎯 Hedef: 10 test ✅ ACHIEVED
  - ✅ Web Push subscription validation
  - ✅ Notification types and targeting rules
  - ✅ Error handling and business rules
  
- [X] **T081:** Realtime channels contract tests yaz ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/realtime-channels.md`
  - 📝 Dosya: `tests/contract/realtime-channels.contract.spec.ts`
  - 🎯 Hedef: 7 test ✅ EXCEEDED (11 tests)
  - ✅ Channel architecture and naming conventions
  - ✅ Event handling and RLS security
  - ✅ Performance requirements validation
  
- [X] **T082:** Contract test coverage complete ✅
  - 📊 **TOTAL: 30/30 tests passing** ⭐
  - ✅ All core APIs covered
  - ✅ Realtime and notifications tested
  - ✅ Zero test failures

---

## 📅 WEEK 7-9: Integration ✅ MAJOR PROGRESS!

### Web Push Notifications 🔔 ✅ COMPLETED
- [X] **T025:** `components/PushManager.tsx` oluştur ✅
  - 📖 Research: `specs/001-kapsam-roller-m/research.md` (Section "Web Push")
  - 📁 File: `src/components/PushManager.tsx`
  - ✓ VAPID key integration
  - ✓ Browser support detection
  - ✓ iOS Safari education modal
  - ✓ Device info tracking
  - ⏱️ Tamamlandı: 2025-10-09

- [X] **T026:** Order status change → Push notification trigger ✅
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/notifications-api.md`
  - 📁 Files:
    * `src/lib/notifications/web-push.ts` (VAPID service)
    * `src/app/api/notifications/trigger/route.ts` (Internal trigger)
    * `supabase/migrations/20250110000000_add_order_notification_trigger.sql` (DB trigger)
    * `supabase/migrations/20250110000100_update_notifications_table.sql` (Schema)
    * `public/sw.js` (Service Worker)
  - ✓ 9 notification types implemented
  - ✓ Automatic trigger on order status change
  - ✓ Expired subscription handling
  - ✓ Service Worker with push/click handlers
  - ⏱️ Tamamlandı: 2025-10-09

### Map Integration 🗺️ ✅ COMPLETED
- [X] **T027:** `components/Map.tsx` oluştur (MapLibre GL) ✅
  - 📖 Research: `specs/001-kapsam-roller-m/research.md` (Section "MapLibre")
  - 📁 File: `src/components/Map.tsx`
  - ✓ OpenStreetMap tiles integration
  - ✓ Courier, delivery, branch markers
  - ✓ Animated courier position with heading
  - ✓ Auto-fit bounds and responsive design
  - ✓ SSR-safe with dynamic import
  - ⏱️ Tamamlandı: 2025-10-09

- [X] **T089:** GPS tracking ekle (courier location stream) ✅
  - 📖 Realtime: `specs/001-kapsam-roller-m/contracts/realtime-channels.md`
  - 📁 Files:
    * `src/components/orders/OrderTrackingClient.tsx` (Client updates)
    * `src/app/orders/[id]/page.tsx` (Server-side coords)
  - ✓ Supabase Realtime subscription
  - ✓ 15-second location updates
  - ✓ PostGIS WKT coordinate parsing
  - ✓ Real-time map marker updates
  - ⏱️ Tamamlandı: 2025-10-09

### PWA Features 📱
- [ ] **T028:** `components/InstallPWA.tsx` oluştur
  - 📖 Setup: `public/manifest.webmanifest` kontrol et
  - ⚠️ Service Worker (sw.js) ready, install prompt pending

### Realtime Updates ⚡ (VERIFICATION NEEDED)
- [ ] **T091:** Order status realtime subscription verification
  - 📖 Realtime: `specs/001-kapsam-roller-m/contracts/realtime-channels.md`
  - 📖 Strategy: `specs/001-kapsam-roller-m/testing-strategy.md`
  - ⚠️ Implementation exists in OrderTrackingClient, needs E2E verification
  - ✓ Vendor receives new order notifications (<2s) - IMPLEMENTED
  - ✓ Customer sees status changes in real-time - IMPLEMENTED
  - ✓ RLS prevents cross-customer data access - DB LEVEL

---

## 📅 WEEK 10: Polish & Launch Prep

### Testing & Quality 🧪
- [ ] **T093:** Accessibility audit (WCAG 2.1 AA)
  
- [ ] **T094:** Performance optimization
  - 📖 Budgets: `docs/performance-budgets.md`
  - Run Lighthouse CI
  
- [ ] **T095:** Cross-browser testing (Chrome, Safari, Firefox)
  
- [ ] **T096:** Mobile responsiveness check

### Documentation 📚
- [ ] **T030:** Code comments ekle (complex sections)
  - Priority: `lib/rbac.ts`, `workers/service-worker.ts`

### Launch Checklist 🚀
- [ ] Environment variables configured
- [ ] RLS policies deployed
- [ ] Sentry configured
- [ ] Performance budgets met
- [ ] All contract tests passing
- [ ] E2E tests passing

---

## 🔍 Nasıl Kullanılır?

### 1. Günlük Workflow
```bash
# Sabah
1. Bu TODO.md'yi aç
2. Bugün yapılacak [ ] task'ları seç
3. İlgili contract'ı oku (📖 icon'u takip et)

# Geliştirme sırasında
4. Contract'a uygun implement et
5. Contract test'ini çalıştır
6. Pass olduğunda [X] işaretle

# Akşam
7. Progress güncelle (bu dosyada)
8. Yarın için plan yap
```

### 2. Yeni Developer İçin
```bash
# İlk gün
1. README.md oku
2. docs/DEVELOPMENT-ROADMAP.md oku
3. specs/001-kapsam-roller-m/contracts/ tara
4. npm run test:contract (test'leri gör)

# İkinci gün
5. TODO.md'de [ ] olan ilk task'ı seç
6. Implement et, test et, işaretle
```

### 3. Contract-Driven Development
```
Her task için:
1. Contract'ı oku (📖)
2. Test'i çalıştır (fail görmek için)
3. Implement et
4. Test'i geç (pass)
5. TODO'da işaretle [X]
```

---

## 📊 Progress Tracking

```
Week 5 Progress: [███████████] 18/18 tasks ✅ COMPLETED
  Track 1 (T024): [█████] 6/6 tasks ✅ (+ schema fix)
  Track 2 (T020): [█████] 5/5 tasks ✅
  Track 3 (T021): [█████] 5/5 tasks ✅
  Track 4 (T025): [███] 3/3 tasks ✅ (NEW - kritik eksikler giderildi)

Week 6 Progress: [█████████] 7/7 tasks ✅ FULLY COMPLETED!
  Track 3 (T023): [█████] 5/5 tasks ✅ (Courier Dashboard) ⭐ DONE
  Track 4 (T080-T082): [██] 2/2 tasks ✅ (Contract tests) ⭐ DONE

Week 7-9 Progress: [████████▱▱] 4/6 tasks ✅ MAJOR PROGRESS! 🚀
  Push Notifications (T025-T026): [██] 2/2 tasks ✅ ⭐ DONE
  Map Integration (T027, T089): [██] 2/2 tasks ✅ ⭐ DONE
  PWA Features (T028): [▱] 0/1 tasks (sw.js ready)
  Realtime Verification (T091): [▱] 0/1 tasks (needs E2E test)

Week 10 Progress: [▱▱▱▱▱▱▱▱▱▱] 0/6 tasks

Overall: 29/45 tasks (64% - Week 7-9 almost complete! 🎉)
```

## 🔧 Week 7-9 Completion Summary (2025-10-09) 🚀

**✅ MAJOR FEATURES DELIVERED:**
- 🗺️ **MapLibre Integration:** Full-featured map component with real-time courier tracking
- 📍 **GPS Tracking:** Live location updates every 15 seconds with animated markers
- 🔔 **Push Notifications:** Complete VAPID-based notification system with database triggers
- 📱 **Service Worker:** PWA-ready with push event handling and offline support
- 🔐 **Secure Notifications:** Service role authentication for trigger endpoint
- 🎯 **9 Notification Types:** Comprehensive order lifecycle notifications

**🎯 KEY ACHIEVEMENTS:**
- Real-time map shows courier location with heading indicator
- Automatic push notifications on every order status change
- Service Worker handles notification clicks and opens relevant pages
- PostGIS coordinate parsing for accurate location display
- Database triggers automatically notify all relevant parties
- Expired subscription cleanup and error recovery

**📦 PACKAGES ADDED:**
- `web-push@3.6.7` - VAPID push notification support
- `@types/web-push@3.6.4` - TypeScript definitions
- `maplibre-gl@5.8.0` - Already installed, now fully utilized

**🏗️ ARCHITECTURE IMPLEMENTED:**
```
Order Status Change
  ↓
Database Trigger (Supabase)
  ↓
/api/notifications/trigger (Service Role Auth)
  ↓
web-push.sendNotification (VAPID)
  ↓
Service Worker (sw.js)
  ↓
User Notification 🔔
```

**📊 METRICS:**
- Build Size: 24 routes compiled successfully
- Map Component: Dynamic import for SSR safety
- Notification Service: 9 order types + courier assignment
- Service Worker: Push events, notification clicks, caching ready

---

## 🔧 Week 5 Completion Summary (2025-10-07)

**✅ MAJOR ISSUES RESOLVED:**
- 🗄️ **Schema Mismatch FIXED:** `courier_locations` table now has all required fields
- 🚨 **Missing APIs ADDED:** Assign courier and available couriers endpoints
- ⚡ **Rate Limiting IMPLEMENTED:** All APIs now have proper rate limiting
- 🧪 **Additional Tests ADDED:** Comprehensive vendor API contract tests
- 📋 **Documentation UPDATED:** TODO.md now reflects reality

**🎯 KEY ACHIEVEMENTS:**
- Database schema now matches RPC function expectations
- All contract-defined vendor endpoints are implemented
- Rate limiting matches contract specifications (100 req/min for location, 200 req/min for vendor)
- Error handling follows contract patterns
- Logging and monitoring integrated throughout

---

## 🆘 Yardım

### Takılırsan:
1. Contract'ı tekrar oku
2. Contract test'e bak (ne beklendiğini gösterir)
3. RLS policies'i kontrol et (`db/rls-complete.sql`)
4. Logger kullan (`lib/logger.ts`)

### Dokumentasyon:
- 📖 Contracts: `specs/001-kapsam-roller-m/contracts/`
- 🗄️ Database: `specs/001-kapsam-roller-m/data-model.md`
- 🧪 Tests: `tests/contract/README.md`
- 📋 Tasks: `specs/001-kapsam-roller-m/tasks.md`
- 🗺️ Plan: `specs/001-kapsam-roller-m/plan.md`

---

**🎯 Odak:** Contract-first, Test-driven, Security-focused
**🚀 Hedef:** Week 10 sonunda production-ready MVP
**✅ İlke:** Her task tamamlanınca işaretle, momentum kaybet!

----

## 📅 WEEK 11: Production Hardening 🚀 (AFTER Week 10)

**Objective**: Migrate from development-grade to production-ready infrastructure  
**Related Docs**: `specs/001-kapsam-roller-m/production-hardening.md`

### Infrastructure 🏗️
- [ ] **T100:** Redis-based rate limiting migration
  - 📖 Current: In-memory Map (dev only)
  - 🎯 Target: Upstash Redis with graceful fallback
  - 📁 Files: `lib/rate-limit-redis.ts`, `lib/rate-limit.ts` (update)
  - ✓ Zero downtime migration
  - ✓ Latency impact ≤10ms per request
  - ✓ Works across multiple app instances
  
- [ ] **T101:** Enhanced monitoring and health checks  
  - 📁 Files: `src/app/api/health/route.ts`, `lib/metrics.ts`
  - ✓ Database, Redis, Realtime health checks
  - ✓ Custom business metrics (orders, courier locations)
  - ✓ Sentry integration with sensitive data filtering
  
- [ ] **T102:** Security hardening implementation
  - 📁 Files: `middleware.ts` (enhanced), `lib/env.ts`
  - ✓ Security headers (HSTS, CSP, XSS protection)
  - ✓ Environment variable validation (Zod schema)
  - ✓ Error log sanitization

### Database & Performance 📊
- [ ] **T103:** Database index optimization
  - 📖 Strategy: `specs/001-kapsam-roller-m/production-hardening.md`
  - ✓ Add production indexes (orders_status_created, courier_locations_order)
  - ✓ Partial indexes for active data only
  - ✓ Query performance monitoring setup
  
- [ ] **T108:** Bundle optimization and caching
  - 📁 Files: `next.config.ts`, `lib/cache.ts`
  - ✓ Bundle size ≤250KB gzipped (webpack-bundle-analyzer)
  - ✓ API response caching (Next.js unstable_cache)
  - ✓ Static asset cache headers (1 year TTL)

### Deployment Pipeline 🔄
- [ ] **T104:** GitHub Actions production workflow
  - 📁 File: `.github/workflows/production-deploy.yml`
  - ✓ Staging → E2E tests → Production deployment
  - ✓ Health check validation post-deployment
  - ✓ Automated rollback on failure
  
- [ ] **T105:** Database migration automation
  - 📁 File: `scripts/migrate.ts`
  - ✓ Zero-downtime migration execution
  - ✓ Version tracking and rollback capability
  - ✓ Pre-migration validation

### Testing & Validation 🧪
- [ ] **T106:** Staging environment validation
  - ✓ Full production-like environment setup
  - ✓ Redis, monitoring, security headers testing
  - ✓ Load testing with realistic data volumes
  
- [ ] **T109:** Load testing with production scale
  - 📖 Strategy: `specs/001-kapsam-roller-m/testing-strategy.md`
  - ✓ 50 concurrent couriers × 4 updates/min = 200 location updates/min
  - ✓ 100 concurrent vendors, 500 concurrent customers
  - ✓ p95 latency ≤400ms, realtime latency ≤2s
  - ✓ Rate limiting effectiveness validation

### Security & Reliability 🔐
- [ ] **T107:** Production deployment dry run
  - ✓ Complete deployment simulation on staging
  - ✓ Rollback procedure testing
  - ✓ Configuration validation
  
- [ ] **T110:** Disaster recovery testing
  - ✓ Database backup/restore procedure
  - ✓ Application recovery from outage
  - ✓ RTO ≤4 hours, RPO ≤15 minutes validation
  
- [ ] **T111:** Final security audit
  - ✓ Security headers validation (securityheaders.com score ≥A)
  - ✓ Penetration testing (rate limiting, input validation)
  - ✓ Data privacy compliance check
