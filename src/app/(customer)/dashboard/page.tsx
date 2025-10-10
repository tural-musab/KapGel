import Link from 'next/link';

import { requireRole } from 'lib/auth/server-guard';

export default async function CustomerDashboardPage() {
  const { user } = await requireRole(['customer', 'admin']);

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-16 pt-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6">
        <nav className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
              <span className="text-lg font-semibold">M</span>
            </div>
            <div>
              <p className="text-sm font-medium text-orange-600">Hoş geldin</p>
              <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">KapGel Müşteri Paneli</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
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
        </nav>

        <section className="grid gap-6 rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-sm">
          <header className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Hızlı İşlemler</h2>
            <p className="text-sm text-gray-600">
              Favori işletmelerini keşfet, yeni sipariş oluştur veya mevcut siparişlerini takip et.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/"
              className="group flex h-full flex-col justify-between rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-red-50 p-4 text-gray-900 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-600">Sipariş Ver</p>
                <h3 className="text-lg font-semibold">İşletmeleri keşfet</h3>
                <p className="text-sm text-gray-700">Konumuna uygun restoran ve cafe listelerini incele.</p>
              </div>
              <span className="text-sm font-semibold text-orange-600">Keşfet</span>
            </Link>

            <Link
              href="/orders"
              className="group flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-600">Siparişlerim</p>
                <h3 className="text-lg font-semibold">Mevcut durumu görüntüle</h3>
                <p className="text-sm text-gray-700">Aktif siparişlerinin durumunu kontrol et, geçmiş siparişlere göz at.</p>
              </div>
              <span className="text-sm font-semibold text-orange-600">Siparişleri Aç</span>
            </Link>

            <Link
              href="/vendor/apply"
              className="group flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-600">İşletme Sahibi misin?</p>
                <h3 className="text-lg font-semibold">KapGel'e katıl</h3>
                <p className="text-sm text-gray-700">İşletmen için başvuru formunu doldur ve vendor panelini aç.</p>
              </div>
              <span className="text-sm font-semibold text-orange-600">Başvuruyu Başlat</span>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-gray-100 bg-white/70 p-6 text-sm text-gray-600">
          <p>
            Hesabın: <span className="font-medium text-gray-900">{user.email}</span>
          </p>
          <p>
            Siparişlerin ve favori işletmelerin yakında bu panelde listelenecek. Şimdilik ana sayfadan yeni sipariş
            oluşturarak KapGel deneyimini keşfedebilirsin.
          </p>
        </section>
      </div>
    </main>
  );
}
