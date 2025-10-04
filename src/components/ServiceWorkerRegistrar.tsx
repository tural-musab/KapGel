'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    register();
  }, []);

  return null;
}
