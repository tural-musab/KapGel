'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const LOCALSTORAGE_KEY = 'kapgel-install-dismissed';
const DISMISS_WINDOW_DAYS = 3;

function storeDismissTimestamp() {
  try {
    const payload = {
      dismissedAt: Date.now(),
    };
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Install prompt dismiss storage failed', error);
  }
}

function wasRecentlyDismissed() {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw) as { dismissedAt: number };
    return Date.now() - payload.dismissedAt < DISMISS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  } catch (error) {
    console.warn('Install prompt dismiss read failed', error);
    return false;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (wasRecentlyDismissed()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsPrompting(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.info('[PWA] install accepted');
      } else {
        console.info('[PWA] install dismissed');
        storeDismissTimestamp();
      }
      setVisible(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.warn('[PWA] install prompt failed', error);
    } finally {
      setIsPrompting(false);
    }
  };

  const handleDismiss = () => {
    storeDismissTimestamp();
    setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-lg items-center gap-4 rounded-2xl border border-orange-200 bg-white p-4 shadow-lg">
        <div>
          <p className="text-sm font-semibold text-gray-900">KapGel'i ana ekranına ekle</p>
          <p className="text-xs text-gray-600">Daha hızlı erişim için uygulamamızı ana ekranına kaydedebilirsin.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
          >
            Daha Sonra
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={isPrompting}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
          >
            {isPrompting ? 'Yükleniyor…' : 'Yükle'}
          </button>
        </div>
      </div>
    </div>
  );
}
