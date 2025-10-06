# API Contract: Courier Location Updates

**Version:** 1.0  
**Last Updated:** 2025-10-05  
**Status:** Draft  
**Related Specs:** FR-005, FR-009

---

## Overview

This document specifies the API contract for courier location updates in the KapGel platform. Couriers must share their GPS location every 15 seconds while on active delivery to enable real-time tracking for customers.

---

## Endpoint: RPC Function (Primary)

### Function Signature

```sql
insert_courier_location(
  _courier_id uuid,
  _lat double precision,
  _lng double precision,
  _order_id uuid DEFAULT NULL,
  _accuracy double precision DEFAULT NULL,
  _heading double precision DEFAULT NULL,
  _speed double precision DEFAULT NULL,
  _is_manual boolean DEFAULT false
) RETURNS json
```

### Authentication
- **Required:** Valid Supabase session
- **Role:** `courier` or `admin`
- **Validation:** `_courier_id` must match authenticated user's courier record

### Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `_courier_id` | uuid | ✅ Yes | Must exist in `couriers` table | ID of the courier |
| `_lat` | double precision | ✅ Yes | -90.0 to 90.0 | Latitude (WGS84) |
| `_lng` | double precision | ✅ Yes | -180.0 to 180.0 | Longitude (WGS84) |
| `_order_id` | uuid | ❌ No | Must exist if provided | Associated order ID |
| `_accuracy` | double precision | ❌ No | >= 0 | GPS accuracy in meters |
| `_heading` | double precision | ❌ No | 0.0 to 360.0 | Compass heading in degrees |
| `_speed` | double precision | ❌ No | >= 0 | Speed in m/s |
| `_is_manual` | boolean | ❌ No | Default: false | Manual check-in vs automatic |

### Business Rules

1. **Active Shift Validation:**
   - Courier must have `shift_status = 'online'`
   - If offline, function raises exception

2. **Coordinate Validation:**
   - Latitude bounds: [-90, 90]
   - Longitude bounds: [-180, 180]
   - Invalid coordinates rejected

3. **Rate Limiting:**
   - Maximum: 100 requests per minute per courier
   - Enforced at application level

### Response: Success

```json
{
  "id": 12345,
  "courier_id": "550e8400-e29b-41d4-a716-446655440000",
  "order_id": "660e8400-e29b-41d4-a716-446655440000",
  "lat": 40.4093,
  "lng": 49.8671,
  "timestamp": "2025-10-05T14:30:00.123Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid coordinates",
  "code": "INVALID_COORDINATES",
  "details": "Latitude must be between -90 and 90"
}
```

#### 403 Forbidden
```json
{
  "error": "Courier not on active shift",
  "code": "COURIER_OFFLINE",
  "details": "shift_status must be 'online' to share location"
}
```

#### 404 Not Found
```json
{
  "error": "Courier not found",
  "code": "COURIER_NOT_FOUND",
  "courier_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "retry_after": 60
}
```

---

## Endpoint: Next.js API Route (Alternative)

### Route

```
POST /api/courier/location
```

### Request Headers

```
Authorization: Bearer {supabase_session_token}
Content-Type: application/json
```

### Request Body

```json
{
  "lat": 40.4093,
  "lng": 49.8671,
  "order_id": "660e8400-e29b-41d4-a716-446655440000",
  "accuracy": 15.5,
  "heading": 270.0,
  "speed": 5.2,
  "is_manual": false
}
```

### Response: Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 12345,
    "timestamp": "2025-10-05T14:30:00.123Z",
    "position": {
      "type": "Point",
      "coordinates": [49.8671, 40.4093]
    }
  }
}
```

---

## Client Implementation Examples

### TypeScript (React Native / Mobile)

```typescript
import { supabase } from '@/lib/supabase'

async function updateCourierLocation(
  courierId: string,
  position: GeolocationPosition,
  orderId?: string
) {
  try {
    const { data, error } = await supabase.rpc('insert_courier_location', {
      _courier_id: courierId,
      _lat: position.coords.latitude,
      _lng: position.coords.longitude,
      _order_id: orderId,
      _accuracy: position.coords.accuracy,
      _heading: position.coords.heading,
      _speed: position.coords.speed,
      _is_manual: false
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Location update failed:', error)
    throw error
  }
}

// Auto-update every 15 seconds
const intervalId = setInterval(async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCourierLocation(courierId, position, currentOrderId)
      },
      (error) => {
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )
  }
}, 15000)
```

### TypeScript (Next.js API Route)

```typescript
// src/app/api/courier/location/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { lat, lng, order_id, accuracy, heading, speed } = body

    // Get courier_id from user
    const { data: courier } = await supabase
      .from('couriers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!courier) {
      return NextResponse.json(
        { error: 'Courier not found' },
        { status: 404 }
      )
    }

    // Call RPC function
    const { data, error } = await supabase.rpc('insert_courier_location', {
      _courier_id: courier.id,
      _lat: lat,
      _lng: lng,
      _order_id: order_id,
      _accuracy: accuracy,
      _heading: heading,
      _speed: speed,
      _is_manual: false
    })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Real-time Subscription

### Customer/Vendor Subscription

