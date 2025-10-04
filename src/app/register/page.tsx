import { redirect } from 'next/navigation';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { createClient } from 'lib/supabase/server';

export default async function RegisterPage() {
  const supabase = createClient();
  const supabaseReady = Boolean(supabase);

  if (supabaseReady) {
    const {
      data: { user },
    } = await supabase!.auth.getUser();

    if (user) {
      redirect('/');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 p-6">
      <RegisterForm supabaseReady={supabaseReady} />
    </main>
  );
}
