/**
 * Web Push Notification Service
 *
 * Sends Web Push notifications using VAPID protocol.
 * Handles subscription management, expired subscriptions, and error recovery.
 *
 * @module lib/notifications/web-push
 */

import webpush from 'web-push';
import { createClient } from 'lib/supabase/server';
import logger from 'lib/logger';

// Initialize VAPID configuration
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@kapgel.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
} else {
  logger.warn('VAPID keys not configured - Web Push disabled', {
    hasPublic: !!vapidPublicKey,
    hasPrivate: !!vapidPrivateKey,
  });
}

/**
 * Notification payload structure
 */
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  requireInteraction?: boolean;
}

/**
 * Order notification types mapped to user-friendly messages
 */
const ORDER_NOTIFICATION_MESSAGES = {
  ORDER_PLACED: {
    title: 'Yeni Sipariş',
    bodyTemplate: (orderNumber: string) => `${orderNumber} numaralı yeni sipariş geldi`,
    icon: '/icons/icon-192.png',
    requireInteraction: true as boolean | undefined,
  },
  ORDER_CONFIRMED: {
    title: 'Sipariş Onaylandı',
    bodyTemplate: (orderNumber: string) => `${orderNumber} numaralı siparişiniz onaylandı`,
    icon: '/icons/icon-192.png',
    requireInteraction: false as boolean | undefined,
  },
  ORDER_PREPARING: {
    title: 'Sipariş Hazırlanıyor',
    bodyTemplate: (orderNumber: string) => `${orderNumber} numaralı siparişiniz hazırlanıyor`,
    icon: '/icons/icon-192.png',
    requireInteraction: false as boolean | undefined,
  },
  ORDER_READY: {
    title: 'Sipariş Hazır',
    bodyTemplate: (orderNumber: string) => `${orderNumber} numaralı siparişiniz teslime hazır`,
    icon: '/icons/icon-192.png',
    requireInteraction: true as boolean | undefined,
  },
  ORDER_PICKED_UP: {
    title: 'Sipariş Alındı',
    bodyTemplate: (orderNumber: string) => `Kurye ${orderNumber} numaralı siparişi aldı`,
    icon: '/icons/icon-192.png',
    requireInteraction: false as boolean | undefined,
  },
  ORDER_ON_ROUTE: {
    title: 'Sipariş Yolda',
    bodyTemplate: (orderNumber: string) => `${orderNumber} numaralı siparişiniz yolda`,
    icon: '/icons/icon-192.png',
    requireInteraction: true as boolean | undefined,
  },
  ORDER_DELIVERED: {
    title: 'Sipariş Teslim Edildi',
    bodyTemplate: (orderNumber: string) => `${orderNumber} numaralı siparişiniz teslim edildi`,
    icon: '/icons/icon-192.png',
    requireInteraction: true as boolean | undefined,
  },
  ORDER_CANCELED: {
    title: 'Sipariş İptal Edildi',
    bodyTemplate: (orderNumber: string) => `${orderNumber} numaralı sipariş iptal edildi`,
    icon: '/icons/icon-192.png',
    requireInteraction: true as boolean | undefined,
  },
  COURIER_ASSIGNED: {
    title: 'Kurye Atandı',
    bodyTemplate: (orderNumber: string) => `${orderNumber} için size yeni bir teslimat atandı`,
    icon: '/icons/icon-192.png',
    requireInteraction: true as boolean | undefined,
  },
};

/**
 * Send Web Push notification to user
 *
 * @param userId - User ID to send notification to
 * @param notification - Notification payload
 * @returns Result containing sent count and total subscriptions
 */
