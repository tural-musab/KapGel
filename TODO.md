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
  
- [X] **T024-3:** Coordinate validation ekle (lat/lng range checks) ✅
  - 📖 Contract: Section "Validation Rules"
  - ✓ Lat: -90 to 90, Lng: -180 to 180
  - ✓ Heading: 0-360, Accuracy/Speed: >=0
  
- [X] **T024-4:** Courier shift status kontrolü ekle (only online couriers) ✅
  - 📖 RLS: `db/rls-complete.sql` (courier_locations policies)
  - ✓ shift_status = 'online' validation
  
- [ ] **T024-5:** Contract testleri çalıştır ve geç
  ```bash
  pnpm test:contract -- courier-location
  ```

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
  
- [ ] **T020-5:** Contract testleri çalıştır
  ```bash
  pnpm test:contract -- vendor-api
  ```

### Track 3: Menu Management 📝 (PARALLEL)
- [ ] **T021-1:** `app/vendor/menu/page.tsx` oluştur
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/vendor-api.md`
  - ⏱️ Süre: 3 gün
  
- [ ] **T021-2:** Products CRUD API integration
  - 📖 Contract: Section "Products Management"
  - POST /api/vendor/products
  - PUT /api/vendor/products/:id
  - DELETE /api/vendor/products/:id
  
- [ ] **T021-3:** Bulk availability toggle ekle
  - 📖 Contract: Section "POST /api/vendor/products/bulk-availability"
  
- [ ] **T021-4:** Image upload için placeholder ekle (Phase 2'de real upload)
  
- [ ] **T021-5:** Validation feedback göster (Zod schemas kullan)

---

## 📅 WEEK 6: Courier Dashboard + Tests

### Track 3: Courier Dashboard 🚴
- [ ] **T023-1:** `app/courier/page.tsx` oluştur
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/courier-location-api.md`
  - ⏱️ Süre: 3 gün
  - ⚠️ BLOCKER: T024 tamamlanmalı
  
- [ ] **T023-2:** Active delivery card'ı göster
  
- [ ] **T023-3:** Shift management (online/offline toggle)
  
- [ ] **T023-4:** Location sharing toggle ekle
  
- [ ] **T023-5:** Contract testleri çalıştır

### Track 4: Complete Tests 🧪 (Week 6 Sonu)
- [ ] **T080:** Notifications API contract tests yaz
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/notifications-api.md`
  - 📝 Dosya: `tests/contract/notifications-api.contract.test.ts`
  - 🎯 Hedef: 10 test
  
- [ ] **T081:** Realtime channels contract tests yaz
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/realtime-channels.md`
  - 📝 Dosya: `tests/contract/realtime-channels.contract.test.ts`
  - 🎯 Hedef: 7 test

---

## 📅 WEEK 7-9: Integration

### Web Push Notifications 🔔
- [ ] **T025:** `components/PushManager.tsx` oluştur
  - 📖 Research: `specs/001-kapsam-roller-m/research.md` (Section "Web Push")
  
- [ ] **T026:** Order status change → Push notification trigger
  - 📖 Contract: `specs/001-kapsam-roller-m/contracts/notifications-api.md`

### Map Integration 🗺️
- [ ] **T027:** `components/Map.tsx` oluştur (MapLibre GL)
  - 📖 Research: `specs/001-kapsam-roller-m/research.md` (Section "MapLibre")
  
- [ ] **T089:** GPS tracking ekle (courier location stream)
  - 📖 Realtime: `specs/001-kapsam-roller-m/contracts/realtime-channels.md`

### PWA Features 📱
- [ ] **T028:** `components/InstallPWA.tsx` oluştur
  - 📖 Setup: `public/manifest.webmanifest` kontrol et

### Realtime Updates ⚡
- [ ] **T091:** Order status realtime subscription
  - 📖 Realtime: `specs/001-kapsam-roller-m/contracts/realtime-channels.md`
  
- [ ] **T092:** Courier location realtime stream
  - 📖 Realtime: Section "Courier Location Channel"

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
Week 5 Progress: [▱▱▱▱▱▱▱▱▱▱] 0/15 tasks
  Track 1 (T024): [▱▱▱▱▱] 0/5 tasks
  Track 2 (T020): [▱▱▱▱▱] 0/5 tasks
  Track 3 (T021): [▱▱▱▱▱] 0/5 tasks

Week 6 Progress: [▱▱▱▱▱▱▱▱▱▱] 0/7 tasks
Week 7-9 Progress: [▱▱▱▱▱▱▱▱▱▱] 0/8 tasks
Week 10 Progress: [▱▱▱▱▱▱▱▱▱▱] 0/6 tasks

Overall: 0/36 tasks (0%)
```

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
