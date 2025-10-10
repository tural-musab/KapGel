import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { RegisterForm } from '@/components/auth/RegisterForm';
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

export default async function RegisterPage() {
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

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <RegisterForm supabaseReady={supabaseReady} />
      </main>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
    >
      {children}
    </Link>
  );
}