```typescript
import { supabase } from '@/lib/supabase'

function subscribeToDeliveryLocation(orderId: string, onUpdate: (location: any) => void) {
  const channel = supabase
    .channel(`order:${orderId}:location`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'courier_locations',
        filter: `order_id=eq.${orderId}`
      },
      (payload) => {
        onUpdate(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Usage in React component
useEffect(() => {
  const unsubscribe = subscribeToDeliveryLocation(orderId, (location) => {
    setMarkerPosition({
      lat: location.position.coordinates[1],
      lng: location.position.coordinates[0]
    })
  })

  return unsubscribe
}, [orderId])
```

---

## Database Schema

### Table: courier_locations

```sql
CREATE TABLE courier_locations (
  id bigserial PRIMARY KEY,
  courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  position geography(Point) NOT NULL,
  accuracy double precision,
  heading double precision,
  speed double precision,
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_courier_locations_courier_id ON courier_locations(courier_id);
CREATE INDEX idx_courier_locations_order_id ON courier_locations(order_id);
CREATE INDEX idx_courier_locations_updated_at ON courier_locations(updated_at DESC);
CREATE INDEX idx_courier_locations_position ON courier_locations USING GIST(position);

-- RLS Policies
ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;

-- Couriers can insert their own locations
CREATE POLICY "Couriers can insert own location"
  ON courier_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couriers
      WHERE id = courier_locations.courier_id
      AND user_id = auth.uid()
      AND shift_status = 'online'
    )
  );

-- Customers can view location for their orders
CREATE POLICY "Customers can view delivery location"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = courier_locations.order_id
      AND customer_id = auth.uid()
    )
  );

-- Vendors can view location for their orders
CREATE POLICY "Vendors can view branch delivery location"
  ON courier_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN branches b ON b.id = o.branch_id
      JOIN vendors v ON v.id = b.vendor_id
      WHERE o.id = courier_locations.order_id
      AND v.owner_user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to locations"
  ON courier_locations FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');
```

---

## Testing

### Unit Tests

```typescript
import { createClient } from '@supabase/supabase-js'

describe('Courier Location Updates', () => {
  it('should accept valid location update', async () => {
    const { data, error } = await supabase.rpc('insert_courier_location', {
      _courier_id: testCourierId,
      _lat: 40.4093,
      _lng: 49.8671,
      _order_id: testOrderId
    })

    expect(error).toBeNull()
    expect(data.lat).toBe(40.4093)
    expect(data.lng).toBe(49.8671)
  })

  it('should reject invalid latitude', async () => {
    const { error } = await supabase.rpc('insert_courier_location', {
      _courier_id: testCourierId,
      _lat: 95.0, // Invalid
      _lng: 49.8671
    })

    expect(error).toBeDefined()
    expect(error.code).toBe('INVALID_COORDINATES')
  })

  it('should reject offline courier', async () => {
    // Set courier to offline
    await supabase
      .from('couriers')
      .update({ shift_status: 'offline' })
      .eq('id', testCourierId)

    const { error } = await supabase.rpc('insert_courier_location', {
      _courier_id: testCourierId,
      _lat: 40.4093,
      _lng: 49.8671
    })

    expect(error).toBeDefined()
    expect(error.code).toBe('COURIER_OFFLINE')
  })
})
```

### E2E Tests (Playwright)

```typescript
test('courier location appears on customer map', async ({ page, context }) => {
  // Customer page
  const customerPage = page
  await customerPage.goto(`/orders/${testOrderId}`)

  // Courier sends location
  const courierPage = await context.newPage()
  await courierPage.goto('/courier/dashboard')
  
  // Simulate GPS update
  await courierPage.evaluate(() => {
    window.postMessage({
      type: 'GPS_UPDATE',
      lat: 40.4093,
      lng: 49.8671
    })
  })

  // Verify map marker updated on customer page
  await customerPage.waitForTimeout(2000) // Wait for realtime update
  
  const markerPosition = await customerPage.evaluate(() => {
    const marker = document.querySelector('.courier-marker')
    return marker?.getAttribute('data-position')
  })

  expect(markerPosition).toBe('40.4093,49.8671')
})
```

---

## Performance Considerations

### Rate Limiting Implementation

```typescript
// lib/rate-limit.ts
import { RateLimiter } from 'limiter'

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'second'
})

channel.on('postgres_changes', {}, async (payload) => {
  const allowed = await limiter.removeTokens(1)
  if (!allowed) {
    console.warn('Rate limit exceeded, dropping event')
    return
  }
  handleUpdate(payload)
})
```

### Database Optimization

- **Partitioning**: Consider time-based partitioning for `courier_locations` table (e.g., daily partitions)
- **Retention**: Implement TTL to delete locations older than 7 days
- **Indexing**: GIST index on `position` column for geospatial queries

---

## Migration & Rollout

### Phase 1: Feature Flag (Week 1)
- Enable for 10% of users
- Monitor error rates
- Fallback to polling if issues

### Phase 2: Gradual Rollout (Week 2)
- 50% of users
- Monitor connection count
- Optimize if approaching limits

### Phase 3: Full Rollout (Week 3)
- 100% of users
- Disable polling fallback
- Monitor stability

---

## Related Documentation

- [Order Status API Contract](./orders-api.md)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [PostgreSQL CDC Guide](https://supabase.com/docs/guides/realtime/postgres-changes)
- [FR-004: Real-time Tracking](../spec.md#fr-004)
- [FR-005: Courier Location Sharing](../spec.md#fr-005)

---

## Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-05 | Initial draft | AI Assistant |

---

## Approval

- [ ] Tech Lead Review
- [ ] Backend Team Sign-off
- [ ] Frontend Team Sign-off
- [ ] Load Testing Complete
