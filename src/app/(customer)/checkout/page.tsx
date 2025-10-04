import { CheckoutClient } from '@/components/checkout/CheckoutClient';
import { createClient } from 'lib/supabase/server';

const FALLBACK_BRANCHES = [
  {
    id: 'fallback-branch-1',
    name: 'Merkez Şube',
    vendorName: 'KapGel Demo',
  },
];

export default async function CheckoutPage() {
  const supabase = createClient();

  if (!supabase) {
    return <CheckoutClient branches={FALLBACK_BRANCHES} supabaseReady={false} />;
  }

  const { data, error } = await supabase
    .from('branches')
    .select('id,name,vendors(name)')
    .limit(20);

  const branches = !error && Array.isArray(data) && data.length > 0
    ? data.map((branch) => ({
        id: branch.id,
        name: branch.name ?? 'Şube',
        vendorName: (branch as { vendors?: { name?: string } | null })?.vendors?.name ?? undefined,
      }))
    : FALLBACK_BRANCHES;

  return <CheckoutClient branches={branches} supabaseReady={!error && data != null} />;
}
