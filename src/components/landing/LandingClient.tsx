'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  MapPin,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';

import { AppHeader } from '@/components/layout/AppHeader';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { DashboardStatCard } from '@/components/ui/dashboard';
import type { AppRoleMetadata, PrimaryRole } from 'lib/auth/roles';

type LandingCity = {
  id: string;
  name: string;
};

type LandingVendor = {
  id: string;
  name: string;
  description?: string | null;
  rating?: number | null;
  minOrder?: number | null;
  category?: string | null;
  cityName?: string | null;
};

type LandingStats = {
  vendors: number;
  customers: number;
  satisfaction: number;
};

export interface LandingClientProps {
  cities: LandingCity[];
  vendors: LandingVendor[];
  stats: LandingStats;
  supabaseReady: boolean;
  session: {
    role: AppRoleMetadata;
    needsOnboarding: boolean;
    target: string;
    email: string | null;
    resolvedRole: PrimaryRole | null;
  };
}

const FALLBACK_FEATURES = [
  {
    title: 'Dakik Teslimat',
    description: 'İstanbul içi ortalama 25 dakikada teslimat',
  },
  {
    title: 'Yerel İşletmeler',
    description: 'Mahallendeki en sevilen işletmeler tek platformda',
  },
  {
    title: 'Canlı Takip',
    description: 'Siparişini harita üzerinden anbean izle',
  },
];

export function LandingClient({ cities, vendors, stats, supabaseReady, session }: LandingClientProps) {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesCity = selectedCity
        ? vendor.cityName === selectedCity || vendor.cityName == null
        : true;
      const matchesSearch = searchTerm
        ? vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesCity && matchesSearch;
    });
  }, [vendors, selectedCity, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-24">
      <InstallPrompt />
      <div className="border-b border-orange-100 bg-white/80">
        <AppHeader
          className="mx-auto max-w-6xl px-6 py-4 text-sm font-medium text-gray-600"
          rightSlot={
            <div className="flex items-center gap-3">
              {session.role ? renderAuthenticatedActions(session) : renderGuestActions()}
            </div>
          }
        />
      </div>

      <header className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-purple-500 opacity-10" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16 pt-20 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-sm font-medium text-orange-600 shadow">
              <Sparkles className="h-4 w-4" /> Yeni nesil sipariş deneyimi
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              <span className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                Şehrindeki tatları
              </span>{' '}
              kapına getiriyoruz
            </h1>
           <p className="max-w-xl text-lg text-gray-600">
             KapGel ile yerel işletmelerden sipariş ver, kuryeni canlı takip et ve dakik teslimat deneyimini yaşa.
           </p>
            <p className="text-sm font-medium text-orange-600">
              %{stats.satisfaction} müşteri memnuniyeti garantisi
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={selectedCity}
                  onChange={(event) => setSelectedCity(event.target.value)}
                >
                  <option value="" className="text-gray-500">Şehir seç</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name} className="text-gray-900">
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="Restoran veya mutfak ara"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-gray-500"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            {!supabaseReady ? (
              <p className="text-sm text-gray-500">
                Supabase yapılandırması bulunamadığı için örnek veriler gösteriliyor.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
            <DashboardStatCard
              title="İşletme"
              value={`${stats.vendors.toLocaleString('tr-TR')}+`}
              changeLabel="Yeni katılımlar"
              icon={Building2}
              accentGradient="from-purple-500 to-indigo-600"
              backgroundGradient="from-purple-50 to-indigo-50"
              trend="up"
            />
            <DashboardStatCard
              title="Mutlu müşteri"
              value={`${stats.customers.toLocaleString('tr-TR')}+`}
              changeLabel="Son 30 gün"
              icon={Star}
              accentGradient="from-yellow-400 to-orange-500"
              backgroundGradient="from-yellow-50 to-orange-100"
              trend="up"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-12 max-w-6xl px-6">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {FALLBACK_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-orange-100 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
                Keşfet
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Popüler işletmeler</h2>
              <p className="text-sm text-gray-600">Favori restoranlarını keşfet</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-gray-800">
              Tümünü gör
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVendors.length === 0 ? (
              <p className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white/80 p-6 text-sm text-orange-700">
                Aramanızla eşleşen işletme bulunamadı. Farklı bir kriter deneyin.
              </p>
            ) : (
              filteredVendors.map((vendor) => (
                <article
                  key={vendor.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white/90 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-40 w-full bg-gradient-to-br from-orange-100 via-white to-red-100" />
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                      <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                        <Star className="h-3.5 w-3.5" />
                        {(vendor.rating ?? 4.7).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {vendor.description ?? 'Yerel işletmelerden özenle hazırlanmış lezzetler.'}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span>{vendor.category ?? 'Restoran'}</span>
                      <span>Min. sipariş {(vendor.minOrder ?? 150).toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function renderGuestActions() {
  return (
    <>
      <Link href="/login" className="hover:text-orange-600">
        Giriş Yap
      </Link>
      <Link
        href="/register"
        className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-white shadow-sm hover:opacity-90"
      >
        Kayıt Ol
      </Link>
    </>
  );
}

function renderAuthenticatedActions(session: LandingClientProps['session']) {
  if (session.needsOnboarding) {
    return (
      <Link
        href="/vendor/apply"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-white shadow-sm hover:opacity-90"
      >
        Rolünü Tamamla
      </Link>
    );
  }

  return (
    <>
      <span className="hidden text-sm text-gray-500 sm:inline">{session.email ?? ''}</span>
      <Link
        href={session.target || '/'}
        className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 shadow-sm transition hover:border-orange-400"
      >
        {session.resolvedRole === 'admin'
          ? 'Yönetim Paneli'
          : session.resolvedRole === 'vendor_admin'
            ? 'İşletme Paneli'
            : session.resolvedRole === 'courier'
              ? 'Kurye Paneli'
              : 'Rolünü Yönet'}
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-white shadow-sm hover:opacity-90"
        >
          Çıkış
        </button>
      </form>
    </>
  );
}
