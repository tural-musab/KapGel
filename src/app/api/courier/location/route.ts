/**
 * Courier Location API Route
 * 
 * Handles courier GPS location updates for real-time tracking.
 * 
 * @see specs/001-kapsam-roller-m/contracts/courier-location-api.md
 */

import { createClient } from 'lib/supabase/server';
import { logEvent } from 'lib/logging';
import { rateLimit, rateLimitConfigs } from 'lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Request body schema for location updates
 * 
 * Contract requirements:
 * - lat: Required, -90 to 90
 * - lng: Required, -180 to 180
 * - order_id: Optional UUID
 * - accuracy: Optional, >= 0 meters
 * - heading: Optional, 0-360 degrees
 * - speed: Optional, >= 0 m/s
 * - is_manual: Optional boolean
 */
const locationSchema = z.object({
  lat: z.number()
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  lng: z.number()
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
  order_id: z.string().uuid().optional(),
  accuracy: z.number().nonnegative('Accuracy must be >= 0').optional(),
  heading: z.number()
    .min(0, 'Heading must be >= 0')
    .max(360, 'Heading must be <= 360')
    .optional(),
  speed: z.number().nonnegative('Speed must be >= 0').optional(),
  is_manual: z.boolean().optional().default(false),
});

type LocationUpdate = z.infer<typeof locationSchema>;

/**
 * POST /api/courier/location
 * 
 * Updates courier's current GPS location
 * 
 * @param request - Next.js request with location data
 * @returns Location update confirmation or error
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimiter = rateLimit(rateLimitConfigs.courierLocation);
  const rateLimitResult = rateLimiter(request);
  
  if (!rateLimitResult.allowed) {
    logEvent({
      level: 'warn',
      event: 'courier.location.rate_limited',
      message: 'Rate limit exceeded for location updates',
      context: {
        retryAfter: rateLimitResult.retryAfter,
      },
    });
    return NextResponse.json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
        },
      }
    );
  }

  const supabase = createClient();

  if (!supabase) {
    logEvent({
      level: 'error',
      event: 'courier.location.config_error',
      message: 'Supabase client not configured',
    });
    return NextResponse.json(
      { error: 'Service unavailable', code: 'CONFIG_ERROR' },
      { status: 500 }
    );
  }

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logEvent({
      level: 'warn',
      event: 'courier.location.unauthorized',
      message: 'Location update attempted without authentication',
    });
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Parse and validate request body
  let body: LocationUpdate;
  try {
    const rawBody = await request.json();
    const parseResult = locationSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      logEvent({
        level: 'warn',
        event: 'courier.location.validation_error',
        message: 'Invalid location data',
        context: {
          userId: user.id,
          error: firstError?.message,
          path: firstError?.path,
        },
      });
      return NextResponse.json(
        {
          error: firstError?.message || 'Invalid request data',
          code: 'INVALID_COORDINATES',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    body = parseResult.data;
  } catch (error) {
    logEvent({
      level: 'error',
      event: 'courier.location.parse_error',
      message: 'Failed to parse request body',
      error,
      context: { userId: user.id },
    });
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'PARSE_ERROR' },
      { status: 400 }
    );
  }

  // Get courier ID for authenticated user
  const { data: courier, error: courierError } = await supabase
    .from('couriers')
    .select('id, shift_status')
    .eq('user_id', user.id)
    .single();

  if (courierError || !courier) {
    logEvent({
      level: 'error',
      event: 'courier.location.courier_not_found',
      message: 'Courier record not found for user',
      error: courierError,
      context: { userId: user.id },
    });
    return NextResponse.json(
      { error: 'Courier not found', code: 'COURIER_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Call RPC function to insert location
  const { data, error } = await supabase.rpc('insert_courier_location', {
    _courier_id: courier.id,
    _lat: body.lat,
    _lng: body.lng,
    _order_id: body.order_id || null,
    _accuracy: body.accuracy || null,
    _heading: body.heading || null,
    _speed: body.speed || null,
    _is_manual: body.is_manual,
  });

  if (error) {
    // Map database errors to API error codes
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = error.message;

    if (error.message.includes('Invalid coordinates')) {
      statusCode = 400;
      errorCode = 'INVALID_COORDINATES';
    } else if (error.message.includes('not on active shift')) {
      statusCode = 403;
      errorCode = 'COURIER_OFFLINE';
      errorMessage = 'Courier must be online to share location';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'COURIER_NOT_FOUND';
    }

    logEvent({
      level: 'error',
      event: 'courier.location.update_failed',
      message: 'Failed to insert courier location',
      error,
      context: {
        userId: user.id,
        courierId: courier.id,
        lat: body.lat,
        lng: body.lng,
        orderId: body.order_id,
      },
    });

    return NextResponse.json(
      { error: errorMessage, code: errorCode, details: error.hint },
      { status: statusCode }
    );
  }

  // Success
  logEvent({
    level: 'info',
    event: 'courier.location.update_success',
    message: 'Courier location updated successfully',
    context: {
      userId: user.id,
      courierId: courier.id,
      locationId: data.id,
      orderId: body.order_id,
      lat: body.lat,
      lng: body.lng,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: data.id,
        timestamp: data.timestamp,
        position: {
          type: 'Point',
          coordinates: [data.lng, data.lat], // GeoJSON format: [lng, lat]
        },
      },
    },
    { status: 200 }
  );
}

/**
 * GET /api/courier/location
 * 
 * Not implemented in this version.
 * Future: Could return courier's last known location.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
