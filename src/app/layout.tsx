import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Kapgel", template: "%s | Kapgel" },
  description: "Kapgel — Gönder Gelsin. Kendi kuryesi olan işletmeler ve gel-al için PWA.",
  applicationName: "Kapgel",
  themeColor: "#111827",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-dvh bg-white text-slate-900 antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => console.error("Service worker registration failed:", error));
  });
}`,
          }}
        />
      </body>
    </html>
  );
}
