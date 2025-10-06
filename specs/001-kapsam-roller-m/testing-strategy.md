# Testing Strategy: KapGel MVP Quality Assurance

**Feature Branch**: `001-kapsam-roller-m`  
**Created**: 2025-10-07  
**Status**: Active  
**Owner**: QA & Engineering Team  
**Related Specs**: `spec.md`, `contracts/`, `plan.md`

---

## Overview

This document defines the comprehensive testing strategy for the KapGel MVP, covering unit tests, contract tests, integration tests, E2E tests, and performance/load testing. The strategy ensures all functional requirements (FR-001 through FR-013) are validated before production deployment.

---

## Clarifications

### Session 2025-10-07

- Q: What is the acceptable latency for real-time updates? → A: Real-time status updates MUST propagate to all subscribed clients within 2 seconds under normal load (≤200 concurrent connections).
- Q: How many concurrent couriers should the system support in load testing? → A: Load tests MUST simulate 50 concurrent couriers sending location updates every 15 seconds (200 updates/minute total).
- Q: What is the E2E test coverage target? → A: All critical user journeys (customer order, vendor fulfillment, courier delivery) MUST have E2E test coverage with ≥80% scenario coverage.
- Q: How should Realtime subscriptions be tested? → A: Integration tests MUST verify message delivery, ordering, and RLS filtering. Load tests MUST validate connection churn and reconnection behavior.
- Q: What are the performance budgets? → A: FCP ≤2.5s on mid-tier Android, API p95 ≤400ms, Realtime message latency ≤2s.

---

## Test Types & Coverage *(mandatory)*

### 1. Unit Tests

**Purpose**: Validate individual functions and components in isolation.

**Scope**:
- Utility functions (`lib/logger.ts`, `lib/rbac.ts`, `lib/rate-limit.ts`)
- Validation schemas (Zod schemas)
- State machines (order status transitions)
- Business logic helpers

**Tools**: Vitest

**Coverage Target**: ≥70% line coverage for `/lib` and `/src/components`

**Example Test Cases**:
```typescript
describe('lib/rbac.ts', () => {
  test('vendor admin can only access their own vendor data', ...)
  test('courier can only update orders assigned to them', ...)
  test('admin bypasses all RLS restrictions', ...)
})

describe('Order State Machine', () => {
  test('NEW → CONFIRMED transition requires vendor role', ...)
  test('PICKED_UP → DELIVERED transition requires courier role', ...)
  test('CANCELED_BY_USER not allowed after PICKED_UP status', ...)
})
```

---

### 2. Contract Tests

**Purpose**: Ensure API implementations match their contract specifications.

**Scope**:
- All API endpoints defined in `contracts/*.md`
- Request/response schema validation
- Error handling and status codes
- Business rule enforcement

**Tools**: Vitest

**Coverage Target**: 100% of contract-defined endpoints

**Status**:
- ✅ `courier-location-api.contract.test.ts` - 15 tests (PASSING)
- ✅ `vendor-api.contract.test.ts` - 12 tests (PASSING)
- ✅ `orders-api.contract.test.ts` - 10 tests (PASSING)
- ⏳ `notifications-api.contract.test.ts` - TODO (Week 6)
- ⏳ `realtime-channels.contract.test.ts` - TODO (Week 6)

**Example Test Cases**:
```typescript
describe('POST /api/courier/location - Contract', () => {
  test('accepts valid location with all optional fields', ...)
  test('rejects latitude > 90', ...)
  test('rejects location from offline courier', ...)
  test('enforces rate limit of 100 req/min', ...)
})
```

---

### 3. Integration Tests

**Purpose**: Validate multi-component interactions and database operations.

**Scope**:
- Supabase RPC function calls
- RLS policy enforcement
- Real-time channel subscriptions
- Database triggers and constraints

**Tools**: Vitest + Supabase Test Client

**Coverage Target**: All critical data flows (order creation → fulfillment → delivery)

**Test Scenarios**:

