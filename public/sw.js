/**
 * Service Worker for KapGel PWA
 *
 * Handles:
 * - Web Push notifications
 * - Notification click actions
 * - Offline capabilities (future)
 * - Asset caching (future)
 */

const CACHE_NAME = 'kapgel-v1';
const urlsToCache = [
  '/',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/badge-96.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response for future use
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch((error) => {
          console.error('[SW] Fetch failed:', error);
          // Return offline page here in the future
          throw error;
        });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  if (!event.data) {
    console.warn('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    const { notification } = data;

    if (!notification) {
      console.warn('[SW] Push data missing notification object');
      return;
    }

    const title = notification.title || 'KapGel';
    const options = {
      body: notification.body || '',
      icon: notification.icon || '/icons/icon-192.png',
      badge: notification.badge || '/icons/badge-96.png',
      image: notification.image,
      vibrate: notification.vibrate || [200, 100, 200],
      tag: notification.tag || 'default',
      requireInteraction: notification.requireInteraction || false,
      data: notification.data || {},
      actions: notification.actions || [],
    };

    console.log('[SW] Showing notification:', title, options);

    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('[SW] Notification shown successfully');
        })
        .catch((error) => {
          console.error('[SW] Failed to show notification:', error);
        })
    );
  } catch (error) {
    console.error('[SW] Push event error:', error);
  }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);

  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  // Handle action buttons
  if (event.action) {
    console.log('[SW] Notification action clicked:', event.action);

    // Handle specific actions (accept, reject, view, etc.)
    switch (event.action) {
      case 'view':
        // Default behavior - open the URL
        break;
      case 'accept':
        // Make API call to accept order
        // For now, just open the URL
        break;
      case 'reject':
        // Make API call to reject order
        // For now, just open the URL
        break;
      default:
        console.log('[SW] Unknown action:', event.action);
    }
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            console.log('[SW] Focusing existing window:', url);
            return client.focus();
          }
        }

        // Check if any window is open to the app
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'navigate' in client) {
            console.log('[SW] Navigating existing window to:', url);
            return client.navigate(url).then(client => client.focus());
          }
        }

        // No window open, open a new one
        if (clients.openWindow) {
          console.log('[SW] Opening new window:', url);
          return clients.openWindow(url);
        }
      })
      .catch((error) => {
        console.error('[SW] Notification click handler error:', error);
      })
  );
});

// Notification close event - track dismissals
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);

  // Could send analytics here
  const data = event.notification.data || {};
  console.log('[SW] Dismissed notification data:', data);
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');
