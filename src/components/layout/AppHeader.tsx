'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

type AppHeaderProps = {
  brandHref?: string;
  rightSlot?: ReactNode;
  className?: string;
};

/**
 * Shared application header with KapGel branding.
 * Designed for lightweight pages (auth, vendor apply, etc.).
 */
export function AppHeader({ brandHref = '/', rightSlot, className }: AppHeaderProps) {
  return (
    <header className={`flex items-center justify-between px-6 py-4 ${className ?? ''}`}>
      <Link
        href={brandHref}
        className="inline-flex items-center transition hover:opacity-90"
      >
        <Image
          src="/icons/icon-192x192.png"
          alt="KapGel"
          width={48}
          height={48}
          className="h-12 w-12 rounded-xl"
          priority
        />
      </Link>

      {rightSlot ? (
        <div className="flex items-center gap-3">{rightSlot}</div>
      ) : null}
    </header>
  );
}