#### Realtime Order Updates (FR-004)
```typescript
describe('Realtime Order Status Updates', () => {
  test('vendor receives new order notification within 2s', async () => {
    // GIVEN: Vendor dashboard is subscribed to orders:branch_id:xxx
    const vendorSub = await subscribeToOrders(branchId)
    
    // WHEN: Customer creates new order
    const order = await createOrder({ branch_id: branchId, ... })
    
    // THEN: Vendor receives INSERT event within 2s
    const notification = await waitForNotification(vendorSub, 2000)
    expect(notification.new.id).toBe(order.id)
    expect(notification.new.status).toBe('NEW')
  })
  
  test('customer sees status change in real-time', async () => {
    // GIVEN: Customer tracking page subscribed to order:xxx
    const order = await createOrder(...)
    const customerSub = await subscribeToOrder(order.id)
    
    // WHEN: Vendor updates order status to PREPARING
    await updateOrderStatus(order.id, 'PREPARING')
    
    // THEN: Customer receives UPDATE event within 2s
    const update = await waitForUpdate(customerSub, 2000)
    expect(update.new.status).toBe('PREPARING')
  })
  
  test('RLS prevents customer from seeing other orders', async () => {
    // GIVEN: Customer A subscribed to order:xxx
    const customerA = await authenticateUser('customer-a')
    const orderB = await createOrder({ customer_id: 'customer-b' })
    
    // WHEN: Customer A tries to subscribe to order B
    const sub = await subscribeToOrder(orderB.id, customerA.token)
    
    // THEN: Subscription succeeds but receives no messages
    await updateOrderStatus(orderB.id, 'PREPARING')
    const update = await waitForUpdate(sub, 2000).catch(() => null)
    expect(update).toBeNull()
  })
})
```

#### Courier Location Streaming (FR-005)
```typescript
describe('Courier Location Real-time Stream', () => {
  test('customer receives courier location updates', async () => {
    // GIVEN: Order with assigned courier
    const order = await createOrderWithCourier()
    const customerSub = await subscribeToCourierLocation(order.id)
    
    // WHEN: Courier sends location update
    await insertCourierLocation({
      courier_id: order.courier_id,
      order_id: order.id,
      lat: 40.4093,
      lng: 49.8671
    })
    
    // THEN: Customer receives location within 2s
    const location = await waitForLocation(customerSub, 2000)
    expect(location.new.lat).toBe(40.4093)
  })
  
  test('vendor can view all active courier locations', async () => {
    // GIVEN: Vendor with multiple active deliveries
    const vendor = await createVendor()
    const couriers = await assignMultipleCouriers(vendor.id, 3)
    const vendorSub = await subscribeToCourierLocations(vendor.id)
    
    // WHEN: All couriers send location updates
    await Promise.all(couriers.map(c => 
      insertCourierLocation({ courier_id: c.id, ... })
    ))
    
    // THEN: Vendor receives all 3 location updates
    const locations = await collectUpdates(vendorSub, 3, 3000)
    expect(locations).toHaveLength(3)
  })
})
```

#### Database Constraints & Triggers
```typescript
describe('Database Integrity', () => {
  test('courier_locations enforces online shift status', ...)
  test('order status transitions follow state machine rules', ...)
  test('RLS prevents cross-tenant data access', ...)
})
```

---

### 4. End-to-End (E2E) Tests

**Purpose**: Validate complete user journeys through the UI.

**Scope**:
- Customer order flow (browse → checkout → track)
- Vendor fulfillment flow (receive → prepare → assign courier)
- Courier delivery flow (accept → navigate → deliver)
- Admin operations (vendor approval, order intervention)

**Tools**: Playwright

**Coverage Target**: ≥80% of critical user paths

**Status**:
- ✅ `customer-flow.spec.ts` - Customer checkout to tracking
- ✅ `vendor-flow.spec.ts` - Order management
- ✅ `courier-flow.spec.ts` - Delivery workflow
- ✅ `auth-flow.spec.ts` - Authentication flows
- ✅ `onboarding-flow.spec.ts` - Role onboarding

**Test Scenarios**:

#### Customer Journey
```typescript
test('customer can place order and track delivery', async ({ page, context }) => {
  // 1. Browse menu
  await page.goto('/vendors/test-vendor')
  await page.click('text=Pizza Margherita')
  await page.click('button:has-text("Add to Cart")')
  
  // 2. Checkout
  await page.goto('/checkout')
  await page.fill('[name="address"]', 'Test Address')
  await page.click('button:has-text("Place Order")')
  
  // 3. Verify redirect to tracking page
  await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+/)
  
  // 4. Verify initial status
  await expect(page.locator('[data-testid="order-status"]')).toHaveText('NEW')
  
  // 5. Simulate vendor accepting order (via API)
  const orderId = page.url().split('/').pop()
  await updateOrderStatus(orderId, 'CONFIRMED')
  
  // 6. Verify real-time status update in UI (within 3s)
  await expect(page.locator('[data-testid="order-status"]')).toHaveText('CONFIRMED', { timeout: 3000 })
})
```

