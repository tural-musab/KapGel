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
        className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 transition hover:text-orange-600"
      >
        <Image
          src="/icons/icon-32x32.png"
          alt="KapGel"
          width={32}
          height={32}
          className="h-10 w-10 rounded-lg"
          priority
        />
        KapGel
      </Link>

      {rightSlot ? (
        <div className="flex items-center gap-3">{rightSlot}</div>
      ) : null}
    </header>
  );
}
