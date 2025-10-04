import { redirect } from 'next/navigation';

import type { SupabaseClient, User } from '@supabase/supabase-js';

import { createClient } from 'lib/supabase/server';

import { extractRoleMetadata, resolveRoleRedirect } from './roles';
import type { PrimaryRole } from './roles';

type RequireRoleResult = {
  supabase: SupabaseClient;
  user: User;
  role: PrimaryRole;
};

export async function requireRole(allowedRoles: PrimaryRole[], fallback?: string): Promise<RequireRoleResult> {
  const supabase = createClient();

  if (!supabase) {
    redirect('/login');
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/login');
  }

  const roleMetadata = extractRoleMetadata(data.user);
  const { needsOnboarding, target, role } = resolveRoleRedirect(roleMetadata);

  if (needsOnboarding) {
    redirect(target);
  }

  if (!role || !allowedRoles.includes(role)) {
    redirect(fallback ?? target ?? '/');
  }

  return { supabase, user: data.user, role };
}
