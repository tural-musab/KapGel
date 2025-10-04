import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/LoginForm';
import { extractRoleMetadata, resolveRoleRedirect } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';

export default async function LoginPage() {
  const supabase = createClient();
  const supabaseReady = Boolean(supabase);

  if (supabaseReady) {
    const {
      data: { user },
    } = await supabase!.auth.getUser();

    if (user) {
      const roleMetadata = extractRoleMetadata(user);
      const { target } = resolveRoleRedirect(roleMetadata);
      redirect(target);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
      <LoginForm supabaseReady={supabaseReady} />
    </main>
  );
}
