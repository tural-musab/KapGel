'use server';

import { revalidatePath } from 'next/cache';

import type { SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';

import { createAdminClient } from 'lib/supabase/admin';
import { createClient } from 'lib/supabase/server';

export type AdminActionResult = {
  ok: true;
  message?: string;
};

export type AdminActionError = {
  ok: false;
  message: string;
};

const MANAGED_ROLES = new Set([
  'pending',
  'customer',
  'vendor_admin_pending',
  'vendor_admin',
  'courier_pending',
  'courier',
  'admin',
]);

type RoleState =
  | 'pending'
  | 'customer'
  | 'vendor_admin_pending'
  | 'vendor_admin'
  | 'courier_pending'
  | 'courier'
  | 'admin';

type ApplicationKind = 'vendor' | 'courier';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

class AuthorizationError extends Error {}
class ConfigurationError extends Error {}

async function ensureAdminSession() {
  const supabase = createClient();
  if (!supabase) {
    throw new ConfigurationError('Supabase yapılandırması eksik.');
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new AuthorizationError('Oturum bulunamadı.');
  }

  const metadataRole = (data.user.user_metadata?.role ?? data.user.app_metadata?.role ?? null) as
    | string
    | null;

  if (metadataRole !== 'admin') {
    throw new AuthorizationError('Bu işlem için yetkiniz yok.');
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    throw new ConfigurationError('Supabase service role anahtarı yapılandırılmamış.');
  }

  return { adminClient };
}

async function upsertApplication(
  adminClient: SupabaseClient,
  kind: ApplicationKind,
  userId: string,
  status: ApplicationStatus,
) {
  const table = kind === 'vendor' ? 'vendor_applications' : 'courier_applications';
  await adminClient
    .from(table)
    .upsert(
      {
        user_id: userId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
}

async function updateApplicationStatus(
  adminClient: SupabaseClient,
  kind: ApplicationKind,
  userId: string,
  status: ApplicationStatus,
) {
  const table = kind === 'vendor' ? 'vendor_applications' : 'courier_applications';
  await adminClient
    .from(table)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

async function syncRoleWithApplications(
  adminClient: SupabaseClient,
  userId: string,
  role: RoleState,
) {
  if (role === 'vendor_admin') {
    await upsertApplication(adminClient, 'vendor', userId, 'approved');
  } else if (role === 'vendor_admin_pending') {
    await upsertApplication(adminClient, 'vendor', userId, 'pending');
  } else {
    await updateApplicationStatus(adminClient, 'vendor', userId, 'rejected');
  }

  if (role === 'courier') {
    await upsertApplication(adminClient, 'courier', userId, 'approved');
  } else if (role === 'courier_pending') {
    await upsertApplication(adminClient, 'courier', userId, 'pending');
  } else {
    await updateApplicationStatus(adminClient, 'courier', userId, 'rejected');
  }
}

async function ensureVendorProfile(
  adminClient: SupabaseClient,
  userId: string,
  user: SupabaseAuthUser | null,
) {
  const { data: existingVendors, error: vendorLookupError } = await adminClient
    .from('vendors')
    .select('id')
    .eq('owner_user_id', userId)
    .limit(1);

  if (vendorLookupError) {
    throw new Error(vendorLookupError.message ?? 'Vendor bilgisi alınamadı.');
  }

  const existingVendorId = existingVendors?.[0]?.id ?? null;

  if (existingVendorId) {
    return existingVendorId;
  }

  const { data: applicationRows, error: applicationLookupError } = await adminClient
    .from('vendor_applications')
    .select('business_name')
    .eq('user_id', userId)
    .limit(1);

  if (applicationLookupError) {
    throw new Error(applicationLookupError.message ?? 'Başvuru bilgisi alınamadı.');
  }

  const businessName = applicationRows?.[0]?.business_name?.trim();
  const fallbackFromEmail = user?.email ? user.email.split('@')[0] ?? null : null;
  const defaultName = fallbackFromEmail && fallbackFromEmail.length > 0 ? fallbackFromEmail : `Vendor ${userId.slice(0, 8)}`;
  const insertName = businessName && businessName.length > 1 ? businessName : defaultName;

  const { data: insertedVendors, error: insertError } = await adminClient
    .from('vendors')
    .insert({
      owner_user_id: userId,
      name: insertName,
      verified: false,
    })
    .select('id')
    .limit(1);

  if (insertError) {
    throw new Error(insertError.message ?? 'Vendor kaydı oluşturulamadı.');
  }

  const vendorId = insertedVendors?.[0]?.id ?? null;

  if (!vendorId) {
    throw new Error('Vendor kaydı oluşturulamadı.');
  }

  return vendorId;
}

async function updateRoleRecords(adminClient: SupabaseClient, userId: string, role: RoleState) {
  const { data: existingUser, error: fetchError } = await adminClient.auth.admin.getUserById(userId);
  if (fetchError) {
    throw new Error(fetchError.message ?? 'Kullanıcı bilgisi alınamadı.');
  }

  const currentUser = existingUser?.user;
  if (!currentUser) {
    throw new Error('Kullanıcı bulunamadı.');
  }

  const mergedUserMetadata = {
    ...(currentUser.user_metadata ?? {}),
    role,
  };

  const mergedAppMetadata = {
    ...(currentUser.app_metadata ?? {}),
    role,
  };

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: mergedUserMetadata,
    app_metadata: mergedAppMetadata,
  });

  if (authUpdateError) {
    throw new Error(authUpdateError.message ?? 'Auth bilgisi güncellenemedi.');
  }

  const { error: userUpdateError } = await adminClient
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (userUpdateError) {
    throw new Error(userUpdateError.message ?? 'Kullanıcı rolü güncellenemedi.');
  }

  return currentUser;
}

async function handleRoleChange(userId: string, nextRole: string): Promise<AdminActionResult | AdminActionError> {
  if (!MANAGED_ROLES.has(nextRole)) {
    return { ok: false, message: 'Desteklenmeyen rol seçimi.' };
  }

  try {
    const { adminClient } = await ensureAdminSession();
    const role = nextRole as RoleState;

    const currentUser = await updateRoleRecords(adminClient, userId, role);
    await syncRoleWithApplications(adminClient, userId, role);
    if (role === 'vendor_admin') {
      await ensureVendorProfile(adminClient, userId, currentUser);
    }

    revalidatePath('/admin');
    return { ok: true, message: 'Rol güncellendi.' };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: error.message };
    }
    if (error instanceof ConfigurationError) {
      return { ok: false, message: error.message };
    }

    console.error('handleRoleChange error', error);
    return { ok: false, message: 'Rol güncellenemedi. Lütfen tekrar deneyin.' };
  }
}

