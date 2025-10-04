import { Suspense } from 'react';

import { LandingClient } from '@/components/landing/LandingClient';
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

async function loadLandingData() {
  const supabase = createClient();

  if (!supabase) {
    return {
      cities: FALLBACK_CITIES,
      vendors: FALLBACK_VENDORS,
      stats: { vendors: 500, customers: 50000, satisfaction: 97 },
      supabaseReady: false,
    };
  }

  const [{ data: citiesData }, { data: vendorsData }] = await Promise.all([
    supabase.from('cities').select('id,name').order('name'),
    supabase
      .from('vendors')
      .select('id,name')
      .limit(12),
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

  return {
    cities: cities.length > 0 ? cities : FALLBACK_CITIES,
    vendors: vendors.length > 0 ? vendors : FALLBACK_VENDORS,
    stats: {
      vendors: Math.max(vendors.length, 480),
      customers: 50000,
      satisfaction: 97,
    },
    supabaseReady: Boolean(citiesData || vendorsData),
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
