import { NextResponse } from 'next/server';

import { normalizeSelection, toPendingMetadata } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';
import { createAdminClient } from 'lib/supabase/admin';
import type { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';

type DbOperation<T> = (client: SupabaseClient) => PromiseLike<PostgrestSingleResponse<T>>;

async function runWithFallback<T>(
  primary: SupabaseClient,
  fallback: SupabaseClient | null,
  operation: DbOperation<T>,
) {
  const primaryResult = await operation(primary);

  if (!primaryResult.error) {
    return primaryResult;
  }

  if (!fallback) {
    return primaryResult;
  }

  console.warn('Supabase primary client failed, retrying with admin client', primaryResult.error);
  return operation(fallback);
}

export async function POST(request: Request) {
  const supabase = createClient();

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase yapılandırması bulunamadı.' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { role?: string | null } | null;
  const desiredRole = payload?.role;
  const normalizedRole = desiredRole ? normalizeSelection(desiredRole) : null;

  if (!normalizedRole || normalizedRole === 'admin') {
    return NextResponse.json({ error: 'Geçersiz rol seçimi.' }, { status: 400 });
  }

  const metadataRole = toPendingMetadata(normalizedRole);

  const { error } = await supabase.auth.updateUser({
    data: {
      role: metadataRole,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Rol güncellenemedi.' }, { status: 500 });
  }

  const userRow = {
    id: user.id,
    email: user.email,
    role: metadataRole,
  } as const;

  const adminClient = createAdminClient();

  const userUpsertResult = await runWithFallback(
    supabase,
    adminClient,
    (client) => client.from('users').upsert(userRow, { onConflict: 'id' }),
  );

  if (userUpsertResult.error) {
    console.error('❌ User upsert error:', {
      error: userUpsertResult.error,
      userId: user.id,
      message: userUpsertResult.error.message,
    });
    return NextResponse.json({ error: userUpsertResult.error.message ?? 'Kullanıcı rolü kaydedilemedi.' }, { status: 500 });
  }

  if (metadataRole === 'vendor_admin_pending') {
    const vendorApplicationResult = await runWithFallback(
      supabase,
      adminClient,
      (client) =>
        client
          .from('vendor_applications')
          .upsert(
            {
              user_id: user.id,
              status: 'pending',
            },
            { onConflict: 'user_id' },
          ),
    );

    if (vendorApplicationResult.error) {
      console.error('Vendor application upsert failed', vendorApplicationResult.error);
      return NextResponse.json({ error: vendorApplicationResult.error.message ?? 'İşletme başvurusu oluşturulamadı.' }, { status: 500 });
    }
  }

  if (metadataRole === 'courier_pending') {
    const courierApplicationResult = await runWithFallback(
      supabase,
      adminClient,
      (client) =>
        client
          .from('courier_applications')
          .upsert(
            {
              user_id: user.id,
              status: 'pending',
            },
            { onConflict: 'user_id' },
          ),
    );

    if (courierApplicationResult.error) {
      console.error('Courier application upsert failed', courierApplicationResult.error);
      return NextResponse.json({ error: courierApplicationResult.error.message ?? 'Kurye başvurusu oluşturulamadı.' }, { status: 500 });
    }
  }



  return NextResponse.json({ metadataRole });
}
