import { Suspense } from 'react';

import { cookies } from 'next/headers';

import { LandingClient } from '@/components/landing/LandingClient';
import { extractRoleMetadata, resolveRoleRedirect } from 'lib/auth/roles';
import type { AppRoleMetadata, PrimaryRole } from 'lib/auth/roles';
import { createClient } from 'lib/supabase/server';

const FALLBACK_CITIES = [
  { id: 'istanbul', name: 'İstanbul' },
  { id: 'ankara', name: 'Ankara' },
  { id: 'izmir', name: 'İzmir' },
];

const FALLBACK_VENDORS = [
  {
    id: 'fallback-1',
    name: 'Burger House Premium',
    description: 'El yapımı burgerler ve günlük taze ürünler.',
    rating: 4.8,
    minOrder: 150,
    category: 'Burger · Amerikan',
    cityName: 'İstanbul',
  },
  {
    id: 'fallback-2',
    name: 'Pizza Master',
    description: 'Taş fırından çıkan özel tarifler.',
    rating: 4.9,
    minOrder: 120,
    category: 'Pizza · İtalyan',
    cityName: 'İstanbul',
  },
  {
    id: 'fallback-3',
    name: 'Sushi Garden',
    description: 'Uzak Doğu mutfağından özenle seçilmiş tatlar.',
    rating: 4.7,
    minOrder: 200,
    category: 'Sushi · Asya',
    cityName: 'İstanbul',
  },
];

type SessionDescriptor = {
  role: AppRoleMetadata;
  needsOnboarding: boolean;
  target: string;
  email: string | null;
  resolvedRole: PrimaryRole | null;
};

async function resolveMockSession(): Promise<SessionDescriptor | null> {
  const cookieStore = await cookies();
  const mockRole = cookieStore.get('x-mock-role')?.value;
  const email = cookieStore.get('x-mock-email')?.value ?? null;

  if (!mockRole) {
    return null;
  }

  const roleValue = mockRole as AppRoleMetadata;
  const { target, needsOnboarding, role } = resolveRoleRedirect(roleValue);

  return {
    role: roleValue,
    needsOnboarding,
    target,
    email,
    resolvedRole: role ?? null,
  };
}

async function loadLandingData() {
  const supabase = createClient();

  if (!supabase) {
    const mockSession = await resolveMockSession();
    return {
      cities: FALLBACK_CITIES,
      vendors: FALLBACK_VENDORS,
      stats: { vendors: 500, customers: 50000, satisfaction: 97 },
      supabaseReady: false,
      session:
        mockSession ?? {
          role: null,
          needsOnboarding: false,
          target: '/',
          email: null,
          resolvedRole: null,
        },
    };
  }

  const [{ data: citiesData }, { data: vendorsData }, userResult] = await Promise.all([
    supabase.from('cities').select('id,name').order('name'),
    supabase
      .from('vendors')
      .select('id,name')
      .limit(12),
    supabase.auth.getUser(),
  ]);

  const cities = (citiesData ?? []).map((city) => ({ id: city.id, name: city.name }));

  const vendors = (vendorsData ?? []).map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    description: null,
    rating: null,
    minOrder: null,
    category: null,
    cityName: null,
  }));

  const sessionUser = userResult.data?.user ?? null;
  const roleMetadata = extractRoleMetadata(sessionUser);
  const { target, needsOnboarding, role } = resolveRoleRedirect(roleMetadata);

  const mockSession = !sessionUser ? await resolveMockSession() : null;

  return {
    cities: cities.length > 0 ? cities : FALLBACK_CITIES,
    vendors: vendors.length > 0 ? vendors : FALLBACK_VENDORS,
    stats: {
      vendors: Math.max(vendors.length, 480),
      customers: 50000,
      satisfaction: 97,
    },
    supabaseReady: Boolean(citiesData || vendorsData),
    session:
      mockSession ?? {
        role: roleMetadata,
        needsOnboarding,
        target,
        email: sessionUser?.email ?? null,
        resolvedRole: role ?? null,
      },
  };
}

export default async function Home() {
  const data = await loadLandingData();

  return (
    <Suspense fallback={null}>
      <LandingClient {...data} />
    </Suspense>
  );
}