function getId(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string' || !value) {
    return null;
  }
  return value;
}

function getRole(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return null;
  }
  return value;
}

export async function approveVendorApplication(
  formData: FormData,
): Promise<AdminActionResult | AdminActionError> {
  const applicationId = getId(formData, 'applicationId');
  const userId = getId(formData, 'userId');

  if (!applicationId || !userId) {
    return { ok: false, message: 'Başvuru bilgisi eksik.' };
  }

  try {
    const { adminClient } = await ensureAdminSession();

    const now = new Date().toISOString();

    const { error: applicationUpdateError } = await adminClient
      .from('vendor_applications')
      .update({ status: 'approved', updated_at: now })
      .eq('id', applicationId);

    if (applicationUpdateError) {
      throw new Error(applicationUpdateError.message ?? 'Başvuru güncellenemedi.');
    }

    const currentUser = await updateRoleRecords(adminClient, userId, 'vendor_admin');
    await syncRoleWithApplications(adminClient, userId, 'vendor_admin');
    await ensureVendorProfile(adminClient, userId, currentUser);

    revalidatePath('/admin');
    return { ok: true, message: 'İşletme başvurusu onaylandı.' };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ConfigurationError) {
      return { ok: false, message: error.message };
    }

    console.error('approveVendorApplication error', error);
    return { ok: false, message: 'Başvuru onaylanamadı. Lütfen tekrar deneyin.' };
  }
}

