import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/LoginForm';
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
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 transition hover:text-orange-600">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
            K
          </span>
          KapGel
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
        >
          Ana Sayfa
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <LoginForm supabaseReady={supabaseReady} />
      </main>
    </div>
  );
}
