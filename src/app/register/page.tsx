import { redirect } from 'next/navigation';

import { RegisterForm } from '@/components/auth/RegisterForm';
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
      <RegisterForm supabaseReady={supabaseReady} />
    </main>
  );
}
