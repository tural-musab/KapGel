# Contract Tests

Contract tests verify that API implementations comply with the specifications defined in `specs/001-kapsam-roller-m/contracts/`.

## Overview

Contract testing ensures:
- ✅ Request/Response schemas match specification
- ✅ Error responses use correct HTTP status codes
- ✅ Business rules are enforced
- ✅ Authorization and authentication work correctly
- ✅ RLS policies prevent unauthorized access

## Running Tests

```bash
# All contract tests
npm run test:contract

# Specific contract
npm run test:contract -- orders-api.contract.test.ts

# Watch mode
npm run test:contract -- --watch

# With coverage
npm run test:contract -- --coverage
```

## Test Files

| File | Contract | Status |
|------|----------|--------|
| `orders-api.contract.test.ts` | Orders Management | ✅ Complete |
| `courier-location-api.contract.test.ts` | Courier Location Updates | ✅ Complete |
| `vendor-api.contract.test.ts` | Vendor Management | ✅ Complete |
| `notifications-api.contract.test.ts` | Notifications System | 🟡 TODO |
| `realtime-channels.contract.test.ts` | Realtime Subscriptions | 🟡 TODO |

## Test Structure

Each contract test file follows this structure:

```typescript
describe('API Name Contract Tests', () => {
  // Setup test data
  beforeAll(async () => { })
  
  // Cleanup
  afterAll(async () => { })
  
  describe('Endpoint Name', () => {
    it('should succeed with valid data', async () => {
      // Test happy path
    })
    
    it('should reject invalid data', async () => {
      // Test validation
    })
    
    it('should enforce authorization', async () => {
      // Test RLS/RBAC
    })
  })
})
```

## Environment Variables

Contract tests require:

```bash
# .env.test
NEXT_PUBLIC_SUPABASE_URL=your-test-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
TEST_API_URL=http://localhost:3000

# Test user credentials
TEST_CUSTOMER_EMAIL=test-customer@example.com
TEST_CUSTOMER_PASSWORD=testpassword
TEST_VENDOR_EMAIL=test-vendor@example.com
TEST_VENDOR_PASSWORD=testpassword
TEST_COURIER_EMAIL=test-courier@example.com
TEST_COURIER_PASSWORD=testpassword
TEST_ADMIN_EMAIL=test-admin@example.com
TEST_ADMIN_PASSWORD=testpassword
```

## Test Data Setup

### Option 1: Seed Script

```bash
npm run db:seed:test
```

This creates:
- Test users (customer, vendor, courier, admin)
- Test vendor with branches
- Test products and categories
- Sample orders

### Option 2: Manual Setup

```sql
-- Create test users
INSERT INTO users (id, email, role) VALUES
  ('test-customer-uuid', 'test-customer@example.com', 'customer'),
  ('test-vendor-uuid', 'test-vendor@example.com', 'vendor_admin'),
  ('test-courier-uuid', 'test-courier@example.com', 'courier'),
  ('test-admin-uuid', 'test-admin@example.com', 'admin');

-- Create test vendor
INSERT INTO vendors (id, owner_user_id, business_name) VALUES
  ('test-vendor-id', 'test-vendor-uuid', 'Test Restaurant');

-- Create test branch
INSERT INTO branches (id, vendor_id, name, geo_point) VALUES
  ('test-branch-id', 'test-vendor-id', 'Main Branch', 
   ST_SetSRID(ST_Point(49.8671, 40.4093), 4326));
```

## Writing Contract Tests

### 1. Test Request/Response Schema

```typescript
it('should return correct schema', async () => {
  const response = await fetch(endpoint)
  const data = await response.json()
  
  // Contract: Must have required fields
  expect(data).toHaveProperty('field_name')
  expect(typeof data.field_name).toBe('string')
})
```

### 2. Test Validation Rules

```typescript
it('should reject invalid input', async () => {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ invalid_field: 'value' })
  })
  
  // Contract: Should return 400
  expect(response.status).toBe(400)
  
  const error = await response.json()
  
  // Contract: Error must have code
  expect(error.code).toBe('VALIDATION_ERROR')
})
```

### 3. Test Business Rules

```typescript
it('should enforce business rule', async () => {
  // Setup: Create order in CONFIRMED status
  
  const response = await transitionOrder('DELIVERED')
  
  // Contract: Invalid transition should fail
  expect(response.status).toBe(400)
  expect(error.code).toBe('INVALID_TRANSITION')
})
```

### 4. Test Authorization

```typescript
it('should prevent unauthorized access', async () => {
  // Authenticate as customer A
  const response = await fetch('/api/orders/customer-b-order-id', {
    headers: { 'Authorization': `Bearer ${customerAToken}` }
  })
  
  // Contract: Should return 403
  expect(response.status).toBe(403)
})
```

### 5. Test RLS Policies

```typescript
it('should respect RLS', async () => {
  // Authenticate as courier
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', 'unassigned-order-id')
  
  // Contract: RLS should prevent access
  expect(data).toHaveLength(0)
})
```

## Debugging Failed Tests

### 1. Check Logs

```bash
# Supabase logs
npx supabase logs

# API logs
npm run dev # Check console
```

### 2. Inspect Database

```bash
# Connect to test database
npx supabase db:inspect

# Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### 3. Manual Testing

```bash
# Test endpoint manually
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "branch_id": "..." }'
```

## CI/CD Integration

Contract tests run in GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run contract tests
  run: npm run test:contract
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

## Coverage Requirements

- ✅ All endpoints documented in contracts
- ✅ All error responses tested
- ✅ All validation rules tested
- ✅ All RLS policies tested
- Target: **90%+ contract coverage**

## Next Steps

1. ✅ Write remaining contract tests (notifications, realtime)
2. ✅ Set up automated test data seeding
3. ✅ Integrate with CI/CD pipeline
4. ✅ Add contract test coverage reporting
5. ✅ Document contract testing best practices

## Related Documentation

- [API Contracts](../../specs/001-kapsam-roller-m/contracts/)
- [Integration Tests](../integration/)
- [E2E Tests](../e2e/)
