/**
 * Available Couriers API
 * 
 * Lists available couriers for assignment to orders
 * 
 * @see specs/001-kapsam-roller-m/contracts/vendor-api.md
 */

import { createClient } from 'lib/supabase/server';
import { logEvent } from 'lib/logging';
import { rateLimit, rateLimitConfigs } from 'lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Query parameters schema
 */
const querySchema = z.object({
  branch_id: z.string().uuid().optional(),
  vehicle_type: z.enum(['motorcycle', 'bicycle', 'car']).optional(),
});

/**
 * GET /api/vendor/couriers/available
 * 
 * Lists available couriers for vendor
 * 
 * @param request Next.js request with query parameters
 * @returns List of available couriers
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimiter = rateLimit(rateLimitConfigs.vendorApi);
  const rateLimitResult = rateLimiter(request);
  
  if (!rateLimitResult.allowed) {
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
      event: 'vendor.available_couriers.config_error',
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
      event: 'vendor.available_couriers.unauthorized',
      message: 'Available couriers request without authentication',
    });
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = {
    branch_id: searchParams.get('branch_id') || undefined,
    vehicle_type: searchParams.get('vehicle_type') || undefined,
  };

  const parseResult = querySchema.safeParse(queryParams);
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    return NextResponse.json(
      {
        error: firstError?.message || 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const { branch_id, vehicle_type } = parseResult.data;

  // Verify user is vendor admin
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id, has_own_couriers')
    .eq('owner_user_id', user.id)
    .single();

  if (vendorError || !vendor) {
    logEvent({
      level: 'error',
      event: 'vendor.available_couriers.vendor_not_found',
      message: 'Vendor record not found for user',
      error: vendorError,
      context: { userId: user.id },
    });
    return NextResponse.json(
      { error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Build query for available couriers
  let query = supabase
    .from('couriers')
    .select(`
      id,
      user_id,
      vehicle_type,
      shift_status,
      users!inner(
        phone,
        metadata
      )
    `)
    .eq('shift_status', 'online');

  // Filter by vendor's couriers if they have their own
  if (vendor.has_own_couriers) {
    query = query.eq('vendor_id', vendor.id);
  }

  // Apply filters
  if (vehicle_type) {
    query = query.eq('vehicle_type', vehicle_type);
  }

  const { data: courierData, error: courierError } = await query;

  if (courierError) {
    logEvent({
      level: 'error',
      event: 'vendor.available_couriers.query_failed',
      message: 'Failed to fetch available couriers',
      error: courierError,
      context: { userId: user.id, vendorId: vendor.id },
    });
    return NextResponse.json(
      { error: 'Failed to fetch couriers', code: 'QUERY_FAILED' },
      { status: 500 }
    );
  }

  // Check for active deliveries to filter out busy couriers
  const courierIds = courierData?.map(c => c.id) || [];
  
  let busyCouriers: string[] = [];
  if (courierIds.length > 0) {
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('courier_id')
      .in('courier_id', courierIds)
      .in('status', ['PICKED_UP', 'ON_ROUTE']);

    busyCouriers = activeOrders?.map(o => o.courier_id).filter(Boolean) || [];
  }

  // Get latest locations for available couriers
  const availableCourierIds = courierIds.filter(id => !busyCouriers.includes(id));
  
  let courierLocations: Record<string, { lat: number; lng: number }> = {};
  if (availableCourierIds.length > 0) {
    const { data: locations } = await supabase
      .from('courier_locations')
      .select('courier_id, position')
      .in('courier_id', availableCourierIds)
      .order('updated_at', { ascending: false });

    // Process locations (simplified - would need PostGIS functions for real coordinates)
    locations?.forEach(loc => {
      if (loc.position && !courierLocations[loc.courier_id]) {
        // This is a simplified coordinate extraction
        // In real app, you'd use ST_X and ST_Y functions
        courierLocations[loc.courier_id] = {
          lat: 40.4093, // Placeholder
          lng: 49.8671  // Placeholder
        };
      }
    });
  }

  // Get courier statistics (simplified)
  const courierStats: Record<string, { completed_today: number; rating: number }> = {};
  
  // Format response
  const availableCouriers = (courierData || [])
    .filter(courier => !busyCouriers.includes(courier.id))
    .map(courier => {
      // Safe access to user data
      const userData = Array.isArray(courier.users) ? courier.users[0] : courier.users;
      
      return {
        id: courier.id,
        user_id: courier.user_id,
        name: userData?.metadata?.name || 'Kurye',
        phone: userData?.phone || '',
        vehicle_type: courier.vehicle_type,
        shift_status: courier.shift_status,
        current_location: courierLocations[courier.id] || null,
        active_delivery: null,
        completed_deliveries_today: courierStats[courier.id]?.completed_today || 0,
        average_rating: courierStats[courier.id]?.rating || 4.5,
      };
    });

  // Success response
  logEvent({
    level: 'info',
    event: 'vendor.available_couriers.success',
    message: 'Available couriers fetched successfully',
    context: {
      userId: user.id,
      vendorId: vendor.id,
      courierCount: availableCouriers.length,
      filters: { branch_id, vehicle_type },
    },
  });

  return NextResponse.json(
    {
      couriers: availableCouriers,
      total_count: availableCouriers.length,
      filters: {
        branch_id,
        vehicle_type,
      },
    },
    { status: 200 }
  );
}