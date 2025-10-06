/**
 * Vendor Dashboard Stats API
 * 
 * Provides vendor dashboard statistics including orders, revenue, and performance metrics
 * 
 * @see specs/001-kapsam-roller-m/contracts/vendor-api.md
 */

import { createClient } from 'lib/supabase/server';
import { logEvent } from 'lib/logging';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/vendor/dashboard/stats
 * 
 * Returns dashboard statistics for vendor admin
 * 
 * Query params:
 * - branch_id (optional): Filter by specific branch
 * - period: 'today', 'week', 'month' (default: 'today')
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

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const branchId = searchParams.get('branch_id');
  const period = searchParams.get('period') || 'today';

  // Validate period
  if (!['today', 'week', 'month'].includes(period)) {
    return NextResponse.json(
      { error: 'Invalid period. Must be: today, week, or month', code: 'INVALID_PERIOD' },
      { status: 400 }
    );
  }

  // Get vendor for authenticated user
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('owner_user_id', user.id)
    .single();

  if (vendorError || !vendor) {
    logEvent({
      level: 'error',
      event: 'vendor.dashboard.vendor_not_found',
      message: 'Vendor not found for user',
      error: vendorError,
      context: { userId: user.id },
    });
    return NextResponse.json(
      { error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }

  try {
    // Get branches for vendor
    let branchesQuery = supabase
      .from('branches')
      .select('id')
      .eq('vendor_id', vendor.id);

    if (branchId) {
      branchesQuery = branchesQuery.eq('id', branchId);
    }

    const { data: branches } = await branchesQuery;
    const branchIds = (branches || []).map((b) => b.id);

    if (branchIds.length === 0) {
      return NextResponse.json({
        period,
        stats: {
          total_orders: 0,
          active_orders: 0,
          completed_orders: 0,
          canceled_orders: 0,
          revenue: 0,
          average_order_value: 0,
          average_preparation_time: 0,
        },
        status_breakdown: {},
        hourly_orders: [],
        top_products: [],
      });
    }

    // Get orders within date range
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total, items_total, created_at')
      .in('branch_id', branchIds)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    const orderList = orders || [];

    // Calculate statistics
    const totalOrders = orderList.length;
    const activeStatuses = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_ROUTE'];
    const activeOrders = orderList.filter((o) => activeStatuses.includes(o.status || '')).length;
    const completedOrders = orderList.filter((o) => o.status === 'DELIVERED').length;
    const canceledStatuses = ['REJECTED', 'CANCELED_BY_USER', 'CANCELED_BY_VENDOR'];
    const canceledOrders = orderList.filter((o) => canceledStatuses.includes(o.status || '')).length;

    // Calculate revenue (only delivered orders)
    const deliveredOrders = orderList.filter((o) => o.status === 'DELIVERED');
    const revenue = deliveredOrders.reduce((sum, o) => sum + (parseFloat(String(o.total)) || 0), 0);
    const averageOrderValue = deliveredOrders.length > 0 ? revenue / deliveredOrders.length : 0;

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    orderList.forEach((order) => {
      const status = order.status || 'NEW';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    // Hourly orders (for today only)
    const hourlyOrders: { hour: string; count: number }[] = [];
    if (period === 'today') {
      const hourCounts: Record<string, number> = {};
      
      orderList.forEach((order) => {
        if (order.created_at) {
          const date = new Date(order.created_at);
          const hour = date.getHours();
          const hourKey = `${hour.toString().padStart(2, '0')}:00`;
          hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
        }
      });

      // Convert to array and sort
      Object.entries(hourCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([hour, count]) => {
          hourlyOrders.push({ hour, count });
        });
    }

    // Top products
    const { data: topProductsData } = await supabase
      .from('order_items')
      .select('product_id, name_snapshot, unit_price, qty, order_id')
      .in(
        'order_id',
        orderList.filter((o) => o.status === 'DELIVERED').map((o) => o.id)
      );

    const productStats: Record<
      string,
      { name: string; orders_count: number; revenue: number }
    > = {};

    (topProductsData || []).forEach((item) => {
      const productId = item.product_id || 'unknown';
      const name = item.name_snapshot || 'Unknown Product';
      const unitPrice = parseFloat(String(item.unit_price)) || 0;
      const qty = item.qty || 0;
      const itemRevenue = unitPrice * qty;

      if (!productStats[productId]) {
        productStats[productId] = {
          name,
          orders_count: 0,
          revenue: 0,
        };
      }

      productStats[productId].orders_count += 1;
      productStats[productId].revenue += itemRevenue;
    });

    const topProducts = Object.entries(productStats)
      .map(([product_id, stats]) => ({
        product_id,
        name: stats.name,
        orders_count: stats.orders_count,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Response
    const response = {
      period,
      stats: {
        total_orders: totalOrders,
        active_orders: activeOrders,
        completed_orders: completedOrders,
        canceled_orders: canceledOrders,
        revenue: Math.round(revenue * 100) / 100,
        average_order_value: Math.round(averageOrderValue * 100) / 100,
        average_preparation_time: 0, // TODO: Implement preparation time tracking
      },
      status_breakdown: statusBreakdown,
      hourly_orders: hourlyOrders,
      top_products: topProducts,
    };

    logEvent({
      level: 'info',
      event: 'vendor.dashboard.stats_fetched',
      message: 'Dashboard stats fetched successfully',
      context: {
        userId: user.id,
        vendorId: vendor.id,
        period,
        branchId,
        totalOrders,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    logEvent({
      level: 'error',
      event: 'vendor.dashboard.stats_error',
      message: 'Error fetching dashboard stats',
      error,
      context: {
        userId: user.id,
        vendorId: vendor.id,
        period,
      },
    });

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
