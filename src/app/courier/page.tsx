import { ClipboardList, MapPinned } from 'lucide-react';

import { requireRole } from 'lib/auth/server-guard';

export default async function CourierDashboardPlaceholder() {
  await requireRole(['courier', 'admin']);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6">
      <div className="max-w-2xl rounded-3xl border border-sky-100 bg-white/90 p-10 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <MapPinned className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">Kurye Paneli Çok Yakında</h1>
        <p className="mt-4 text-sm text-gray-600">
          Vardiya yönetimi, görev atamaları ve canlı konum paylaşımı üzerinde çalışıyoruz. Bu sayfa yalnızca yetkili
          kurye/admin hesapları tarafından görülebilir.
        </p>
        <div className="mt-8 rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 p-6 text-sm text-sky-700">
          <div className="flex items-center justify-center gap-2 font-medium text-sky-900">
            <ClipboardList className="h-4 w-4" />
            Sıradaki adımlar
          </div>
          <ul className="mt-3 space-y-2 text-left">
            <li>• Vardiya aç/kapat modülü</li>
            <li>• Görev kabul/teslim akışı</li>
            <li>• Realtime konum paylaşımı ve rota görünümü</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
