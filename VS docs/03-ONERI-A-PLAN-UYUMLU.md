# 📘 Öneri A: Plan.md'ye Sıkı Sıkıya Bağlı Kalma Yaklaşımı

**Yaklaşım Adı**: Akademik / Plan-Uyumlu  
**Süre**: 7-10 hafta  
**Risk Seviyesi**: 🟢 Düşük  
**Uygunluk**: Güvenlik ve kalite odaklı projeler

---

## 🎯 Genel Felsefe

Bu yaklaşım, **plan.md'nin orijinal vizyonuna tamamen sadık** kalır. Her Phase sırasıyla tamamlanır, hiçbir adım atlanmaz. Akademik ve metodolojik olarak en doğru yaklaşımdır.

### Temel Prensipler

1. **Phase sırasına kesinlikle uyulur**: 0 → 1 → 2 → 3
2. **Constitution gaps önce kapatılır**
3. **Her deliverable tamamlanmadan sonraki Phase'e geçilmez**
4. **Test-first development (TDD) korunur**
5. **Documentation-first approach**

---

## 📋 Detaylı Planlama

### **HAFTA 1-3: Phase 1 - Design & Contracts**

#### Hafta 1: API Contracts & Spec

**Gün 1-2: Contracts Klasörü ve Temel Yapı**

```bash
1. Klasör oluşturma
   mkdir -p contracts/{api,tests}
   mkdir -p contracts/schemas

2. API Endpoint Documentation
   contracts/api/
   ├── orders-api.md
   ├── vendor-api.md
   ├── courier-api.md
   ├── notifications-api.md
   └── admin-api.md

3. Her dosya için OpenAPI 3.0 spec
   - Endpoint definitions
   - Request/Response schemas
   - Error codes
   - Auth requirements
```

**Örnek: orders-api.md**

```markdown
# Orders API Contract

## POST /api/orders
Create a new order.

### Request
```json
{
  "customer_id": "uuid",
  "branch_id": "uuid",
  "type": "delivery" | "pickup",
  "items": [
    {
      "product_id": "uuid",
      "quantity": number
    }
  ],
  "address_text": "string (if delivery)",
  "geo_point": { "lat": number, "lng": number },
  "payment_method": "cash" | "card_on_pickup"
}
```

### Response (201)
```json
{
  "order_id": "uuid",
  "status": "NEW",
  "estimated_time": number,
  "total": number
}
```

### Errors
- 400: Invalid request
- 401: Unauthorized
- 404: Branch/Product not found
```

**Gün 3-5: Contract Tests**

```bash
1. Contract test framework setup
   npm install --save-dev @pact-foundation/pact

2. Test yazımı
   contracts/tests/
   ├── orders.contract.test.ts
   ├── vendor.contract.test.ts
   └── courier.contract.test.ts

3. Fail durumda olmalı (henüz implementation yok)
   npm run test:contract
   # Expected: All FAIL
```

**Örnek: orders.contract.test.ts**

```typescript
import { PactV3 } from '@pact-foundation/pact';

describe('Orders API Contract', () => {
  it('POST /api/orders creates order', async () => {
    const provider = new PactV3({
      consumer: 'Customer Frontend',
      provider: 'Orders API',
    });

    await provider
      .addInteraction({
        states: [{ description: 'customer and branch exist' }],
        uponReceiving: 'a request to create order',
        withRequest: {
          method: 'POST',
          path: '/api/orders',
          body: {
            customer_id: 'uuid',
            branch_id: 'uuid',
            type: 'delivery',
            items: [/* ... */],
          },
        },
        willRespondWith: {
          status: 201,
          body: {
            order_id: like('uuid'),
            status: 'NEW',
          },
        },
      })
      .executeTest(async (mockServer) => {
        // Test implementation
        const response = await fetch(`${mockServer.url}/api/orders`, {
          method: 'POST',
          body: JSON.stringify({/* ... */}),
        });
        
        expect(response.status).toBe(201);
      });
  });
});
```

---

#### Hafta 2: Security & RBAC

**Gün 6-7: RLS Policies Review**

```bash
1. Mevcut politikaları analiz et
   cat db/rls.sql > db/rls-backup.sql
   
2. Granular policies ekle
   db/rls.sql güncelle:
   - orders table: INSERT policies per role
   - order_items: CASCADE restrictions
   - courier_location: Only own courier can UPDATE
   - notifications: Role-based READ

3. Test policies
   - Supabase dashboard'da test
   - psql ile manual verification
```

