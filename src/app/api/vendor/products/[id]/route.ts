/**
 * Vendor Product Detail API
 * 
 * Handles individual product updates and deletion
 * 
 * @see specs/001-kapsam-roller-m/contracts/vendor-api.md
 */

import { createClient } from 'lib/supabase/server';
import { logEvent } from 'lib/logging';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Product update schema
 */
const updateProductSchema = z.object({
  category_id: z.string().uuid('Invalid category ID').optional(),
  name: z
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .max(100, 'Product name must be at most 100 characters')
    .optional(),
  price: z
    .number()
    .positive('Price must be greater than 0')
    .refine((val) => {
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    }, 'Price must have at most 2 decimal places')
    .optional(),
  photo_url: z.string().url('Invalid image URL').nullable().optional(),
  is_active: z.boolean().optional(),
});

type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * PUT /api/vendor/products/:id
 * 
 * Updates a product
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await context.params;

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
  let body: UpdateProductInput;
  try {
    const rawBody = await request.json();
    const parseResult = updateProductSchema.safeParse(rawBody);

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

  // Check if product exists and belongs to vendor
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('id, vendor_id, name')
    .eq('id', productId)
    .eq('vendor_id', vendor.id)
    .single();

  if (fetchError || !existingProduct) {
    return NextResponse.json(
      { error: 'Product not found or access denied', code: 'PRODUCT_NOT_FOUND' },
      { status: 404 }
    );
  }

  // If name is being updated, check for duplicates
  if (body.name && body.name !== existingProduct.name) {
    const { data: duplicateProduct } = await supabase
      .from('products')
      .select('id')
      .eq('vendor_id', vendor.id)
      .eq('name', body.name)
      .neq('id', productId)
      .single();

    if (duplicateProduct) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            name: ['Product name already exists'],
          },
        },
        { status: 400 }
      );
    }
  }

  // If category is being updated, verify it belongs to vendor
  if (body.category_id) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', body.category_id)
      .eq('vendor_id', vendor.id)
      .single();

    if (!category) {
      return NextResponse.json(
        {
          error: 'Category not found or does not belong to vendor',
          code: 'INVALID_CATEGORY',
        },
        { status: 400 }
      );
    }
  }

  // Update product
  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update({
      ...(body.category_id && { category_id: body.category_id }),
      ...(body.name && { name: body.name }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.photo_url !== undefined && { photo_url: body.photo_url }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
    })
    .eq('id', productId)
    .select('id, name, price, is_active, photo_url')
    .single();

  if (updateError || !updatedProduct) {
    logEvent({
      level: 'error',
      event: 'vendor.products.update_error',
      message: 'Failed to update product',
      error: updateError,
      context: { userId: user.id, vendorId: vendor.id, productId },
    });
    return NextResponse.json(
      { error: 'Failed to update product', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }

  logEvent({
    level: 'info',
    event: 'vendor.products.update_success',
    message: 'Product updated successfully',
    context: {
      userId: user.id,
      vendorId: vendor.id,
      productId,
      changes: Object.keys(body),
    },
  });

  return NextResponse.json(updatedProduct);
}

/**
 * DELETE /api/vendor/products/:id
 * 
 * Soft deletes a product
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await context.params;

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

  // Check if product exists and belongs to vendor
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('id, vendor_id, name')
    .eq('id', productId)
    .eq('vendor_id', vendor.id)
    .single();

  if (fetchError || !existingProduct) {
    return NextResponse.json(
      { error: 'Product not found or access denied', code: 'PRODUCT_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Check for pending orders with this product
  const { data: pendingOrders, error: ordersError } = await supabase
    .from('order_items')
    .select('order_id, orders!inner(status)')
    .eq('product_id', productId)
    .in('orders.status', ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_ROUTE']);

  if (ordersError) {
    logEvent({
      level: 'error',
      event: 'vendor.products.delete_check_error',
      message: 'Failed to check pending orders',
      error: ordersError,
      context: { userId: user.id, vendorId: vendor.id, productId },
    });
  }

  if (pendingOrders && pendingOrders.length > 0) {
    return NextResponse.json(
      {
        error: 'Cannot delete product with active orders',
        code: 'ACTIVE_ORDERS_EXIST',
        details: `Product has ${pendingOrders.length} pending orders`,
      },
      { status: 409 }
    );
  }

  // Soft delete: Set is_active to false
  const { error: deleteError } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', productId);

  if (deleteError) {
    logEvent({
      level: 'error',
      event: 'vendor.products.delete_error',
      message: 'Failed to delete product',
      error: deleteError,
      context: { userId: user.id, vendorId: vendor.id, productId },
    });
    return NextResponse.json(
      { error: 'Failed to delete product', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }

  logEvent({
    level: 'info',
    event: 'vendor.products.delete_success',
    message: 'Product deleted successfully',
    context: {
      userId: user.id,
      vendorId: vendor.id,
      productId,
      productName: existingProduct.name,
    },
  });

  return NextResponse.json({
    message: 'Product deleted successfully',
    product_id: productId,
    deleted_at: new Date().toISOString(),
  });
}
