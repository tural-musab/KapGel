/**
 * Vendor API Contract Tests
 * 
 * Tests the vendor API endpoints against the contract specification
 * defined in specs/001-kapsam-roller-m/contracts/vendor-api.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'

let testVendorId: string
let testBranchId: string
let testCategoryId: string
let testProductId: string
let vendorToken: string

const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)

describe('Vendor API Contract Tests', () => {
  beforeAll(async () => {
    // Setup test data
    testVendorId = 'test-vendor-uuid'
    testBranchId = 'test-branch-uuid'
    testCategoryId = 'test-category-uuid'
  })

  afterAll(async () => {
    // Cleanup test data
  })

  describe('GET /api/vendor/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/dashboard/stats?period=today`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('period')
      expect(data).toHaveProperty('stats')
      expect(data).toHaveProperty('status_breakdown')
      expect(data).toHaveProperty('hourly_orders')
      expect(data).toHaveProperty('top_products')

      // Contract: Stats must have required metrics
      expect(data.stats).toHaveProperty('total_orders')
      expect(data.stats).toHaveProperty('active_orders')
      expect(data.stats).toHaveProperty('completed_orders')
      expect(data.stats).toHaveProperty('revenue')
      expect(data.stats).toHaveProperty('average_order_value')

      // Contract: All numeric values
      expect(typeof data.stats.total_orders).toBe('number')
      expect(typeof data.stats.revenue).toBe('number')
    })

    it('should support different time periods', async () => {
      const periods = ['today', 'week', 'month']

      for (const period of periods) {
        const response = await fetch(
          `${API_BASE_URL}/api/vendor/dashboard/stats?period=${period}`,
          {
            headers: {
              'Authorization': `Bearer ${vendorToken}`
            }
          }
        )

        expect(response.status).toBe(200)
        
        const data = await response.json()
        
        // Contract: Period should match request
        expect(data.period).toBe(period)
      }
    })

    it('should filter by branch_id', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/dashboard/stats?branch_id=${testBranchId}`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('stats')
    })
  })

  describe('GET /api/vendor/products', () => {
    it('should return products list', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('products')
      expect(data).toHaveProperty('pagination')

      // Contract: products must be an array
      expect(Array.isArray(data.products)).toBe(true)

      // Contract: Each product must have required fields
      if (data.products.length > 0) {
        const product = data.products[0]
        expect(product).toHaveProperty('id')
        expect(product).toHaveProperty('name')
        expect(product).toHaveProperty('price')
        expect(product).toHaveProperty('is_available')
        expect(product).toHaveProperty('category_name')
      }
    })

    it('should filter by category', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products?category_id=${testCategoryId}`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      expect(response.status).toBe(200)
      
      const data = await response.json()
      
      // Contract: All products should match category filter
      data.products.forEach((product: any) => {
        expect(product.category_id).toBe(testCategoryId)
      })
    })

    it('should filter by availability', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products?is_available=true`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      expect(response.status).toBe(200)
      
      const data = await response.json()
      
      // Contract: All products should be available
      data.products.forEach((product: any) => {
        expect(product.is_available).toBe(true)
      })
    })

    it('should support search', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products?search=pizza`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      expect(response.status).toBe(200)
      
      const data = await response.json()
      
      // Contract: Results should match search term
      data.products.forEach((product: any) => {
        expect(product.name.toLowerCase()).toContain('pizza')
      })
    })

    it('should paginate results', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products?page=1&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      expect(response.status).toBe(200)
      
      const data = await response.json()
      
      // Contract: Should respect limit
      expect(data.products.length).toBeLessThanOrEqual(10)
      expect(data.pagination.limit).toBe(10)
    })
  })

  describe('POST /api/vendor/products', () => {
    it('should create product with valid data', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category_id: testCategoryId,
            name: 'Pizza Margherita',
            description: 'Classic Italian pizza',
            price: 45.00,
            image_url: 'https://example.com/pizza.jpg',
            preparation_time: 20,
            is_available: true,
            inventory_count: 50
          })
        }
      )

      // Contract: Should return 201 Created
      expect(response.status).toBe(201)

      const data = await response.json()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('vendor_id')
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('price')
      expect(data).toHaveProperty('created_at')

      // Contract: Values should match request
      expect(data.name).toBe('Pizza Margherita')
      expect(data.price).toBe(45.00)

      testProductId = data.id
    })

    it('should reject duplicate product name', async () => {
      // Create first product
      await fetch(`${API_BASE_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vendorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          name: 'Unique Product',
          price: 30.00
        })
      })

      // Try to create duplicate
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category_id: testCategoryId,
            name: 'Unique Product', // Duplicate name
            price: 35.00
          })
        }
      )

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)

      const error = await response.json()

      // Contract: Error code should be VALIDATION_ERROR
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toHaveProperty('name')
    })

    it('should reject invalid price', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category_id: testCategoryId,
            name: 'Test Product',
            price: -10.00 // Invalid: negative price
          })
        }
      )

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)

      const error = await response.json()
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toHaveProperty('price')
    })

    it('should reject too short name', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category_id: testCategoryId,
            name: 'AB', // Too short (< 3 chars)
            price: 20.00
          })
        }
      )

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/vendor/products/:id', () => {
    it('should update product', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products/${testProductId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Pizza Margherita (Updated)',
            price: 47.00,
            is_available: false
          })
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Should reflect updates
      expect(data.name).toBe('Pizza Margherita (Updated)')
      expect(data.price).toBe(47.00)
      expect(data.is_available).toBe(false)
      expect(data).toHaveProperty('updated_at')
    })

    it('should reject update to non-owned product', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products/other-vendor-product-id`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            price: 50.00
          })
        }
      )

      // Contract: Should return 403 Forbidden
      expect(response.status).toBe(403)
    })
  })

  describe('DELETE /api/vendor/products/:id', () => {
    it('should soft delete product', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products/${testProductId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have confirmation
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('product_id')
      expect(data).toHaveProperty('deleted_at')
    })

    it('should prevent deletion of product with active orders', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products/product-with-orders-id`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      // Contract: Should return 409 Conflict
      expect(response.status).toBe(409)

      const error = await response.json()

      // Contract: Error code should be ACTIVE_ORDERS_EXIST
      expect(error.code).toBe('ACTIVE_ORDERS_EXIST')
      expect(error).toHaveProperty('details')
    })
  })

  describe('POST /api/vendor/products/bulk-availability', () => {
    it('should bulk update availability', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/products/bulk-availability`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_ids: ['product-1', 'product-2', 'product-3'],
            is_available: false
          })
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must show updated count
      expect(data).toHaveProperty('updated_count')
      expect(data).toHaveProperty('products')
      expect(typeof data.updated_count).toBe('number')
      expect(Array.isArray(data.products)).toBe(true)
    })
  })

  describe('POST /api/vendor/orders/:id/assign-courier', () => {
    it('should assign courier to ready order', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/orders/test-order-id/assign-courier`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            courier_id: 'test-courier-id'
          })
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have assignment details
      expect(data).toHaveProperty('order_id')
      expect(data).toHaveProperty('courier_id')
      expect(data).toHaveProperty('courier_name')
      expect(data).toHaveProperty('assigned_at')
    })

    it('should reject assignment to non-READY order', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/orders/new-order-id/assign-courier`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            courier_id: 'test-courier-id'
          })
        }
      )

      // Contract: Should return 400 Bad Request
      expect(response.status).toBe(400)

      const error = await response.json()
      expect(error.code).toBe('INVALID_STATUS')
    })

    it('should reject unavailable courier', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/orders/ready-order-id/assign-courier`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vendorToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            courier_id: 'busy-courier-id' // Courier with active delivery
          })
        }
      )

      // Contract: Should return 409 Conflict
      expect(response.status).toBe(409)

      const error = await response.json()
      expect(error.code).toBe('COURIER_UNAVAILABLE')
    })
  })

  describe('GET /api/vendor/couriers/available', () => {
    it('should return available couriers', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/couriers/available`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      // Contract: Should return 200 OK
      expect(response.status).toBe(200)

      const data = await response.json()

      // Contract: Response must have couriers array
      expect(data).toHaveProperty('couriers')
      expect(data).toHaveProperty('total_count')
      expect(Array.isArray(data.couriers)).toBe(true)

      // Contract: Each courier must have required fields
      if (data.couriers.length > 0) {
        const courier = data.couriers[0]
        expect(courier).toHaveProperty('id')
        expect(courier).toHaveProperty('name')
        expect(courier).toHaveProperty('vehicle_type')
        expect(courier).toHaveProperty('shift_status')
        expect(courier.shift_status).toBe('online')
      }
    })

    it('should filter by vehicle type', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/vendor/couriers/available?vehicle_type=motorcycle`,
        {
          headers: {
            'Authorization': `Bearer ${vendorToken}`
          }
        }
      )

      expect(response.status).toBe(200)
      
      const data = await response.json()
      
      // Contract: All couriers should match filter
      data.couriers.forEach((courier: any) => {
        expect(courier.vehicle_type).toBe('motorcycle')
      })
    })
  })
})