**Örnek: Güncellenmiş RLS**

```sql
-- BEFORE (Basit)
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

-- AFTER (Granular)
CREATE POLICY "Customers can create delivery orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = customer_id 
    AND type = 'delivery'
    AND EXISTS (
      SELECT 1 FROM branches 
      WHERE id = branch_id 
      AND ST_DWithin(
        delivery_zone_geojson::geometry,
        geo_point::geometry,
        0
      )
    )
  );

CREATE POLICY "Vendors can update their order status"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM branches b
      JOIN vendors v ON v.id = b.vendor_id
      WHERE b.id = orders.branch_id
      AND v.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Only allow specific status transitions
    (status = 'NEW' AND NEW.status = 'CONFIRMED') OR
    (status = 'CONFIRMED' AND NEW.status = 'PREPARING') OR
    (status = 'PREPARING' AND NEW.status = 'READY')
  );
```

**Gün 8-10: RBAC Middleware Complete**

```bash
1. lib/rbac.ts dosyasını tamamla
   - Role extraction from JWT
   - Permission checking functions
   - Guard decorators

2. Next.js middleware integration
   - middleware.ts güncelle
   - Role-based routing
   - API route protection

3. Tests
   - tests/unit/rbac.spec.ts güncelle
   - Edge cases cover et
```

**Örnek: lib/rbac.ts**

```typescript
import { createClient } from './supabase/server';

export type Role = 'customer' | 'vendor_admin' | 'courier' | 'admin';

export interface UserRole {
  userId: string;
  role: Role;
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser) return null;

  return {
    userId: user.id,
    role: dbUser.role as Role,
  };
}

export function requireRole(allowedRoles: Role[]) {
  return async () => {
    const userRole = await getCurrentUserRole();
    
    if (!userRole) {
      throw new Error('Unauthorized');
    }

    if (!allowedRoles.includes(userRole.role)) {
      throw new Error('Forbidden');
    }

    return userRole;
  };
}

// Usage in API routes:
// const userRole = await requireRole(['vendor_admin'])();
```

---

#### Hafta 3: Observability & Performance Planning

**Gün 11-12: Logging Infrastructure**

```bash
1. Structured logging setup
   npm install winston
   
2. Logger yapılandırması
   lib/logger.ts oluştur
   - Log levels (error, warn, info, debug)
   - Structured format (JSON)
   - Supabase log table integration

3. Event schema tanımla
   db/migrations/add_logs_table.sql
```

**Örnek: lib/logger.ts**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'kapgel-api' },
  transports: [
    new winston.transports.Console(),
    // Production'da Supabase log table'a yazılır
  ],
});

export default logger;

// Usage:
// logger.info('Order created', { orderId, customerId });
// logger.error('Payment failed', { error, orderId });
```

**Gün 13-14: APM Integration**

```bash
1. Sentry kurulumu
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs

2. sentry.client.config.ts ve sentry.server.config.ts
   - DSN configuration
   - Environment tagging
   - User context

3. Error boundaries
   - src/app/error.tsx
   - src/app/global-error.tsx
```

**Gün 15: Performance Budgets**

```markdown
# performance-budgets.md oluştur

## Performance Budgets

### Core Web Vitals Targets
- LCP (Largest Contentful Paint): ≤ 2.5s
- FID (First Input Delay): ≤ 100ms
- CLS (Cumulative Layout Shift): ≤ 0.1

### Bundle Size Limits
- Initial JS: ≤ 170KB (gzipped)
- Total JS: ≤ 350KB (gzipped)
- CSS: ≤ 50KB (gzipped)

### API Response Times
- Order creation: ≤ 500ms (p95)
- Menu fetch: ≤ 200ms (p95)
- Location update: ≤ 100ms (p95)

### Monitoring
- Lighthouse CI integration
- Real User Monitoring (RUM) via Vercel Analytics
```

---

### **HAFTA 4: Phase 2 - Task Planning Refresh**

#### Gün 16-17: tasks.md Revizyon

```bash
1. Mevcut task statuslerini düzelt
   - [X] işaretli ama partial olanları [~] yap
   - Tamamlanma yüzdesi ekle
   - Kalan TODO listesi belirt

