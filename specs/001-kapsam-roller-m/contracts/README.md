# API Contracts Documentation

**Last Updated:** 2025-10-05  
**Status:** Complete  

---

## Overview

This directory contains the complete API contract documentation for the KapGel platform. Each contract defines the interface, validation rules, error handling, and implementation examples for specific API endpoints.

---

## Available Contracts

| Contract | Description | Status |
|----------|-------------|--------|
| [courier-location-api.md](./courier-location-api.md) | Courier GPS location updates | ✅ Complete |
| [orders-api.md](./orders-api.md) | Order creation and management | ✅ Complete |
| [vendor-api.md](./vendor-api.md) | Vendor dashboard and menu management | ✅ Complete |
| [notifications-api.md](./notifications-api.md) | Push notifications and preferences | ✅ Complete |
| [realtime-channels.md](./realtime-channels.md) | Supabase Realtime subscriptions | ✅ Complete |

---

## Contract Structure

Each contract document follows this structure:

1. **Overview**: High-level description and related specifications
2. **Endpoints**: REST API routes and RPC functions
3. **Authentication & Authorization**: Required roles and permissions
4. **Request/Response Schemas**: JSON payloads with validation rules
5. **Business Rules**: Domain logic and constraints
6. **Error Handling**: Standard error responses
7. **Real-time Events**: Supabase channel subscriptions
8. **Database Schema**: Table definitions and RLS policies
9. **Implementation Examples**: TypeScript code samples
10. **Testing**: Unit and E2E test examples

---

## Usage Guidelines

### For Backend Developers

1. **Implementation Order:**
   - Read the contract thoroughly
   - Implement database schema and RLS policies first
   - Write failing contract tests
   - Implement the API endpoint
   - Ensure all tests pass

2. **Contract-First Development:**
   ```bash
   # 1. Review contract
   cat contracts/orders-api.md
   
   # 2. Write contract test
   npm run test:contract -- orders.contract.test.ts
   
   # 3. Implement endpoint
   # src/app/api/orders/route.ts
   
   # 4. Verify contract compliance
   npm run test:contract
   ```

### For Frontend Developers

1. **Client Generation:**
   - Use contracts to understand API shape
   - Generate TypeScript types from schemas
   - Implement error handling per contract specs

2. **Example:**
   ```typescript
   // Based on orders-api.md contract
   
   interface CreateOrderRequest {
     branch_id: string
     type: 'delivery' | 'pickup'
     items: OrderItem[]
     delivery_address?: DeliveryAddress
     payment_method: 'cash' | 'card_on_delivery'
   }
   
   async function createOrder(data: CreateOrderRequest) {
     const response = await fetch('/api/orders', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
     })
     
     if (!response.ok) {
       const error = await response.json()
       throw new APIError(error.code, error.details)
     }
     
     return response.json()
   }
   ```

### For QA Engineers

1. **Test Case Generation:**
   - Each contract includes test examples
   - Error responses define negative test cases
   - Validation rules define edge cases

2. **Example Test Matrix:**
   ```
   Endpoint: POST /api/orders
   
   ✅ Happy path: Valid order with delivery
   ✅ Happy path: Valid order with pickup
   ❌ Invalid: Missing branch_id
   ❌ Invalid: Empty items array
   ❌ Invalid: Address outside delivery zone
   ❌ Invalid: Negative quantity
   ❌ Auth: Unauthorized user
   ❌ Auth: Wrong role
   ```

---

## Contract Compliance Checklist

Before marking an endpoint as "implemented," ensure:

- [ ] All required parameters validated
- [ ] All optional parameters handled
- [ ] Success responses match schema exactly
- [ ] Error responses use specified codes
- [ ] Business rules enforced
- [ ] RLS policies implemented
- [ ] Real-time events triggered (if applicable)
- [ ] Rate limiting implemented (if specified)
- [ ] Contract tests pass 100%
- [ ] E2E tests cover happy and error paths

---

## Related Documentation

- [spec.md](../spec.md) - Functional requirements
- [data-model.md](../data-model.md) - Database schema
- [plan.md](../plan.md) - Implementation roadmap
- [tasks.md](../tasks.md) - Development tasks

---

## Contract Testing

### Running Contract Tests

```bash
# All contract tests
npm run test:contract

# Specific contract
npm run test:contract -- orders.contract.test.ts

# Watch mode
npm run test:contract -- --watch
```

### Writing Contract Tests

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Orders API Contract', () => {
  const supabase = createClient(TEST_URL, TEST_ANON_KEY)
  
  it('POST /api/orders - creates order with valid data', async () => {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branch_id: TEST_BRANCH_ID,
        type: 'delivery',
        items: [{ product_id: TEST_PRODUCT_ID, quantity: 2 }],
        delivery_address: {
          text: 'Test Address',
          lat: 40.4093,
          lng: 49.8671
        },
        payment_method: 'cash'
      })
    })
    
    // Assert status code
    expect(response.status).toBe(201)
    
    // Assert response schema
    const data = await response.json()
    expect(data).toHaveProperty('order_id')
    expect(data).toHaveProperty('order_number')
    expect(data.status).toBe('NEW')
    expect(data.total).toBeGreaterThan(0)
  })
  
  it('POST /api/orders - rejects address outside delivery zone', async () => {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        branch_id: TEST_BRANCH_ID,
        type: 'delivery',
        items: [{ product_id: TEST_PRODUCT_ID, quantity: 1 }],
        delivery_address: {
          lat: 41.0000, // Outside zone
          lng: 50.0000
        }
      })
    })
    
    // Assert error response
    expect(response.status).toBe(403)
    
    const error = await response.json()
    expect(error.code).toBe('OUTSIDE_DELIVERY_ZONE')
    expect(error.error).toBeDefined()
    expect(error.details).toBeDefined()
  })
})
```

---

## Versioning

Contracts follow semantic versioning:

- **MAJOR:** Breaking changes to API interface
- **MINOR:** Backward-compatible additions
- **PATCH:** Documentation fixes, clarifications

Current versions:
- courier-location-api: 1.0
- orders-api: 1.0
- vendor-api: 1.0
- notifications-api: 1.0
- realtime-channels: 1.0

---

## Contributing

When adding or modifying a contract:

1. Update the contract document
2. Update this README with the new/changed contract
3. Add/update contract tests
4. Update the changelog in the contract document
5. Submit PR with all changes

---

## Support

For questions or clarifications about contracts:
- Create an issue in GitHub
- Tag with `contracts` label
- Reference the specific contract file

---

**Next Steps:**

1. Review all contracts
2. Implement contract tests (see `tests/contract/`)
3. Begin API implementation following contracts
4. Ensure 100% contract compliance before deployment
