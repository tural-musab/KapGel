import { NextResponse } from 'next/server';

import { createClient } from 'lib/supabase/server';

function resolveRedirectUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  return new URL('/login', base ?? 'http://localhost:3000');
}

export async function POST() {
  const supabase = createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(resolveRedirectUrl(), { status: 302 });
}

export async function GET() {
  return POST();
}