2. Phase 1 çıktılarına göre yeni tasklar ekle
   - T034-T040: Contract implementation tasks
   - T041-T045: Security hardening tasks
   - T046-T050: Observability tasks

3. Bağımlılıkları güncelle
   - T022 depends on T034 (order transition contract)
   - T024 depends on T036 (location API contract)
```

**Örnek: Güncellenmiş tasks.md**

```markdown
## Phase 3.3: Customer Flow (REVISED)

- [~] T014 [P] Implement city selection page (20% - basic, needs UI enhancement)
  - TODO: Add search functionality
  - TODO: Add recent cities
  - TODO: Add map preview
  
- [~] T017 [P] Implement checkout page (40% - skeleton + TODOs)
  - TODO: Implement order creation API call
  - TODO: Add address autocomplete
  - TODO: Add payment validation
  - TODO: Replace with shadcn/ui components

## Phase 1: Contracts (NEW)

- [X] T034 Document order lifecycle API (contracts/api/orders-api.md)
- [X] T035 Write contract tests for orders (contracts/tests/orders.contract.test.ts)
- [X] T036 Document courier location API
- [X] T037 Write contract tests for courier endpoints
- [ ] T038 Implement order transition API per contract
- [ ] T039 Implement location API per contract
```

#### Gün 18-19: Parallel Track Planning

```markdown
# parallel-tracks.md oluştur

## Execution Tracks (Weeks 5-10)

### Track 1: Security & Compliance (Weeks 5-6)
Owner: Backend Team
- RLS policies finalization
- RBAC enforcement
- Admin gating
- Audit logging
Dependencies: Phase 1 complete

### Track 2: Vendor Panel (Weeks 5-7)
Owner: Frontend Team
- T020A-C: Dashboard UI + Integration
- T021A-B: Menu CRUD UI + API
Dependencies: T038 (order transition API)

### Track 3: Courier Panel (Weeks 6-8)
Owner: Mobile Team
- T023A-C: Dashboard UI + Integration
- T024A-B: Location API + GPS
Dependencies: T039 (location API)

### Track 4: Integration (Weeks 7-9)
Owner: Full Stack Team
- T025-T026: Web Push
- T027: MapLibre
- T028: PWA Install
Dependencies: Tracks 1-3 in progress

### Track 5: Customer Enhancements (Weeks 8-10)
Owner: Frontend Team
- T017-T018 completion
- Real-time tracking
- Advanced filters
Dependencies: Track 4 complete
```

#### Gün 20: Milestone Definition

```markdown
# milestones.md oluştur

## Project Milestones

### M1: Foundation Complete (Week 4)
- ✅ Phase 0: Research
- ✅ Phase 1: Contracts
- ✅ Phase 2: Planning
- ✅ Phase 3.1-3.2: Setup & Tests

Exit Criteria:
- All contract tests pass
- RLS policies reviewed
- RBAC middleware complete
- Observability infrastructure ready

### M2: Core Features (Week 7)
- Vendor dashboard functional
- Courier dashboard functional
- Order state machine working
- Location tracking active

Exit Criteria:
- E2E tests pass for vendor flow
- E2E tests pass for courier flow
- Real orders can be processed
- Couriers can update location

### M3: Integration Complete (Week 9)
- Web Push notifications
- Map integration
- PWA install prompt
- Customer tracking enhanced

Exit Criteria:
- Push notifications work
- Map shows courier location
- PWA installable on mobile
- Customer can track in real-time

### M4: Production Ready (Week 10)
- Performance optimization
- Accessibility audit
- Security review
- Documentation complete

Exit Criteria:
- Lighthouse score ≥ 90
- WCAG AA compliance
- Security audit passed
- Runbook complete
```

---

### **HAFTA 5-7: Phase 3.4 - Vendor & Courier Implementation**

#### Hafta 5: Vendor Dashboard (Backend-First)

**Gün 21-22: Order Transition API**

```bash
1. API Implementation (T038)
   src/app/api/orders/[id]/transition/route.ts
   
2. State machine logic
   - NEW → CONFIRMED
   - CONFIRMED → PREPARING
   - PREPARING → READY
   - READY → PICKED_UP (courier)
   - PICKED_UP → DELIVERED

3. Validation & Guards
   - Role-based transitions
   - Business rules enforcement
   - Event logging

