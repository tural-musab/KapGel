/**
 * Vendor Products Bulk Availability API
 * 
 * Bulk update product availability status
 * 
 * @see specs/001-kapsam-roller-m/contracts/vendor-api.md
 */

import { createClient } from 'lib/supabase/server';
import { logEvent } from 'lib/logging';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Bulk availability schema
 */
const bulkAvailabilitySchema = z.object({
  product_ids: z
    .array(z.string().uuid('Invalid product ID'))
    .min(1, 'At least one product ID is required')
    .max(100, 'Maximum 100 products can be updated at once'),
  is_active: z.boolean(),
});

type BulkAvailabilityInput = z.infer<typeof bulkAvailabilitySchema>;

/**
 * POST /api/vendor/products/bulk-availability
 * 
 * Bulk updates product availability
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();

  if (!supabase) {
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
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Get vendor for user
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_user_id', user.id)
    .single();

  if (vendorError || !vendor) {
    return NextResponse.json(
      { error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Parse and validate request body
  let body: BulkAvailabilityInput;
  try {
    const rawBody = await request.json();
    const parseResult = bulkAvailabilitySchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
        { status: 400 }
      );
    }

    body = parseResult.data;
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'PARSE_ERROR' },
      { status: 400 }
    );
  }

  // Verify all products belong to vendor
  const { data: products, error: verifyError } = await supabase
    .from('products')
    .select('id, name, is_active')
    .eq('vendor_id', vendor.id)
    .in('id', body.product_ids);

  if (verifyError) {
    logEvent({
      level: 'error',
      event: 'vendor.products.bulk_verify_error',
      message: 'Failed to verify product ownership',
      error: verifyError,
      context: { userId: user.id, vendorId: vendor.id },
    });
    return NextResponse.json(
      { error: 'Failed to verify products', code: 'VERIFY_ERROR' },
      { status: 500 }
    );
  }

  if (!products || products.length === 0) {
    return NextResponse.json(
      { error: 'No products found or access denied', code: 'PRODUCTS_NOT_FOUND' },
      { status: 404 }
    );
  }

  if (products.length !== body.product_ids.length) {
    return NextResponse.json(
      {
        error: 'Some products not found or access denied',
        code: 'PARTIAL_ACCESS',
        details: `Found ${products.length} out of ${body.product_ids.length} products`,
      },
      { status: 400 }
    );
  }

  // Update availability for all products
  const { data: updatedProducts, error: updateError } = await supabase
    .from('products')
    .update({ is_active: body.is_active })
    .eq('vendor_id', vendor.id)
    .in('id', body.product_ids)
    .select('id, name, is_active');

  if (updateError) {
    logEvent({
      level: 'error',
      event: 'vendor.products.bulk_update_error',
      message: 'Failed to bulk update products',
      error: updateError,
      context: { userId: user.id, vendorId: vendor.id, count: body.product_ids.length },
    });
    return NextResponse.json(
      { error: 'Failed to update products', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }

  logEvent({
    level: 'info',
    event: 'vendor.products.bulk_update_success',
    message: 'Products bulk updated successfully',
    context: {
      userId: user.id,
      vendorId: vendor.id,
      count: updatedProducts?.length || 0,
      isActive: body.is_active,
    },
  });

  return NextResponse.json({
    updated_count: updatedProducts?.length || 0,
    products: updatedProducts || [],
  });
}
