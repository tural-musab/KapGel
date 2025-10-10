import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createAdminClient } from 'lib/supabase/admin';
import { createClient } from 'lib/supabase/server';

const payloadSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessType: z.enum(['restaurant', 'cafe']),
  contactPhone: z
    .string()
    .trim()
    .min(8)
    .max(25)
    .regex(/^[+0-9\s()-]+$/, { message: 'Geçerli bir telefon numarası giriniz.' })
    .optional()
    .or(z.literal('')),
});

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

  const raw = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message ?? 'Geçersiz başvuru verisi.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { businessName, businessType, contactPhone } = parsed.data;

  const { error: upsertError } = await supabase
    .from('vendor_applications')
    .upsert(
      {
        user_id: user.id,
        business_name: businessName,
        business_type: businessType,
        contact_phone: contactPhone && contactPhone.length > 0 ? contactPhone : null,
        status: 'pending',
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message ?? 'Başvuru kaydedilemedi.' }, { status: 500 });
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Admin client yapılandırması bulunamadı.' }, { status: 500 });
  }

  // Update auth metadata and public.users role to vendor_admin_pending
  const { error: metadataError } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      role: 'vendor_admin_pending',
    },
    app_metadata: {
      ...(user.app_metadata ?? {}),
      role: 'vendor_admin_pending',
    },
  });

  if (metadataError) {
    return NextResponse.json({ error: metadataError.message ?? 'Rol güncellenemedi.' }, { status: 500 });
  }

  const { error: userUpdateError } = await adminClient
    .from('users')
    .update({ role: 'vendor_admin_pending' })
    .eq('id', user.id);

  if (userUpdateError) {
    return NextResponse.json({ error: userUpdateError.message ?? 'Kullanıcı rolü kaydedilemedi.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: 'pending' });
}
