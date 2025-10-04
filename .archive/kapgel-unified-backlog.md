# KapGel - Birleşik Priority Backlog ve Aksiyon Planı

**Tarih:** 30 Eylül 2025  
**Kaynaklar:** İki bağımsız code review + Spec-Kit analizi  
**Toplam Kritik Sorun:** 11 adet  
**Tahmini Düzeltme Süresi:** 2-3 hafta (full-time)

---

## 🚨 **CRITICAL - Bu Hafta (1-5 gün)**

### 🔴 **P0: Güvenlik ve Veri Bütünlüğü**

#### **#1: RLS Policy - Vendor Admin Bypass**

**Durum:** 🔴 PRODUCTION BLOCKER  
**Etki:** Her authenticated user tüm siparişleri görebilir  
**Süre:** 2 saat

```sql
-- db/migrations/001_fix_vendor_admin_rls.sql

-- ❌ Mevcut hatalı policy'i kaldır
DROP POLICY IF EXISTS "Vendor admins can view their branch orders" ON orders;

-- ✅ Doğru policy ekle
CREATE POLICY "Vendor admins can view their branch orders" ON orders 
FOR SELECT 
USING (
  branch_id IN (
    SELECT b.id 
    FROM branches b
    JOIN vendors v ON v.id = b.vendor_id
    WHERE v.owner_user_id = auth.uid()
  )
);

-- UPDATE/DELETE için de benzer policies
CREATE POLICY "Vendor admins can update their branch orders" ON orders
FOR UPDATE
USING (
  branch_id IN (
    SELECT b.id 
    FROM branches b
    JOIN vendors v ON v.id = b.vendor_id
    WHERE v.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  branch_id IN (
    SELECT b.id 
    FROM branches b
    JOIN vendors v ON v.id = b.vendor_id
    WHERE v.owner_user_id = auth.uid()
  )
);
```

**Test:**

```typescript
// tests/unit/rls-vendor-admin.spec.ts
describe('Vendor Admin RLS', () => {
  it('cannot read orders from other vendors', async () => {
    const vendor1 = await createTestVendor();
    const vendor2 = await createTestVendor();
    const order = await createTestOrder({ branchId: vendor2.branchId });
    
    const { data } = await supabase
      .from('orders')
      .select()
      .eq('id', order.id)
      .auth(vendor1.token);
    
    expect(data).toEqual([]); // Should be empty
  });
});
```

---

#### **#2: RBAC - canAccess() Multi-Tenant Bypass**

**Durum:** 🔴 CRITICAL  
**Etki:** Vendor'lar birbirlerinin datalarını mutate edebilir  
**Süre:** 3 saat

```typescript
// lib/rbac.ts - Tamamen yeniden yaz

export type Role = 'customer' | 'vendor_admin' | 'courier' | 'admin';
export type Action = 'read' | 'create' | 'update' | 'delete' | 'transition';

interface AuthContext {
  role: Role;
  userId: string;
  vendorIds?: string[]; // JWT claim'den gelecek
  courierId?: string;   // JWT claim'den gelecek
}

interface OrderResource {
  type: 'order';
  id: string;
  customerId?: string;
  branchId?: string;
  vendorId?: string;
  courierId?: string | null;
}

export async function canAccess(
  ctx: AuthContext,
  resource: OrderResource,
  action: Action
): Promise<boolean> {
  // Admin bypass
  if (ctx.role === 'admin') return true;

  if (resource.type === 'order') {
    switch (ctx.role) {
      case 'customer':
        if (action === 'create') return true;
        if (action === 'read') return resource.customerId === ctx.userId;
        if (action === 'update' && resource.customerId === ctx.userId) {
          // Sadece CANCEL edebilir
          return true;
        }
        return false;

      case 'vendor_admin':
        // ✅ KRITIK: Vendor ownership kontrolü
        if (!ctx.vendorIds?.includes(resource.vendorId || '')) {
          return false; // Bu vendor'a ait değil!
        }
        return ['read', 'update', 'transition'].includes(action);

      case 'courier':
        // ✅ KRITIK: Courier ID karşılaştırması
        const isAssigned = resource.courierId === ctx.courierId;
        if (!isAssigned) return false;
        return ['read', 'update', 'transition'].includes(action);

      default:
        return false;
    }
  }

  return false;
}

// Helper: JWT'den context oluştur
export async function getAuthContext(supabase: SupabaseClient): Promise<AuthContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser) return null;

  const ctx: AuthContext = {
    role: dbUser.role as Role,
    userId: user.id,
  };

  // Vendor admin ise vendor IDs çek
  if (ctx.role === 'vendor_admin') {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id')
      .eq('owner_user_id', user.id);
    ctx.vendorIds = vendors?.map(v => v.id) || [];
  }

  // Courier ise courier ID çek
  if (ctx.role === 'courier') {
    const { data: courier } = await supabase
      .from('couriers')
      .select('id')
      .eq('user_id', user.id)
      .single();
    ctx.courierId = courier?.id;
  }

  return ctx;
}
```