export async function sendWebPushNotification(
  userId: string,
  notification: NotificationPayload
): Promise<{ sent: number; total: number; errors: string[] }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn('Web Push attempted without VAPID configuration', { userId });
    return { sent: 0, total: 0, errors: ['VAPID not configured'] };
  }

  const supabase = createClient();
  if (!supabase) {
    logger.error('Supabase client not available for web push', { userId });
    return { sent: 0, total: 0, errors: ['Supabase unavailable'] };
  }

  // Get user's active push subscriptions
  const { data: subscriptions, error: fetchError } = await supabase
    .from('notifications')
    .select('id, token_or_addr, keys, channel')
    .eq('user_id', userId)
    .eq('channel', 'webpush')
    .eq('is_active', true);

  if (fetchError) {
    logger.error('Failed to fetch push subscriptions', {
      userId,
      error: fetchError.message,
    });
    return { sent: 0, total: 0, errors: [fetchError.message] };
  }

  if (!subscriptions || subscriptions.length === 0) {
    logger.info('No active push subscriptions for user', { userId });
    return { sent: 0, total: 0, errors: [] };
  }

  // Prepare notification payload
  const payload = JSON.stringify({
    notification: {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192.png',
      badge: notification.badge || '/icons/badge-96.png',
      image: notification.image,
      tag: notification.tag,
      data: notification.data,
      actions: notification.actions,
      requireInteraction: notification.requireInteraction ?? false,
    },
  });

  // Send to all subscriptions
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        // Validate subscription has required keys
        if (!sub.keys || typeof sub.keys !== 'object') {
          logger.warn('Push subscription missing keys', {
            userId,
            subscriptionId: sub.id,
          });
          return { success: false, subscriptionId: sub.id, error: 'Missing keys' };
        }

        const keys = sub.keys as { p256dh?: string; auth?: string };
        if (!keys.p256dh || !keys.auth) {
          logger.warn('Push subscription has invalid keys', {
            userId,
            subscriptionId: sub.id,
          });
          return { success: false, subscriptionId: sub.id, error: 'Invalid keys' };
        }

        const subscription = {
          endpoint: sub.token_or_addr,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        };

        await webpush.sendNotification(subscription, payload);

        logger.info('Web push sent successfully', {
          userId,
          subscriptionId: sub.id,
          endpoint: sub.token_or_addr.substring(0, 50) + '...',
        });

        return { success: true, subscriptionId: sub.id };
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };

        // Handle expired subscriptions (410 Gone)
        if (err.statusCode === 410) {
          logger.warn('Push subscription expired, deactivating', {
            userId,
            subscriptionId: sub.id,
          });

          await supabase
            .from('notifications')
            .update({ is_active: false })
            .eq('id', sub.id);

          return { success: false, subscriptionId: sub.id, error: 'Expired' };
        }

        logger.error('Failed to send web push', {
          userId,
          subscriptionId: sub.id,
          error: err.message || 'Unknown error',
          statusCode: err.statusCode,
        });

        return { success: false, subscriptionId: sub.id, error: err.message || 'Unknown' };
      }
    })
  );

  // Calculate results
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const errors = results
    .filter((r) => r.status === 'fulfilled' && !r.value.success)
    .map((r) => (r.status === 'fulfilled' ? r.value.error : 'Unknown') || 'Unknown');

  logger.info('Web push batch complete', {
    userId,
    sent,
    total: subscriptions.length,
    errors: errors.length,
  });

  return { sent, total: subscriptions.length, errors };
}

/**
 * Send order status notification
 *
 * @param userId - User to notify
 * @param orderNumber - Order number for display
 * @param orderId - Order UUID for deep linking
 * @param notificationType - Type of notification
 */
export async function sendOrderNotification(
  userId: string,
  orderNumber: string,
  orderId: string,
  notificationType: keyof typeof ORDER_NOTIFICATION_MESSAGES
): Promise<{ sent: number; total: number; errors: string[] }> {
  const template = ORDER_NOTIFICATION_MESSAGES[notificationType];

  if (!template) {
    logger.error('Unknown notification type', { notificationType, userId });
    return { sent: 0, total: 0, errors: ['Unknown notification type'] };
  }

  const payload: NotificationPayload = {
    title: template.title,
    body: template.bodyTemplate(orderNumber),
    icon: template.icon,
    badge: '/icons/badge-96.png',
    tag: `order-${orderId}`,
    data: {
      type: notificationType,
      order_id: orderId,
      order_number: orderNumber,
      url: `/orders/${orderId}`,
    },
    requireInteraction: template.requireInteraction ?? false,
  };

  return sendWebPushNotification(userId, payload);
}
