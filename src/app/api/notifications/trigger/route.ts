/**
 * POST /api/notifications/trigger
 *
 * Internal API endpoint called by Supabase database triggers to send
 * web push notifications when order status changes.
 *
 * SECURITY: This endpoint is called by Supabase with service role key
 * and should NOT be exposed to public clients.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOrderNotification } from '@/lib/notifications/web-push';
import logger from 'lib/logger';
import { z } from 'zod';

// Validation schema
const triggerSchema = z.object({
  user_id: z.string().uuid('Valid user UUID required'),
  notification_type: z.enum([
    'ORDER_PLACED',
    'ORDER_CONFIRMED',
    'ORDER_PREPARING',
    'ORDER_READY',
    'ORDER_PICKED_UP',
    'ORDER_ON_ROUTE',
    'ORDER_DELIVERED',
    'ORDER_CANCELED',
    'COURIER_ASSIGNED',
  ]),
  order_id: z.string().uuid('Valid order UUID required'),
  order_number: z.string().min(1, 'Order number required'),
});

/**
 * POST /api/notifications/trigger
 * Trigger web push notification for order status change
 */
export async function POST(request: NextRequest) {
  // Verify service role authentication
  const authHeader = request.headers.get('authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authHeader || !serviceRoleKey) {
    logger.warn('Unauthorized notification trigger attempt', {
      hasAuth: !!authHeader,
      hasKey: !!serviceRoleKey,
    });
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        error: 'Service role authentication required',
      },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== serviceRoleKey) {
    logger.warn('Invalid service role key in notification trigger', {
      endpoint: '/api/notifications/trigger',
    });
    return NextResponse.json(
      {
        code: 'FORBIDDEN',
        error: 'Invalid service role key',
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = triggerSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Invalid notification trigger request', {
        errors: JSON.stringify(validation.error.issues),
      });
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { user_id, notification_type, order_id, order_number } = validation.data;

    // Send web push notification
    const result = await sendOrderNotification(
      user_id,
      order_number,
      order_id,
      notification_type
    );

    logger.info('Notification trigger processed', {
      userId: user_id,
      orderId: order_id,
      notificationType: notification_type,
      sent: result.sent,
      total: result.total,
      errors: result.errors.length,
    });

    return NextResponse.json(
      {
        success: true,
        sent: result.sent,
        total: result.total,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Notification trigger failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        error: 'Failed to process notification trigger',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
