/**
 * Vendor API Contract Tests
 * 
 * Tests for assign courier and available couriers endpoints
 * 
 * @see specs/001-kapsam-roller-m/contracts/vendor-api.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let testVendorId: string
let testCourierId: string  
let testOrderId: string
let vendorToken: string = 'test-vendor-token'

const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)

describe('Vendor API Contract Tests - Courier Assignment', () => {
  beforeAll(async () => {
    // Setup test data
    testVendorId = 'test-vendor-uuid'
    testCourierId = 'test-courier-uuid'
    testOrderId = 'test-order-uuid'
  })

  afterAll(async () => {
    // Cleanup test data
  })

  describe('POST /api/vendor/orders/{order_id}/assign-courier', () => {
    it('should assign courier to order successfully', async () => {
      const response = await fetch(`/api/vendor/orders/${testOrderId}/assign-courier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vendorToken}`
        },
        body: JSON.stringify({
          courier_id: testCourierId
        })
      })

      // Contract: Should return 200 on success
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('order_id')
      expect(data).toHaveProperty('courier_id')
      expect(data).toHaveProperty('courier_name')
      expect(data).toHaveProperty('assigned_at')

      // Contract: Values should match request
      expect(data.order_id).toBe(testOrderId)
      expect(data.courier_id).toBe(testCourierId)
    })

    it('should reject invalid order ID format', async () => {
      const response = await fetch('/api/vendor/orders/invalid-uuid/assign-courier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vendorToken}`
        },
        body: JSON.stringify({
          courier_id: testCourierId
        })
      })

      // Contract: Should return 400 for invalid format
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('INVALID_ORDER_ID')
    })

    it('should reject invalid courier ID format', async () => {
      const response = await fetch(`/api/vendor/orders/${testOrderId}/assign-courier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vendorToken}`
        },
        body: JSON.stringify({
          courier_id: 'invalid-uuid'
        })
      })

      // Contract: Should return 400 for validation error
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should reject assignment when courier unavailable', async () => {
      // First assign courier to another order or set offline
      // ... setup code ...

      const response = await fetch(`/api/vendor/orders/${testOrderId}/assign-courier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vendorToken}`
        },
        body: JSON.stringify({
          courier_id: testCourierId
        })
      })

      // Contract: Should return 409 for unavailable courier
      expect(response.status).toBe(409)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('COURIER_UNAVAILABLE')
    })

    it('should reject unauthorized requests', async () => {
      const response = await fetch(`/api/vendor/orders/${testOrderId}/assign-courier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courier_id: testCourierId
        })
      })

      // Contract: Should return 401 for unauthorized
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('UNAUTHORIZED')
    })
  })

  describe('GET /api/vendor/couriers/available', () => {
    it('should return list of available couriers', async () => {
      const response = await fetch('/api/vendor/couriers/available', {
        headers: {
          'Authorization': `Bearer ${vendorToken}`
        }
      })

      // Contract: Should return 200 on success
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have required structure
      expect(data).toHaveProperty('couriers')
      expect(data).toHaveProperty('total_count')
      expect(data.couriers).toBeInstanceOf(Array)

      // Contract: Each courier must have required fields
      if (data.couriers.length > 0) {
        const courier = data.couriers[0]
        expect(courier).toHaveProperty('id')
        expect(courier).toHaveProperty('name')
        expect(courier).toHaveProperty('phone')
        expect(courier).toHaveProperty('vehicle_type')
        expect(courier).toHaveProperty('shift_status')
        expect(courier).toHaveProperty('current_location')
        expect(courier).toHaveProperty('active_delivery')
        expect(courier).toHaveProperty('completed_deliveries_today')
        expect(courier).toHaveProperty('average_rating')
      }
    })

    it('should filter by vehicle type', async () => {
      const response = await fetch('/api/vendor/couriers/available?vehicle_type=motorcycle', {
        headers: {
          'Authorization': `Bearer ${vendorToken}`
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.filters).toHaveProperty('vehicle_type')
      expect(data.filters.vehicle_type).toBe('motorcycle')

      // Contract: All returned couriers should have specified vehicle type
      if (data.couriers.length > 0) {
        data.couriers.forEach((courier: any) => {
          expect(courier.vehicle_type).toBe('motorcycle')
        })
      }
    })

    it('should filter by branch proximity', async () => {
      const testBranchId = 'test-branch-uuid'
      const response = await fetch(`/api/vendor/couriers/available?branch_id=${testBranchId}`, {
        headers: {
          'Authorization': `Bearer ${vendorToken}`
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.filters).toHaveProperty('branch_id')
      expect(data.filters.branch_id).toBe(testBranchId)
    })

    it('should reject invalid vehicle type', async () => {
      const response = await fetch('/api/vendor/couriers/available?vehicle_type=invalid', {
        headers: {
          'Authorization': `Bearer ${vendorToken}`
        }
      })

      // Contract: Should return 400 for invalid enum value
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should handle rate limiting', async () => {
      // Make many requests to trigger rate limit
      const requests = Array.from({ length: 250 }, () =>
        fetch('/api/vendor/couriers/available', {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        })
      )

      const responses = await Promise.all(requests)

      // Contract: Should return 429 after rate limit exceeded
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)

      // Contract: Rate limited response should have retry-after header
      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0]
        expect(rateLimitedResponse.headers.get('Retry-After')).toBeDefined()
      }
    })

    it('should exclude busy couriers', async () => {
      const response = await fetch('/api/vendor/couriers/available', {
        headers: {
          'Authorization': `Bearer ${vendorToken}`
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: All returned couriers should have active_delivery as null
      data.couriers.forEach((courier: any) => {
        expect(courier.active_delivery).toBeNull()
      })
    })

    it('should return proper location format', async () => {
      const response = await fetch('/api/vendor/couriers/available', {
        headers: {
          'Authorization': `Bearer ${vendorToken}`
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Location should be in proper format or null
      data.couriers.forEach((courier: any) => {
        if (courier.current_location) {
          expect(courier.current_location).toHaveProperty('lat')
          expect(courier.current_location).toHaveProperty('lng')
          expect(typeof courier.current_location.lat).toBe('number')
          expect(typeof courier.current_location.lng).toBe('number')
        }
      })
    })
  })

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now()
      
      const response = await fetch('/api/vendor/couriers/available', {
        headers: {
          'Authorization': `Bearer ${vendorToken}`
        }
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      // Contract: Should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000)
      expect(response.status).toBe(200)
    })
  })
})