**Kullanım:**

```typescript
// src/app/api/orders/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const ctx = await getAuthContext(supabase);
  
  if (!ctx) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Order'ı çek
  const { data: order } = await supabase
    .from('orders')
    .select('*, branches(vendor_id)')
    .eq('id', params.id)
    .single();

  if (!order) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // RBAC kontrolü
  const resource: OrderResource = {
    type: 'order',
    id: order.id,
    customerId: order.customer_id,
    vendorId: order.branches?.vendor_id,
    courierId: order.courier_id,
  };

  if (!await canAccess(ctx, resource, 'update')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update logic...
}
```

---

#### **#3: Courier RBAC Matching Logic**

**Durum:** 🔴 CRITICAL  
**Etki:** Kuryeler atanmış siparişleri göremez  
**Süre:** 30 dakika

**Fix:** Yukarıdaki #2'deki `getAuthContext()` ve `canAccess()` düzeltmesi zaten bu sorunu çözüyor. Ek olarak:

```sql
-- db/migrations/002_fix_courier_rls.sql

DROP POLICY IF EXISTS "Couriers can view their assigned orders" ON orders;

CREATE POLICY "Couriers can view their assigned orders" ON orders
FOR SELECT
USING (
  courier_id = (
    SELECT id FROM couriers WHERE user_id = auth.uid()
  )
);

-- Courier location updates
CREATE POLICY "Couriers can log their own location" ON courier_locations
FOR INSERT
WITH CHECK (
  courier_id = (
    SELECT id FROM couriers WHERE user_id = auth.uid()
  )
);
```

---

#### **#4: Order Creation Transaction Atomicity**

**Durum:** 🔴 DATA CORRUPTION RISK  
**Etki:** Orphaned orders (sipariş var ama items yok)  
**Süre:** 4 saat

```sql
-- db/functions/create_order_atomic.sql

CREATE OR REPLACE FUNCTION create_order_atomic(
  p_customer_id uuid,
  p_branch_id uuid,
  p_type order_type,
  p_address_text text,
  p_geo_point geography,
  p_items_total numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_payment_method payment_method,
  p_items jsonb -- [{ product_id, name_snapshot, unit_price, qty, total }]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- 1. Create order
  INSERT INTO orders (
    customer_id, branch_id, type, address_text, geo_point,
    items_total, delivery_fee, total, payment_method, status
  ) VALUES (
    p_customer_id, p_branch_id, p_type, p_address_text, p_geo_point,
    p_items_total, p_delivery_fee, p_total, p_payment_method, 'NEW'
  )
  RETURNING id INTO v_order_id;

  -- 2. Create order items (atomic - all or nothing)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, name_snapshot, unit_price, qty, total
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'name_snapshot',
      (v_item->>'unit_price')::numeric,
      (v_item->>'qty')::integer,
      (v_item->>'total')::numeric
    );
  END LOOP;

  -- 3. Log event
  INSERT INTO events (order_id, type, payload_json)
  VALUES (v_order_id, 'order_created', jsonb_build_object(
    'customer_id', p_customer_id,
    'total', p_total
  ));

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Order creation failed: %', SQLERRM;
END;
$$;
```

```typescript
// src/app/api/orders/route.ts - Yeni implementasyon

export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  
  // Validation
  const schema = z.object({
    branchId: z.string().uuid(),
    type: z.enum(['delivery', 'pickup']),
    addressText: z.string().optional(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      nameSnapshot: z.string(),
      unitPrice: z.number(),
      qty: z.number().int().positive(),
      total: z.number(),
    })).min(1),
    paymentMethod: z.enum(['cash', 'card_on_pickup']),
  });

  const validated = schema.parse(body);

  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Calculate totals
  const itemsTotal = validated.items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = validated.type === 'delivery' ? 10 : 0;
  const total = itemsTotal + deliveryFee;

  // ✅ ATOMIC: Use RPC function
  const { data, error } = await supabase.rpc('create_order_atomic', {
    p_customer_id: user.id,
    p_branch_id: validated.branchId,
    p_type: validated.type,
    p_address_text: validated.addressText || null,
    p_geo_point: null, // TODO: Geocode address
    p_items_total: itemsTotal,
    p_delivery_fee: deliveryFee,
    p_total: total,
    p_payment_method: validated.paymentMethod,
    p_items: validated.items,
  });

  if (error) {
    console.error('Order creation failed:', error);
    return Response.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }

  return Response.json(data, { status: 201 });
}
```

---

#### **#5: Service Worker Registration**

**Durum:** 🟡 PWA Broken  
**Etki:** Offline mode ve push notifications çalışmıyor  
**Süre:** 1 saat

```typescript
// src/app/layout.tsx - Service worker kaydını ekle

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        
        {/* ✅ Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/service-worker.js')
                    .then(reg => console.log('SW registered:', reg.scope))
                    .catch(err => console.error('SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-dvh bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

```javascript
// public/service-worker.js - Basit başlangıç

const CACHE_NAME = 'kapgel-v1';
const urlsToCache = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

