import Link from 'next/link';
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 via-white to-red-50">
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 transition hover:text-orange-600"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
            K
          </span>
          KapGel
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
          >
            Ana Sayfa
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg"
            >
              Çıkış Yap
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <VendorApplicationForm
          initialBusinessName={application?.business_name ?? null}
          initialBusinessType={application?.business_type ?? 'restaurant'}
          initialContactPhone={application?.contact_phone ?? null}
          status={status}
        />
      </main>
    </div>
  );
}
