import { NextResponse } from 'next/server';

import { extractRoleMetadata } from 'lib/auth/roles';
import { createAdminClient } from 'lib/supabase/admin';
import { createClient } from 'lib/supabase/server';

export async function POST() {
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

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Admin client yapılandırması bulunamadı.' }, { status: 500 });
  }

  const roleMetadata = extractRoleMetadata(user) ?? 'customer';

  const { error } = await adminClient
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email,
        role: roleMetadata,
      },
      { onConflict: 'id' },
    );

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Kullanıcı profili senkronize edilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role: roleMetadata });
}
