import { redirect } from 'next/navigation';

import { RoleOnboardingClient } from '@/components/auth/RoleOnboardingClient';
import { extractRoleMetadata, resolveRoleRedirect } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';

export default async function RoleOnboardingPage() {
  const supabase = createClient();

  if (!supabase) {
    redirect('/');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const roleMetadata = extractRoleMetadata(user);
  const { needsOnboarding, target } = resolveRoleRedirect(roleMetadata);

  if (!needsOnboarding) {
    redirect(target);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
      <RoleOnboardingClient email={user.email ?? ''} />
    </main>
  );
}
