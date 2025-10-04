import type { User } from '@supabase/supabase-js';

export type PrimaryRole = 'customer' | 'vendor_admin' | 'courier' | 'admin';
export type PendingRole = 'pending' | 'vendor_admin_pending' | 'courier_pending';
export type AppRoleMetadata = PrimaryRole | PendingRole | null | undefined;

type RoleResolution = {
  needsOnboarding: boolean;
  target: string;
  role?: PrimaryRole;
};

const ROLE_TARGETS: Record<PrimaryRole, string> = {
  customer: '/',
  vendor_admin: '/vendor',
  courier: '/courier',
  admin: '/admin',
};

const PENDING_STATES: PendingRole[] = ['pending', 'vendor_admin_pending', 'courier_pending'];

export function extractRoleMetadata(user: User | null | undefined): AppRoleMetadata {
  const candidate = (user?.user_metadata?.role ?? user?.app_metadata?.role) as AppRoleMetadata;
  if (typeof candidate === 'string') {
    return candidate;
  }
  return null;
}

export function resolveRoleRedirect(role: AppRoleMetadata): RoleResolution {
  if (!role || (PENDING_STATES as string[]).includes(role)) {
    return {
      needsOnboarding: true,
      target: '/onboarding/role',
    };
  }

  const primaryRole = role as PrimaryRole;
  const target = ROLE_TARGETS[primaryRole] ?? '/';

  return {
    needsOnboarding: false,
    target,
    role: primaryRole,
  };
}

export function normalizeSelection(role: string): PrimaryRole | null {
  if (role === 'customer' || role === 'vendor_admin' || role === 'courier' || role === 'admin') {
    return role;
  }
  return null;
}

export function toPendingMetadata(role: PrimaryRole): AppRoleMetadata {
  if (role === 'customer') {
    return 'customer';
  }
  if (role === 'vendor_admin') {
    return 'vendor_admin_pending';
  }
  if (role === 'courier') {
    return 'courier_pending';
  }
  return role;
}
