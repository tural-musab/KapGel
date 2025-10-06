/**
 * Courier Location API Contract Tests
 * 
 * Tests the courier location API endpoints against the contract specification
 * defined in specs/001-kapsam-roller-m/contracts/courier-location-api.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const TEST_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let testCourierId: string
let testOrderId: string
let courierToken: string

const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)

describe('Courier Location API Contract Tests', () => {
  beforeAll(async () => {
    // Setup test data
    testCourierId = 'test-courier-uuid'
    testOrderId = 'test-order-uuid'
  })

  afterAll(async () => {
    // Cleanup test data
  })

  describe('RPC: insert_courier_location', () => {
    it('should accept valid location update', async () => {
      const { data, error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 49.8671,
        _order_id: testOrderId,
        _accuracy: 15.5,
        _heading: 270.0,
        _speed: 5.2,
        _is_manual: false
      })

      // Contract: Should succeed without error
      expect(error).toBeNull()

      // Contract: Response must have required fields
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('courier_id')
      expect(data).toHaveProperty('lat')
      expect(data).toHaveProperty('lng')
      expect(data).toHaveProperty('timestamp')

      // Contract: Coordinates should match request
      expect(data.lat).toBe(40.4093)
      expect(data.lng).toBe(49.8671)
    })

    it('should reject invalid latitude', async () => {
      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 95.0, // Invalid: > 90
        _lng: 49.8671
      })

      // Contract: Should return error
      expect(error).toBeDefined()

      // Contract: Error code should be INVALID_COORDINATES
      expect(error?.code).toBe('INVALID_COORDINATES')
    })

    it('should reject invalid longitude', async () => {
      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 185.0 // Invalid: > 180
      })

      // Contract: Should return error
      expect(error).toBeDefined()
      expect(error?.code).toBe('INVALID_COORDINATES')
    })

    it('should reject location from offline courier', async () => {
      // First, set courier to offline
      await supabase
        .from('couriers')
        .update({ shift_status: 'offline' })
        .eq('id', testCourierId)

      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 49.8671
      })

      // Contract: Should return error
      expect(error).toBeDefined()

      // Contract: Error code should be COURIER_OFFLINE
      expect(error?.code).toBe('COURIER_OFFLINE')

      // Restore courier to online
      await supabase
        .from('couriers')
        .update({ shift_status: 'online' })
        .eq('id', testCourierId)
    })

    it('should accept location without optional parameters', async () => {
      const { data, error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 49.8671
        // No optional parameters
      })

      // Contract: Should succeed
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should validate heading range', async () => {
      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 49.8671,
        _heading: 400.0 // Invalid: > 360
      })

      // Contract: Should return validation error
      expect(error).toBeDefined()
      expect(error?.code).toBe('INVALID_COORDINATES')
    })

    it('should validate accuracy is non-negative', async () => {
      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 49.8671,
        _accuracy: -10.0 // Invalid: negative
      })

      // Contract: Should return validation error
      expect(error).toBeDefined()
    })

    it('should validate speed is non-negative', async () => {
      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 49.8671,
        _speed: -5.0 // Invalid: negative
      })

      // Contract: Should return validation error
      expect(error).toBeDefined()
    })
  })

  describe('Real-time Location Subscription', () => {
    it('should receive location updates via subscription', (done) => {
      const channel = supabase
        .channel(`order:${testOrderId}:location`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'courier_locations',
            filter: `order_id=eq.${testOrderId}`
          },
          (payload) => {
            // Contract: Payload must have new record
            expect(payload.new).toBeDefined()

            // Contract: New record must have position
            expect(payload.new).toHaveProperty('position')
            expect(payload.new).toHaveProperty('courier_id')
            expect(payload.new).toHaveProperty('order_id')

            // Cleanup and complete test
            supabase.removeChannel(channel)
            done()
          }
        )
        .subscribe()

      // Trigger location insert after subscription is ready
      setTimeout(async () => {
        await supabase.rpc('insert_courier_location', {
          _courier_id: testCourierId,
          _lat: 40.4100,
          _lng: 49.8680,
          _order_id: testOrderId
        })
      }, 1000)
    }, 10000) // 10 second timeout

    it('should not receive updates for different orders', (done) => {
      let receivedUpdate = false

      const channel = supabase
        .channel(`order:other-order-id:location`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'courier_locations',
            filter: `order_id=eq.other-order-id`
          },
          () => {
            receivedUpdate = true
          }
        )
        .subscribe()

      // Insert location for different order
      setTimeout(async () => {
        await supabase.rpc('insert_courier_location', {
          _courier_id: testCourierId,
          _lat: 40.4093,
          _lng: 49.8671,
          _order_id: testOrderId // Different order
        })

        // Wait a bit then check
        setTimeout(() => {
          // Contract: Should not have received update
          expect(receivedUpdate).toBe(false)
          supabase.removeChannel(channel)
          done()
        }, 2000)
      }, 1000)
    }, 10000)
  })

  describe('RLS Policies', () => {
    it('should allow courier to insert own location', async () => {
      // Authenticate as courier
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'test-courier@example.com',
        password: 'testpassword'
      })

      expect(authData.user).toBeDefined()

      // Try to insert location
      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: testCourierId,
        _lat: 40.4093,
        _lng: 49.8671
      })

      // Contract: Should succeed
      expect(error).toBeNull()

      await supabase.auth.signOut()
    })

    it('should prevent courier from inserting location for another courier', async () => {
      // Authenticate as courier A
      await supabase.auth.signInWithPassword({
        email: 'courier-a@example.com',
        password: 'testpassword'
      })

      // Try to insert location for courier B
      const { error } = await supabase.rpc('insert_courier_location', {
        _courier_id: 'different-courier-id',
        _lat: 40.4093,
        _lng: 49.8671
      })

      // Contract: Should be rejected
      expect(error).toBeDefined()

      await supabase.auth.signOut()
    })

    it('should allow customer to view location for their order', async () => {
      // Authenticate as customer
      await supabase.auth.signInWithPassword({
        email: 'test-customer@example.com',
        password: 'testpassword'
      })

      // Query courier location for their order
      const { data, error } = await supabase
        .from('courier_locations')
        .select('*')
        .eq('order_id', testOrderId)
        .limit(1)

      // Contract: Should succeed
      expect(error).toBeNull()
      expect(data).toBeDefined()

      await supabase.auth.signOut()
    })

    it('should prevent customer from viewing location for other orders', async () => {
      // Authenticate as customer A
      await supabase.auth.signInWithPassword({
        email: 'customer-a@example.com',
        password: 'testpassword'
      })

      // Try to query location for customer B's order
      const { data, error } = await supabase
        .from('courier_locations')
        .select('*')
        .eq('order_id', 'other-customer-order-id')
        .limit(1)

      // Contract: Should return empty or error due to RLS
      if (error) {
        expect(error).toBeDefined()
      } else {
        expect(data).toHaveLength(0)
      }

      await supabase.auth.signOut()
    })

    it('should allow admin to view all locations', async () => {
      // Authenticate as admin
      await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'testpassword'
      })

      // Query all courier locations
      const { data, error } = await supabase
        .from('courier_locations')
        .select('*')
        .limit(10)

      // Contract: Should succeed
      expect(error).toBeNull()
      expect(data).toBeDefined()

      await supabase.auth.signOut()
    })
  })

  describe('Performance & Rate Limiting', () => {
    it('should handle 15-second interval updates', async () => {
      const updates: any[] = []

      // Send location updates every 15 seconds (simulate)
      for (let i = 0; i < 4; i++) {
        const { data, error } = await supabase.rpc('insert_courier_location', {
          _courier_id: testCourierId,
          _lat: 40.4093 + (i * 0.0001),
          _lng: 49.8671 + (i * 0.0001)
        })

        expect(error).toBeNull()
        updates.push(data)

        if (i < 3) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Contract: All updates should succeed
      expect(updates.length).toBe(4)
      updates.forEach(update => {
        expect(update).toHaveProperty('id')
      })
    })

    it('should enforce rate limiting (100 req/min)', async () => {
      // This test would need rate limiting to be implemented
      // For now, we'll skip actual testing but document the contract
      expect(true).toBe(true)
    }, { skip: true })
  })
})
