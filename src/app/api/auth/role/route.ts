import { NextResponse } from 'next/server';

import { normalizeSelection, toPendingMetadata } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';

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

  const { error: userUpsertError } = await supabase.from('users').upsert(userRow, { onConflict: 'id' });

  if (userUpsertError) {
    return NextResponse.json({ error: userUpsertError.message ?? 'Kullanıcı rolü kaydedilemedi.' }, { status: 500 });
  }

  if (metadataRole === 'vendor_admin_pending') {
    const { error: vendorApplicationError } = await supabase
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
    const { error: courierApplicationError } = await supabase
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

  // 🚀 DEVELOPMENT AUTO-APPROVAL
  // In development, auto-approve applications for faster testing
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_AUTO_APPROVE === 'true') {
    const approvedRole = normalizedRole; // Convert pending to approved role
    
    // Update both metadata and database with approved role
    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: approvedRole },
    });

    if (!updateError) {
      // Update database users table
      await supabase.from('users').upsert(
        { id: user.id, email: user.email, role: approvedRole },
        { onConflict: 'id' }
      );

      // Update application status to approved
      if (metadataRole === 'vendor_admin_pending') {
        await supabase
          .from('vendor_applications')
          .update({ status: 'approved' })
          .eq('user_id', user.id);
      }

      if (metadataRole === 'courier_pending') {
        await supabase
          .from('courier_applications')
          .update({ status: 'approved' })
          .eq('user_id', user.id);
      }

      return NextResponse.json({ 
        metadataRole: approvedRole,
        autoApproved: true,
        message: 'Role approved automatically for development'
      });
    }
  }

  return NextResponse.json({ metadataRole });
}
