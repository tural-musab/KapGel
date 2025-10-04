import './globals.css';
import type { Metadata } from 'next';

import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: { default: 'Kap-Gel', template: '%s | Kap-Gel' },
  description: 'Kap-Gel — Gönder Gelsin. Kendi kuryesi olan işletmeler ve gel-al için PWA.',
  applicationName: 'Kap-Gel',
  themeColor: '#111827',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-dvh bg-white text-slate-900 antialiased" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