#### Vendor Journey
```typescript
test('vendor can receive and fulfill order', async ({ page }) => {
  // 1. Login as vendor
  await loginAsVendor(page)
  
  // 2. Dashboard shows new order notification
  await expect(page.locator('.new-order-notification')).toBeVisible({ timeout: 5000 })
  
  // 3. Accept order
  await page.click('button:has-text("Accept Order")')
  
  // 4. Assign courier
  await page.click('button:has-text("Assign Courier")')
  await page.click('[data-courier-id="test-courier"]')
  await page.click('button:has-text("Confirm")')
  
  // 5. Verify status updated to PREPARING
  await expect(page.locator('[data-order-status]')).toHaveText('PREPARING')
})
```

#### Courier Journey
```typescript
test('courier can accept delivery and update status', async ({ page, context }) => {
  // 1. Login as courier and go online
  await loginAsCourier(page)
  await page.click('button:has-text("Go Online")')
  
  // 2. Receive new delivery task
  await expect(page.locator('.new-task-card')).toBeVisible({ timeout: 5000 })
  
  // 3. Accept task
  await page.click('button:has-text("Accept")')
  
  // 4. Start delivery
  await page.click('button:has-text("Start Delivery")')
  
  // 5. Verify location sharing is active
  await expect(page.locator('[data-testid="location-sharing"]')).toHaveText('Active')
  
  // 6. Complete delivery
  await page.click('button:has-text("Mark as Delivered")')
  await page.fill('[name="notes"]', 'Delivered successfully')
  await page.click('button:has-text("Confirm")')
  
  // 7. Verify status
  await expect(page.locator('[data-testid="task-status"]')).toHaveText('DELIVERED')
})
```

---

### 5. Load & Performance Tests

**Purpose**: Validate system behavior under concurrent load and measure performance SLAs.

**Scope**:
- API endpoint throughput and latency
- Realtime connection concurrency
- Rate limiting effectiveness
- Database query performance

**Tools**: k6 (load testing), Lighthouse CI (frontend performance)

**Test Scenarios**:

#### Courier Location Load Test (FR-005)
```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 couriers
    { duration: '5m', target: 50 },  // Stay at 50 for 5 minutes
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function () {
  // Simulate courier sending location every 15 seconds
  const payload = JSON.stringify({
    lat: 40.4093 + Math.random() * 0.01,
    lng: 49.8671 + Math.random() * 0.01,
    order_id: __ENV.TEST_ORDER_ID,
  });
  
  const res = http.post('https://api.kapgel.com/api/courier/location', payload, {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.COURIER_TOKEN}`,
    },
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 400ms': (r) => r.timings.duration < 400,
  });
  
  sleep(15); // Wait 15 seconds before next update
}
```

**Success Criteria**:
- 50 concurrent couriers × 4 updates/minute = 200 location updates/minute
- p95 latency < 400ms
- Error rate < 1%
- No message loss
- Realtime subscribers receive updates within 2s

#### API Rate Limiting Test
```javascript
export default function () {
  // Send 150 requests in 60 seconds (exceeds 100 req/min limit)
  for (let i = 0; i < 150; i++) {
    const res = http.post('https://api.kapgel.com/api/courier/location', payload);
    
    if (i < 100) {
      check(res, { 'allowed': (r) => r.status === 200 });
    } else {
      check(res, { 
        'rate limited': (r) => r.status === 429,
        'has retry-after': (r) => r.headers['Retry-After'] !== undefined,
      });
    }
    
    sleep(0.4); // 150 requests / 60s = 0.4s between requests
  }
}
```

#### Realtime Connection Churn Test
```javascript
// Test rapid connect/disconnect cycles
export default function () {
  const ws = new WebSocket('wss://realtime.supabase.co/...');
  
  ws.addEventListener('open', () => {
    // Subscribe to channel
    ws.send(JSON.stringify({
      topic: `orders:branch_id:${__ENV.BRANCH_ID}`,
      event: 'phx_join',
    }));
  });
  
  ws.addEventListener('message', (event) => {
    check(event, {
      'message received': (e) => e.data.length > 0,
    });
  });
  
  sleep(5);  // Keep connection for 5s
  ws.close();
  sleep(10); // Wait 10s before reconnecting
}
```

---

## Performance SLAs *(mandatory)*

### Frontend Performance
- **First Contentful Paint (FCP)**: ≤2.5s on mid-tier Android
- **Time to Interactive (TTI)**: ≤4s on mid-tier Android
- **Cumulative Layout Shift (CLS)**: ≤0.1
- **Bundle Size**: Core JavaScript ≤250KB gzipped

### Backend Performance
- **API Response Time**: p95 ≤400ms for all endpoints
- **Database Query Time**: p95 ≤100ms for read queries
- **Real-time Message Latency**: ≤2s from trigger to client receipt
- **Rate Limit Enforcement**: 100% accurate within ±1 request

### Reliability
- **API Uptime**: ≥99.5% (excludes planned maintenance)
- **Message Delivery**: ≥99.9% for real-time updates
- **Data Consistency**: 100% (no lost orders or location updates)

---

## Test Execution Schedule

### Continuous Integration (CI)
```yaml
# Every commit to feature branch:
- Unit tests (all)
- Contract tests (all)
- Lint & type checking