export async function rejectVendorApplication(
  formData: FormData,
): Promise<AdminActionResult | AdminActionError> {
  const applicationId = getId(formData, 'applicationId');
  const userId = getId(formData, 'userId');

  if (!applicationId || !userId) {
    return { ok: false, message: 'Başvuru bilgisi eksik.' };
  }

  try {
    const { adminClient } = await ensureAdminSession();

    const now = new Date().toISOString();

    const { error: applicationUpdateError } = await adminClient
      .from('vendor_applications')
      .update({ status: 'rejected', updated_at: now })
      .eq('id', applicationId);

    if (applicationUpdateError) {
      throw new Error(applicationUpdateError.message ?? 'Başvuru güncellenemedi.');
    }

    await updateRoleRecords(adminClient, userId, 'pending');
    await syncRoleWithApplications(adminClient, userId, 'pending');

    revalidatePath('/admin');
    return { ok: true, message: 'Başvuru reddedildi.' };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ConfigurationError) {
      return { ok: false, message: error.message };
    }

    console.error('rejectVendorApplication error', error);
    return { ok: false, message: 'Başvuru reddedilemedi. Lütfen tekrar deneyin.' };
  }
}

export async function approveCourierApplication(
  formData: FormData,
): Promise<AdminActionResult | AdminActionError> {
  const applicationId = getId(formData, 'applicationId');
  const userId = getId(formData, 'userId');

  if (!applicationId || !userId) {
    return { ok: false, message: 'Başvuru bilgisi eksik.' };
  }

  try {
    const { adminClient } = await ensureAdminSession();

    const now = new Date().toISOString();

    const { error: applicationUpdateError } = await adminClient
      .from('courier_applications')
      .update({ status: 'approved', updated_at: now })
      .eq('id', applicationId);

    if (applicationUpdateError) {
      throw new Error(applicationUpdateError.message ?? 'Başvuru güncellenemedi.');
    }

    await updateRoleRecords(adminClient, userId, 'courier');
    await syncRoleWithApplications(adminClient, userId, 'courier');

    revalidatePath('/admin');
    return { ok: true, message: 'Kurye başvurusu onaylandı.' };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ConfigurationError) {
      return { ok: false, message: error.message };
    }

    console.error('approveCourierApplication error', error);
    return { ok: false, message: 'Kurye başvurusu onaylanamadı.' };
  }
}

export async function rejectCourierApplication(
  formData: FormData,
): Promise<AdminActionResult | AdminActionError> {
  const applicationId = getId(formData, 'applicationId');
  const userId = getId(formData, 'userId');

  if (!applicationId || !userId) {
    return { ok: false, message: 'Başvuru bilgisi eksik.' };
  }

  try {
    const { adminClient } = await ensureAdminSession();

    const now = new Date().toISOString();

    const { error: applicationUpdateError } = await adminClient
      .from('courier_applications')
      .update({ status: 'rejected', updated_at: now })
      .eq('id', applicationId);

    if (applicationUpdateError) {
      throw new Error(applicationUpdateError.message ?? 'Başvuru güncellenemedi.');
    }

    await updateRoleRecords(adminClient, userId, 'pending');
    await syncRoleWithApplications(adminClient, userId, 'pending');

    revalidatePath('/admin');
    return { ok: true, message: 'Kurye başvurusu reddedildi.' };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ConfigurationError) {
      return { ok: false, message: error.message };
    }

    console.error('rejectCourierApplication error', error);
    return { ok: false, message: 'Kurye başvurusu reddedilemedi.' };
  }
}

export async function updateUserRole(
  formData: FormData,
): Promise<AdminActionResult | AdminActionError> {
  const userId = getId(formData, 'userId');
  const role = getRole(formData, 'role');

  if (!userId || !role) {
    return { ok: false, message: 'Kullanıcı bilgisi eksik.' };
  }

  return handleRoleChange(userId, role);
}
