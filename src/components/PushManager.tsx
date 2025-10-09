'use client';

import { useEffect, useState } from 'react';

interface PushManagerProps {
  /**
   * User ID for subscription tracking
   */
  userId?: string;
  /**
   * Auto-prompt for permission (default: false)
   */
  autoPrompt?: boolean;
  /**
   * Show UI controls (default: true)
   */
  showUI?: boolean;
  /**
   * Callback when subscription changes
   */
  onSubscriptionChange?: (subscribed: boolean) => void;
  /**
   * CSS classes for the container
   */
  className?: string;
}

/**
 * PushManager Component
 *
 * Manages Web Push notification subscriptions with VAPID authentication.
 * Handles permission requests, service worker registration, and subscription lifecycle.
 *
 * Features:
 * - Auto-detects existing subscriptions
 * - iOS Safari education modal
 * - Permission state management
 * - Service worker integration
 * - Error handling and fallbacks
 *
 * @example
 * ```tsx
 * <PushManager
 *   userId={user.id}
 *   autoPrompt={true}
 *   onSubscriptionChange={(subscribed) => console.log('Subscribed:', subscribed)}
 * />
 * ```
 */
export default function PushManager({
  userId,
  autoPrompt = false,
  showUI = true,
  onSubscriptionChange,
  className = '',
}: PushManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Check if Push API is supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }

      // Detect iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      if (isIOS && isSafari && autoPrompt) {
        setShowIOSModal(true);
      }
    };

    checkSupport();
  }, [autoPrompt]);

  // Check existing subscription
  useEffect(() => {
    if (!isSupported || !userId) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setIsSubscribed(!!subscription);
        onSubscriptionChange?.(!!subscription);
      } catch (err) {
        console.error('Failed to check subscription:', err);
      }
    };

    checkSubscription();
  }, [isSupported, userId, onSubscriptionChange]);

  // Auto-prompt for permission
  useEffect(() => {
    if (
      autoPrompt &&
      isSupported &&
      permission === 'default' &&
      !isSubscribed &&
      !showIOSModal
    ) {
      handleSubscribe();
    }
  }, [autoPrompt, isSupported, permission, isSubscribed, showIOSModal]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async () => {
    if (!isSupported) {
      setError('Bu tarayıcı bildirim desteği sunmuyor');
      return;
    }

    if (!userId) {
      setError('Bildirimler için oturum açmanız gerekiyor');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Bildirim izni reddedildi');
        setIsLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        setError('VAPID key yapılandırılmamış');
        setIsLoading(false);
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Detect device info
      const deviceInfo = {
        type: /Mobile|Android|iPhone/i.test(navigator.userAgent)
          ? ('mobile' as const)
          : ('desktop' as const),
        os: navigator.platform || 'Unknown',
        browser: (() => {
          if (/Chrome/.test(navigator.userAgent)) return 'Chrome';
          if (/Firefox/.test(navigator.userAgent)) return 'Firefox';
          if (/Safari/.test(navigator.userAgent)) return 'Safari';
          return 'Unknown';
        })(),
      };

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          device_info: deviceInfo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Abonelik oluşturulamadı');
      }

      setIsSubscribed(true);
      onSubscriptionChange?.(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Subscription failed:', err);
      setError(
        err instanceof Error ? err.message : 'Bildirim aboneliği oluşturulamadı'
      );
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!isSupported || !userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
      }

      setIsSubscribed(false);
      onSubscriptionChange?.(false);
      setIsLoading(false);
    } catch (err) {
      console.error('Unsubscribe failed:', err);
      setError('Abonelik iptal edilemedi');
      setIsLoading(false);
    }
  };

  if (!showUI) {
    return null;
  }

  if (!isSupported) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}>
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-amber-600 mt-0.5 mr-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Bildirimler Desteklenmiyor
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              Tarayıcınız web push bildirimlerini desteklemiyor. Lütfen güncel bir tarayıcı
              kullanın.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari education modal
  if (showIOSModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-3">iOS Bildirim İzni</h3>
          <p className="text-sm text-gray-600 mb-4">
            Safari'de bildirimleri etkinleştirmek için:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-6">
            <li>Ayarlar → Safari → Gelişmiş menüsüne gidin</li>
            <li>"Deneysel Özellikler" bölümünü bulun</li>
            <li>"Notifications API" seçeneğini etkinleştirin</li>
            <li>Safari'yi yeniden başlatın</li>
          </ol>
          <button
            onClick={() => setShowIOSModal(false)}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
          >
            Anladım
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium flex items-center">
            <svg
              className="h-5 w-5 mr-2 text-orange-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            Bildirimler
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {isSubscribed
              ? 'Sipariş güncellemelerini alıyorsunuz'
              : 'Sipariş güncellemelerini kaçırmayın'}
          </p>
        </div>

        {permission === 'denied' ? (
          <div className="text-sm text-red-600">
            İzin reddedildi. Tarayıcı ayarlarından etkinleştirin.
          </div>
        ) : (
          <button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isSubscribed
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                İşleniyor...
              </div>
            ) : isSubscribed ? (
              'İptal Et'
            ) : (
              'Etkinleştir'
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600 flex items-start">
          <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