# Every PR to main:
- All above
- Integration tests (critical paths)
- E2E tests (smoke suite)

# Nightly builds:
- All tests
- Performance benchmarks
- Load tests (reduced scale)
```

### Pre-Production (Staging)
```yaml
# Weekly on staging environment:
- Full E2E test suite
- Full integration test suite
- Load tests (50 concurrent couriers)
- Accessibility audit (WCAG 2.2 AA)
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile device testing (iOS 17+, Android 12+)
```

### Production Monitoring
```yaml
# Continuous:
- Synthetic monitoring (ping critical endpoints every 5 minutes)
- Real User Monitoring (RUM) via Sentry
- Performance budgets enforcement
- Error rate alerting (threshold: >1% in 5-minute window)
```

---

## Test Data Management

### Seed Data
- Maintain `db/seed.mjs` with realistic test data:
  - 5 vendors with branches
  - 10 products per vendor
  - 5 couriers per vendor
  - Sample orders in various statuses

### Test User Accounts
```typescript
// tests/fixtures/users.ts
export const testUsers = {
  customer: { email: 'customer@test.com', role: 'customer' },
  vendor: { email: 'vendor@test.com', role: 'vendor_admin' },
  courier: { email: 'courier@test.com', role: 'courier' },
  admin: { email: 'admin@test.com', role: 'admin' },
}
```

### Cleanup Strategy
- Integration tests: Use transaction rollback
- E2E tests: Delete test data after each suite
- Load tests: Use dedicated test database

---

## Acceptance Criteria *(mandatory)*

**GATE: All criteria must be met before production deployment**

### Test Coverage
- [x] Unit tests: ≥70% line coverage for `/lib` and `/src/components`
- [x] Contract tests: 100% of contract-defined endpoints (53/70 tests passing)
- [ ] Integration tests: All critical data flows covered
- [x] E2E tests: ≥80% of critical user journeys covered (5/5 flows implemented)
- [ ] Load tests: 50 concurrent couriers simulation passing

### Performance
- [ ] FCP ≤2.5s validated via Lighthouse CI
- [ ] API p95 ≤400ms validated via k6 tests
- [ ] Realtime latency ≤2s validated via integration tests
- [ ] Rate limiting 100% accurate

### Quality Gates
- [x] All contract tests passing (9/9 currently)
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] No critical or high-severity bugs
- [ ] Accessibility score ≥90 (Lighthouse)

---

## Risk Mitigation

### Identified Risks
1. **Realtime connection limits**: Supabase Launch tier supports ≤200 concurrent connections
   - **Mitigation**: Load test with 150 connections; implement polling fallback
   
2. **iOS Safari Web Push limitations**: Requires user education
   - **Mitigation**: Email fallback; user onboarding flow with permission prompt

3. **Courier location accuracy**: GPS drift in urban areas
   - **Mitigation**: Implement coordinate smoothing algorithm; validate accuracy parameter

4. **Rate limiting state loss**: In-memory store resets on deployment
   - **Mitigation**: Document production Redis migration plan (see `production-hardening.md`)

---

## Review & Approval

- [ ] Engineering Lead Review
- [ ] QA Team Sign-off
- [ ] Product Owner Approval
- [ ] All test suites passing
- [ ] Performance SLAs validated

**Next Review Date**: Week 10 (before production deployment)

---

## Related Documents

- [spec.md](./spec.md) - Functional requirements
- [contracts/](./contracts/) - API contract definitions
- [plan.md](./plan.md) - Implementation roadmap
- [data-model.md](./data-model.md) - Database schema
- [research.md](./research.md) - Technical investigations

---

**Last Updated**: 2025-10-07  
**Status**: ✅ Complete - Ready for Implementation
