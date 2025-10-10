import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { LoginForm } from '@/components/auth/LoginForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { extractRoleMetadata, resolveRoleRedirect } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';

async function loadUserSession() {
  const supabase = createClient();
  if (!supabase) {
    return { supabaseReady: false, user: null } as const;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseReady: true, user } as const;
}

export default async function LoginPage() {
  const { supabaseReady, user } = await loadUserSession();

  if (user) {
    const roleMetadata = extractRoleMetadata(user);
    const { target } = resolveRoleRedirect(roleMetadata);
    redirect(target);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 via-white to-red-50">
      <AppHeader
        rightSlot={
          <LinkButton href="/">
            Ana Sayfa
          </LinkButton>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-6 px-6 pb-16">
        <p className="text-sm text-gray-500">
          İşletme sahibi misin?{' '}
          <Link className="font-medium text-orange-600" href="/vendor/apply">
            Başvuru formuna git
          </Link>
        </p>
        <LoginForm supabaseReady={supabaseReady} />
      </main>
    </div>
  );
}

type LinkButtonProps = {
  href: string;
  children: React.ReactNode;
};

function LinkButton({ href, children }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
    >
      {children}
    </Link>
  );
}
