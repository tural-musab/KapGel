import { createClient } from 'lib/supabase/server';
import logger from 'lib/logger';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('Valid endpoint URL required'),
    keys: z.object({
      p256dh: z.string().min(1, 'p256dh key required'),
      auth: z.string().min(1, 'auth key required'),
    }),
  }),
  device_info: z
    .object({
      type: z.enum(['mobile', 'desktop']).optional(),
      os: z.string().optional(),
      browser: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/notifications/subscribe
 * Subscribe user to Web Push notifications
 */
export async function POST(request: Request) {
  const supabase = createClient();

  if (!supabase) {
    logger.error('Supabase client not initialized', {
      endpoint: '/api/notifications/subscribe',
    });
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logger.warn('Unauthorized subscription attempt', {
      endpoint: '/api/notifications/subscribe',
    });
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        error: 'Authentication required',
        details: 'Please log in to subscribe to notifications',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = subscribeSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Invalid subscription data', {
        userId: user.id,
        errors: JSON.stringify(validation.error.issues),
      });
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          error: 'Invalid subscription data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { subscription, device_info } = validation.data;

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('channel', 'webpush')
      .eq('token_or_addr', subscription.endpoint)
      .maybeSingle();

    if (existing) {
      logger.info('Subscription already exists', {
        userId: user.id,
        endpoint: subscription.endpoint,
      });
      return NextResponse.json(
        {
          subscription_id: existing.id,
          user_id: user.id,
          endpoint: subscription.endpoint,
          created_at: new Date().toISOString(),
          message: 'Subscription already exists',
        },
        { status: 200 }
      );
    }

    // Store subscription with keys as JSONB
    const { data: newSubscription, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        channel: 'webpush',
        token_or_addr: subscription.endpoint,
        keys: subscription.keys, // Store p256dh and auth keys
        device_type: device_info?.type,
        device_os: device_info?.os,
        device_browser: device_info?.browser,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to create subscription', {
        userId: user.id,
        error: insertError.message,
      });
      return NextResponse.json(
        {
          code: 'DATABASE_ERROR',
          error: 'Failed to create subscription',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    logger.info('Push notification subscription created', {
      userId: user.id,
      subscriptionId: newSubscription.id,
      deviceType: device_info?.type,
    });

    return NextResponse.json(
      {
        subscription_id: newSubscription.id,
        user_id: user.id,
        endpoint: subscription.endpoint,
        created_at: newSubscription.created_at || new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Unexpected error in subscription', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        error: 'Failed to process subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe user from Web Push notifications
 */
export async function DELETE(request: Request) {
  const supabase = createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        error: 'Authentication required',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          error: 'Endpoint required',
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('channel', 'webpush')
      .eq('token_or_addr', endpoint);

    if (deleteError) {
      logger.error('Failed to delete subscription', {
        userId: user.id,
        error: deleteError.message,
      });
      return NextResponse.json(
        {
          code: 'DATABASE_ERROR',
          error: 'Failed to unsubscribe',
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    logger.info('Push notification unsubscribed', {
      userId: user.id,
      endpoint,
    });

    return NextResponse.json(
      {
        message: 'Unsubscribed successfully',
        endpoint,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Unexpected error in unsubscribe', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        error: 'Failed to process unsubscribe',
      },
      { status: 500 }
    );
  }
}
