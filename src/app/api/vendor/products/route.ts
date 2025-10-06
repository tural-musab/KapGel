/**
 * Vendor Products API
 * 
 * Handles product/menu management for vendors
 * 
 * @see specs/001-kapsam-roller-m/contracts/vendor-api.md
 */

import { createClient } from 'lib/supabase/server';
import { logEvent } from 'lib/logging';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Product schema for creation
 */
const createProductSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  name: z
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .max(100, 'Product name must be at most 100 characters'),
  price: z
    .number()
    .positive('Price must be greater than 0')
    .refine((val) => {
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    }, 'Price must have at most 2 decimal places'),
  photo_url: z.string().url('Invalid image URL').optional(),
  is_active: z.boolean().optional().default(true),
});

type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * GET /api/vendor/products
 * 
 * Lists products for vendor with optional filters
 */
export async function GET(request: NextRequest) {
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
    logEvent({
      level: 'error',
      event: 'vendor.products.vendor_not_found',
      message: 'Vendor not found for user',
      error: vendorError,
      context: { userId: user.id },
    });
    return NextResponse.json(
      { error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get('category_id');
  const search = searchParams.get('search');
  const isActive = searchParams.get('is_active');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  // Build query
  let query = supabase
    .from('products')
    .select('id, vendor_id, category_id, name, price, currency, is_active, photo_url', { count: 'exact' })
    .eq('vendor_id', vendor.id);

  // Apply filters
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (isActive !== null && isActive !== undefined) {
    query = query.eq('is_active', isActive === 'true');
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('name', { ascending: true });

  const { data: products, error, count } = await query;

  if (error) {
    logEvent({
      level: 'error',
      event: 'vendor.products.list_error',
      message: 'Failed to fetch products',
      error,
      context: { userId: user.id, vendorId: vendor.id },
    });
    return NextResponse.json(
      { error: 'Failed to fetch products', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  logEvent({
    level: 'info',
    event: 'vendor.products.list_success',
    message: 'Products fetched successfully',
    context: {
      userId: user.id,
      vendorId: vendor.id,
      count: products?.length || 0,
      filters: { categoryId, search, isActive },
    },
  });

  return NextResponse.json({
    products: products || [],
    pagination: {
      page,
      limit,
      total_pages: totalPages,
      total_count: totalCount,
    },
  });
}

/**
 * POST /api/vendor/products
 * 
 * Creates a new product
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
  let body: CreateProductInput;
  try {
    const rawBody = await request.json();
    const parseResult = createProductSchema.safeParse(rawBody);

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

  // Check if category belongs to vendor
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, vendor_id')
    .eq('id', body.category_id)
    .eq('vendor_id', vendor.id)
    .single();

  if (categoryError || !category) {
    return NextResponse.json(
      {
        error: 'Category not found or does not belong to vendor',
        code: 'INVALID_CATEGORY',
      },
      { status: 400 }
    );
  }

  // Check if product name already exists for this vendor
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('vendor_id', vendor.id)
    .eq('name', body.name)
    .single();

  if (existingProduct) {
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

  // Create product
  const { data: newProduct, error: createError } = await supabase
    .from('products')
    .insert({
      vendor_id: vendor.id,
      category_id: body.category_id,
      name: body.name,
      price: body.price,
      photo_url: body.photo_url || null,
      is_active: body.is_active,
      currency: 'TRY',
    })
    .select('id, vendor_id, category_id, name, price, currency, is_active, photo_url')
    .single();

  if (createError || !newProduct) {
    logEvent({
      level: 'error',
      event: 'vendor.products.create_error',
      message: 'Failed to create product',
      error: createError,
      context: { userId: user.id, vendorId: vendor.id, productName: body.name },
    });
    return NextResponse.json(
      { error: 'Failed to create product', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }

  logEvent({
    level: 'info',
    event: 'vendor.products.create_success',
    message: 'Product created successfully',
    context: {
      userId: user.id,
      vendorId: vendor.id,
      productId: newProduct.id,
      productName: body.name,
    },
  });

  return NextResponse.json(newProduct, { status: 201 });
}