---

## 🟡 **HIGH PRIORITY - Önümüzdeki Hafta (5-10 gün)**

### **#6: Playwright Test Scaffolding**

**Durum:** 🟡 Test Suite Broken  
**Süre:** 1 gün

```typescript
// tests/e2e/customer-flow.spec.ts - Gerçek test

import { test, expect } from '@playwright/test';

test.describe('Customer Order Flow', () => {
  test('can browse vendors and place pickup order', async ({ page }) => {
    // 1. Navigate to home
    await page.goto('http://localhost:3000/');
    await expect(page.locator('h1')).toContainText('Kapgel');

    // 2. Select city
    await page.selectOption('select', { label: 'İstanbul' });

    // 3. Click first vendor
    await page.click('text=Burger House');
    await expect(page).toHaveURL(/\/vendors\/.+/);

    // 4. Add item to cart
    await page.click('button:has-text("Sepete Ekle")');
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

    // 5. Checkout
    await page.click('button:has-text("Sepeti Tamamla")');
    await expect(page).toHaveURL(/\/checkout/);

    // 6. Select pickup
    await page.click('input[value="pickup"]');

    // 7. Submit order
    await page.click('button:has-text("Siparişi Ver")');
    await expect(page).toHaveURL(/\/orders\/.+/);
    await expect(page.locator('text=Sipariş Alındı')).toBeVisible();
  });
});
```

---

### **#7: Database Indexler**

**Süre:** 2 saat

```sql
-- db/migrations/003_performance_indexes.sql

-- Order queries
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX idx_orders_branch_status ON orders(branch_id, status) 
  WHERE status NOT IN ('DELIVERED', 'REJECTED', 'CANCELED_BY_USER', 'CANCELED_BY_VENDOR');
CREATE INDEX idx_orders_courier ON orders(courier_id) WHERE courier_id IS NOT NULL;
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Courier location queries
CREATE INDEX idx_courier_locations_courier_time ON courier_locations(courier_id, updated_at DESC);
CREATE INDEX idx_courier_locations_order ON courier_locations(order_id, updated_at DESC);

-- Product search
CREATE INDEX idx_products_vendor_active ON products(vendor_id, is_active) WHERE is_active = true;
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('turkish', name));

-- Branch geospatial
CREATE INDEX idx_branches_geo ON branches USING GIST(geo_point);
```

---

### **#8: Observability - Sentry Setup**

**Süre:** 3 saat

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// lib/observability.ts

import * as Sentry from '@sentry/nextjs';

export function initObservability() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event, hint) {
        // PII filtering
        if (event.request?.data) {
          delete event.request.data.password;
          delete event.request.data.phone;
        }
        return event;
      },
    });
  }
}

// Structured logging
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    const log = {
      level: 'info',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(log));
  },

  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    Sentry.captureException(error, { extra: meta });
    const log = {
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta,
      timestamp: new Date().toISOString(),
    };
    console.error(JSON.stringify(log));
  },

  warn: (message: string, meta?: Record<string, any>) => {
    const log = {
      level: 'warn',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    };
    console.warn(JSON.stringify(log));
  },
};

// Error boundary
export function withErrorBoundary<P>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode
) {
  return Sentry.withErrorBoundary(Component, {
    fallback,
    showDialog: process.env.NODE_ENV === 'production',
  });
}
```

---

## 🟢 **MEDIUM PRIORITY - 2-3 Hafta**

### **#9: Vendor Panel Implementation**

**Süre:** 5 gün

### **#10: Courier Panel Implementation**

**Süre:** 4 gün

### **#11: Map Component (MapLibre)**

**Süre:** 3 gün

---

## 📊 **Execution Timeline**

```
Week 1 (Bu Hafta):
├── Day 1-2: #1,#2,#3 (RLS + RBAC fixes) - 5.5h
├── Day 3-4: #4 (Transaction atomicity) - 4h
├── Day 5:   #5 (Service worker) - 1h
└── Weekend: Testing

Week 2:
├── Day 1-2: #6 (E2E tests) - 8h
├── Day 3:   #7 (DB indexes) - 2h
├── Day 4-5: #8 (Observability) - 3h

Week 3:
├── #9,#10,#11 (Vendor/Courier/Map)
```

---

## ✅ **Definition of Done**

Her task için:

- [ ] Code implemented
- [ ] Unit tests yazıldı (80%+ coverage)
- [ ] E2E test eklendi
- [ ] RLS policy test geçti
- [ ] Code review yapıldı
- [ ] Documentation güncellendi
- [ ] Staging'de test edildi

---

## 🎯 **Success Metrics**

**Bu backlog tamamlandığında:**

- ✅ Security score: 4/10 → 9/10
- ✅ Test coverage: 2/10 → 8/10
- ✅ Observability: 0/10 → 7/10
- ✅ Production readiness: 30% → 80%

**Son Güncelleme:** 30 Eylül 2025  
**Sorumlu:** Development Team  
**Reviewer:** Senior Engineer + Security Lead
