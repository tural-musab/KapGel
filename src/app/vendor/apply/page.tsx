import { redirect } from 'next/navigation';

import { VendorApplicationForm } from '@/components/vendor/VendorApplicationForm';
import { extractRoleMetadata } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';

type VendorApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export default async function VendorApplyPage() {
  const supabase = createClient();

  if (!supabase) {
    redirect('/login');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/vendor/apply');
  }

  const roleMetadata = extractRoleMetadata(user);

  if (roleMetadata === 'vendor_admin') {
    redirect('/vendor');
  }

  const { data: application } = await supabase
    .from('vendor_applications')
    .select('business_name,business_type,contact_phone,status')
    .eq('user_id', user.id)
    .maybeSingle();

  let status: VendorApplicationStatus = 'none';

  if (application?.status === 'pending') {
    status = 'pending';
  } else if (application?.status === 'approved') {
    status = 'approved';
  } else if (application?.status === 'rejected') {
    status = 'rejected';
  } else if (roleMetadata === 'vendor_admin_pending') {
    status = 'pending';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-6 py-16">
      <VendorApplicationForm
        initialBusinessName={application?.business_name ?? null}
        initialBusinessType={application?.business_type ?? 'restaurant'}
        initialContactPhone={application?.contact_phone ?? null}
        status={status}
      />
    </main>
  );
}
