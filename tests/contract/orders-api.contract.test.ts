/**
 * Orders API Contract Tests
 * 
 * Tests the orders API endpoints against the contract specification
 * defined in specs/001-kapsam-roller-m/contracts/orders-api.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'

// Test data
let testCustomerId: string
let testVendorId: string
let testBranchId: string
let testProductId: string
let testOrderId: string
let customerToken: string = 'test-customer-token'
let vendorToken: string = 'test-vendor-token'

const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)

describe('Orders API Contract Tests', () => {
  beforeAll(async () => {
    // Setup test data
    // In real implementation, this would create test users, vendors, products, etc.
    // For now, we'll use placeholder IDs
    testCustomerId = 'test-customer-uuid'
    testVendorId = 'test-vendor-uuid'
    testBranchId = 'test-branch-uuid'
    testProductId = 'test-product-uuid'
  })

  afterAll(async () => {
    // Cleanup test data
  })

  describe('POST /api/orders - Create Order', () => {
    it('should create order with valid data', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch_id: testBranchId,
          type: 'delivery',
          items: [
            {
              product_id: testProductId,
              quantity: 2,
              notes: 'Extra cheese'
            }
          ],
          delivery_address: {
            text: 'Nizami küç. 28, Baku',
            lat: 40.4093,
            lng: 49.8671,
            district_id: 'test-district-uuid'
          },
          payment_method: 'cash',
          notes: 'Please ring doorbell'
        })
      })

      // Contract: Response should be 201 Created
      expect(response.status).toBe(201)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('order_id')
      expect(data).toHaveProperty('order_number')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('type')
      expect(data).toHaveProperty('branch')
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('subtotal')
      expect(data).toHaveProperty('delivery_fee')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('created_at')

      // Contract: Status must be NEW for new orders
      expect(data.status).toBe('NEW')

      // Contract: Type must match request
      expect(data.type).toBe('delivery')

      // Contract: Items array must match request
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.items.length).toBe(1)
      expect(data.items[0].quantity).toBe(2)

      // Contract: Total must be calculated correctly
      expect(typeof data.total).toBe('number')
      expect(data.total).toBeGreaterThan(0)

      // Save for later tests
      testOrderId = data.order_id
    })

    it('should reject order with missing required fields', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing branch_id
          type: 'delivery',
          items: []
        })
      })

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)

      const error = await response.json()

      // Contract: Error response must have required fields
      expect(error).toHaveProperty('error')
      expect(error).toHaveProperty('code')
      expect(error).toHaveProperty('details')

      // Contract: Code should be VALIDATION_ERROR
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject order outside delivery zone', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch_id: testBranchId,
          type: 'delivery',
          items: [{ product_id: testProductId, quantity: 1 }],
          delivery_address: {
            text: 'Far away location',
            lat: 41.0000, // Outside delivery zone
            lng: 50.0000
          },
          payment_method: 'cash'
        })
      })

      // Contract: Should return 403 Forbidden
      expect(response.status).toBe(403)

      const error = await response.json()

      // Contract: Code should be OUTSIDE_DELIVERY_ZONE
      expect(error.code).toBe('OUTSIDE_DELIVERY_ZONE')
      expect(error).toHaveProperty('details')
    })

    it('should reject order with empty items array', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch_id: testBranchId,
          type: 'delivery',
          items: [], // Empty items
          delivery_address: {
            text: 'Test Address',
            lat: 40.4093,
            lng: 49.8671
          },
          payment_method: 'cash'
        })
      })

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)

      const error = await response.json()
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject order below minimum order value', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch_id: testBranchId,
          type: 'delivery',
          items: [
            { product_id: 'cheap-product-id', quantity: 1 } // Assume this is below minimum
          ],
          delivery_address: {
            text: 'Test Address',
            lat: 40.4093,
            lng: 49.8671
          },
          payment_method: 'cash'
        })
      })

      // Contract: Should return 422 Unprocessable Entity
      expect(response.status).toBe(422)

      const error = await response.json()
      
      // Contract: Code should be MINIMUM_ORDER_VALUE
      expect(error.code).toBe('MINIMUM_ORDER_VALUE')
      expect(error).toHaveProperty('details')
    })

    it('should reject unauthenticated request', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch_id: testBranchId,
          type: 'delivery',
          items: [{ product_id: testProductId, quantity: 1 }],
          payment_method: 'cash'
        })
      })

      // Contract: Should return 401 Unauthorized
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/orders/:id - Get Order Details', () => {
    it('should return order details for authorized user', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders/${testOrderId}`, {
        headers: {
          'Authorization': `Bearer ${customerToken}`
        }
      })

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('order_id')
      expect(data).toHaveProperty('order_number')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('customer')
      expect(data).toHaveProperty('branch')
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('timeline')

      // Contract: Timeline must be an array
      expect(Array.isArray(data.timeline)).toBe(true)
      expect(data.timeline.length).toBeGreaterThan(0)

      // Contract: Timeline entries must have required fields
      data.timeline.forEach((event: any) => {
        expect(event).toHaveProperty('status')
        expect(event).toHaveProperty('timestamp')
        expect(event).toHaveProperty('actor')
      })
    })

    it('should return 404 for non-existent order', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/00000000-0000-0000-0000-000000000000`,
        {
          headers: {
            'Authorization': `Bearer ${customerToken}`
          }
        }
      )

      // Contract: Should return 404 Not Found
      expect(response.status).toBe(404)
    })

    it('should return 403 for unauthorized user', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders/${testOrderId}`, {
        headers: {
          'Authorization': `Bearer ${vendorToken}` // Different user
        }
      })

      // Contract: Should return 403 Forbidden
      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/orders/:id/transition - Update Order Status', () => {
    it('should allow vendor to confirm new order', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/${testOrderId}/transition`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_status: 'CONFIRMED',
            estimated_time: 30
          })
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('order_id')
      expect(data).toHaveProperty('old_status')
      expect(data).toHaveProperty('new_status')
      expect(data).toHaveProperty('updated_at')
      expect(data).toHaveProperty('updated_by')

      // Contract: Status should be updated
      expect(data.old_status).toBe('NEW')
      expect(data.new_status).toBe('CONFIRMED')
    })

    it('should reject invalid state transition', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/${testOrderId}/transition`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_status: 'DELIVERED' // Invalid from CONFIRMED
          })
        }
      )

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)

      const error = await response.json()

      // Contract: Code should be INVALID_TRANSITION
      expect(error.code).toBe('INVALID_TRANSITION')
      expect(error).toHaveProperty('details')
    })

    it('should reject transition by unauthorized role', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/${testOrderId}/transition`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${customerToken}`, // Customer can't confirm
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_status: 'CONFIRMED'
          })
        }
      )

      // Contract: Should return 403 Forbidden
      expect(response.status).toBe(403)

      const error = await response.json()

      // Contract: Code should be UNAUTHORIZED_TRANSITION
      expect(error.code).toBe('UNAUTHORIZED_TRANSITION')
    })

    it('should require reason for cancellation', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/${testOrderId}/transition`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_status: 'CANCELED_BY_VENDOR'
            // Missing required 'reason' field
          })
        }
      )

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)

      const error = await response.json()
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/orders - List Orders', () => {
    it('should return paginated orders list', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders?page=1&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${customerToken}`
          }
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('orders')
      expect(data).toHaveProperty('pagination')

      // Contract: orders must be an array
      expect(Array.isArray(data.orders)).toBe(true)

      // Contract: Pagination must have required fields
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('total_pages')
      expect(data.pagination).toHaveProperty('total_count')

      // Contract: Pagination values must be numbers
      expect(typeof data.pagination.page).toBe('number')
      expect(typeof data.pagination.limit).toBe('number')
      expect(typeof data.pagination.total_count).toBe('number')
    })

    it('should filter orders by status', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders?status=NEW,CONFIRMED`,
        {
          headers: {
            'Authorization': `Bearer ${customerToken}`
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      
      // Contract: All returned orders should match filter
      data.orders.forEach((order: any) => {
        expect(['NEW', 'CONFIRMED']).toContain(order.status)
      })
    })

    it('should respect limit parameter', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders?limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${customerToken}`
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Should not exceed requested limit
      expect(data.orders.length).toBeLessThanOrEqual(5)
      expect(data.pagination.limit).toBe(5)
    })

    it('should enforce maximum limit', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/orders?limit=200`, // Above max of 100
        {
          headers: {
            'Authorization': `Bearer ${customerToken}`
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Should cap at maximum of 100
      expect(data.pagination.limit).toBeLessThanOrEqual(100)
    })
  })
})