4. Tests
   - Unit tests for state machine
   - Integration tests
   - Contract tests validation
```

**Örnek: Transition API**

```typescript
// src/app/api/orders/[id]/transition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/supabase/server';
import { requireRole } from 'lib/rbac';
import logger from 'lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth & Role check
    const userRole = await requireRole(['vendor_admin', 'courier'])();
    
    const { newStatus } = await req.json();
    const orderId = params.id;

    // Fetch current order
    const supabase = createClient();
    const { data: order } = await supabase
      .from('orders')
      .select('status, branch_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate transition
    const validTransitions = {
      NEW: ['CONFIRMED', 'REJECTED'],
      CONFIRMED: ['PREPARING'],
      PREPARING: ['READY'],
      // ...
    };

    if (!validTransitions[order.status]?.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid state transition' },
        { status: 400 }
      );
    }

    // Update order
    const { data: updated } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    // Log event
    await supabase.from('events').insert({
      order_id: orderId,
      type: 'ORDER_STATUS_CHANGED',
      payload_json: {
        oldStatus: order.status,
        newStatus,
        changedBy: userRole.userId,
      },
    });

    logger.info('Order status changed', {
      orderId,
      oldStatus: order.status,
      newStatus,
      userId: userRole.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Order transition failed', { error, orderId: params.id });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Gün 23-25: Vendor Dashboard UI**

```bash
1. Klasör yapısı
   src/app/vendor/
   ├── (dashboard)/
   │   ├── page.tsx
   │   └── layout.tsx
   ├── menu/
   │   └── page.tsx
   └── layout.tsx

2. Component oluşturma
   src/components/vendor/
   ├── OrdersTable.tsx
   ├── StatsCards.tsx
   ├── StatusBadge.tsx
   └── OrderActionsMenu.tsx

3. Supabase Integration
   - Real-time subscriptions
   - Optimistic updates
   - Error handling

4. Tests
   - Component tests
   - E2E tests update
```

**NOT**: UI implementation'da prototipten yararlanılabilir ama plan.md'nin TDD approach'una uygun olarak önce API, sonra UI şeklinde ilerlenmelidir.

---

#### Hafta 6-7: Courier Dashboard

**Benzer yaklaşım**:
1. Location API implementation (T039)
2. Courier dashboard UI (T023)
3. GPS tracking logic
4. Real-time location updates

---

### **HAFTA 8-9: Phase 3.5 - Integration & Polish**

#### Hafta 8: Real-time & Notifications

```bash
Gün 36-37: Supabase Realtime Channels
Gün 38-40: Web Push Implementation
```

#### Hafta 9: Maps & PWA

```bash
Gün 41-42: MapLibre Integration
Gün 43-45: PWA Features & Polish
```

---

### **HAFTA 10: Finalization & Launch Prep**

#### Performance Optimization

```bash
1. Bundle analysis
   npm run build -- --analyze
   
2. Code splitting
3. Image optimization
4. Lazy loading
```

#### Accessibility Audit

```bash
1. axe-core tests
2. Keyboard navigation
3. Screen reader testing
4. WCAG AA checklist
```

#### Security Review

```bash
1. Penetration testing
2. RLS verification
3. Auth flow review
4. Rate limiting
```

#### Documentation

```bash
1. API documentation (OpenAPI to Swagger UI)
2. Deployment runbook
3. Monitoring playbook
4. Incident response guide
```

---

## 📊 Tamamlanma Takvimi

```
Week 1:  [████████░░░░░░░░░░░░░░░░░░] 10% - API Contracts
Week 2:  [████████████░░░░░░░░░░░░░░] 20% - Security Hardening
Week 3:  [████████████████░░░░░░░░░░] 30% - Observability
Week 4:  [████████████████████░░░░░░] 40% - Task Planning
Week 5:  [████████████████████████░░] 50% - Vendor API
Week 6:  [██████████████████████████] 60% - Vendor UI
Week 7:  [██████████████████████████] 70% - Courier Dashboard
Week 8:  [██████████████████████████] 80% - Real-time
Week 9:  [██████████████████████████] 90% - Maps & PWA
Week 10: [██████████████████████████] 100% - Launch Ready
```

---

## ✅장점 (Artılar)

### 1. Plan.md'ye Tam Uyum ✅
- Hiçbir phase atlanmaz
- Her deliverable tamamlanır
- Constitution gaps kapatılır

### 2. En Güvenli Yaklaşım ✅
- RLS policies tam review edilir
- RBAC complete olur
- Security audit kapsamlı

### 3. En Kaliteli Çıktı ✅
- Contract-first development
- Test coverage yüksek
- Documentation eksiksiz
- Observability tam

### 4. Uzun Vadede Maintainable ✅
- Solid architecture
- Clear contracts
- Well-documented
- Scalable

### 5. Production-Ready ✅
- Performance optimized
- Accessibility compliant
- Security hardened
- Monitoring complete

---

## ❌ Dezavantajlar (Eksiler)

### 1. Yavaş Başlangıç ⏱️
- İlk 3-4 hafta görsel ilerleme YOK
- Stakeholder'lara demo geç
- Team motivasyonu düşük olabilir

### 2. Uzun Süre 📅
- 7-10 hafta toplam
- İlk kullanıcı testi geç
- Market feedback gecikmeli

### 3. Front-loading Risk ⚠️
- Çok fazla upfront planning
- Bazı planlar değişebilir
- Over-engineering riski

### 4. Team Coordination Zorluğu 👥
- Sıkı sıralama bağımlılıklar yaratır
- Parallel work sınırlı (ilk 4 hafta)
- Blocking issues impact yüksek

---

## 🎯 Uygun Projeler

Bu yaklaşım şu durumlarda ideal:

✅ **Güvenlik kritik**: Healthcare, fintech, government  
✅ **Compliance gerekli**: GDPR, HIPAA, SOC2  
✅ **Büyük scale hedef**: Milyonlarca kullanıcı  
✅ **Uzun ömürlü**: 5+ yıl kullanılacak  
✅ **Team deneyimli**: Senior developers  
✅ **Bütçe bol**: Zaman ve para kısıtı yok

❌ **UYGUN DEĞİL** eğer:
- Hızlı MVP gerekli
- Startup/bootstrap
- Sıkı deadline var
- Stakeholder demolar erken gerekli

---

## 💡 Başarı Kriterleri

### Exit Criteria (Week 10)

- [ ] All contract tests pass
- [ ] E2E tests %95+ coverage
- [ ] Lighthouse score ≥ 90
- [ ] WCAG AA compliant
- [ ] Security audit passed
- [ ] RLS policies reviewed & approved
- [ ] RBAC fully functional
- [ ] Observability dashboards live
- [ ] Performance budgets met
- [ ] Documentation complete
- [ ] Runbook ready
- [ ] Incident response plan ready

### KPIs

- **Code Quality**: SonarQube A rating
- **Test Coverage**: ≥ 80%
- **Performance**: All Core Web Vitals green
- **Security**: Zero high/critical vulnerabilities
- **Accessibility**: Zero axe-core violations

---

## 📚 Deliverables

### Week 4 (Phase 1-2 Complete)
- ✅ contracts/ folder with OpenAPI specs
- ✅ Contract tests (all pass)
- ✅ RLS policies reviewed
- ✅ RBAC middleware complete
- ✅ Observability infrastructure
- ✅ Performance budgets defined
- ✅ tasks.md refreshed
- ✅ Parallel tracks defined

### Week 7 (Core Features)
- ✅ Vendor dashboard functional
- ✅ Courier dashboard functional
- ✅ Order state machine working
- ✅ Location tracking active

### Week 10 (Launch Ready)
- ✅ All features implemented
- ✅ Integration complete
- ✅ Performance optimized
- ✅ Security hardened
- ✅ Documentation complete

---

## 🎬 Sonuç

**Öneri A**, plan.md'nin **ruhuna tamamen sadık**, akademik olarak **en doğru** ve **en güvenli** yaklaşımdır. 

**Seçilmeli** eğer:
- Zaman ve bütçe kısıtı yok
- Kalite ve güvenlik öncelik
- Uzun vadeli maintainability önemli
- Deneyimli team var

**Seçilmemeli** eğer:
- Hızlı MVP şart
- Stakeholder demolar erken gerekli
- Bootstrap/startup ortamı
- Team küçük ve hızlı iterate etmeli

---

**Sonraki**: Öneri B (Pragmatik/Hızlı UI) yaklaşımını inceleyin.
