import { NextResponse } from 'next/server';

import { normalizeSelection, toPendingMetadata } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';
import { createAdminClient } from 'lib/supabase/admin';

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

  console.log('🔍 DEBUG: Attempting to upsert user:', {
    userId: user.id,
    email: user.email,
    role: metadataRole,
    authUid: user.id // Should match user.id
  });

  // Use admin client for users table operations to bypass RLS
  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Admin client yapılandırması bulunamadı.' }, { status: 500 });
  }

  const { error: userUpsertError } = await adminClient.from('users').upsert(userRow, { onConflict: 'id' });

  if (userUpsertError) {
    console.error('❌ User upsert error:', {
      error: userUpsertError,
      userId: user.id,
      message: userUpsertError.message
    });
    return NextResponse.json({ error: userUpsertError.message ?? 'Kullanıcı rolü kaydedilemedi.' }, { status: 500 });
  }

  if (metadataRole === 'vendor_admin_pending') {
    const { error: vendorApplicationError } = await adminClient
      .from('vendor_applications')
      .upsert(
        {
          user_id: user.id,
          status: 'pending',
        },
        { onConflict: 'user_id' },
      );

    if (vendorApplicationError) {
      return NextResponse.json({ error: vendorApplicationError.message ?? 'İşletme başvurusu oluşturulamadı.' }, { status: 500 });
    }
  }

  if (metadataRole === 'courier_pending') {
    const { error: courierApplicationError } = await adminClient
      .from('courier_applications')
      .upsert(
        {
          user_id: user.id,
          status: 'pending',
        },
        { onConflict: 'user_id' },
      );

    if (courierApplicationError) {
      return NextResponse.json({ error: courierApplicationError.message ?? 'Kurye başvurusu oluşturulamadı.' }, { status: 500 });
    }
  }



  return NextResponse.json({ metadataRole });
}
