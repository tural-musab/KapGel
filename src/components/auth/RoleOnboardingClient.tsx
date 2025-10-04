'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Home, Store } from 'lucide-react';

import type { AppRoleMetadata } from 'lib/auth/roles';
import { normalizeSelection, resolveRoleRedirect, toPendingMetadata } from 'lib/auth/roles';

const ROLE_CARDS = [
  {
    id: 'customer',
    title: 'Müşteri',
    description: 'Menüleri keşfet, sipariş ver ve canlı takip et.',
    icon: Home,
    highlight: 'Dakik teslimat, kolay ödeme',
  },
  {
    id: 'vendor_admin',
    title: 'İşletme Sahibi',
    description: 'Siparişleri yönet, menünü güncelle, performansını izle.',
    icon: Store,
    highlight: 'Kurye atama ve canlı sipariş akışı',
  },
  {
    id: 'courier',
    title: 'Kurye',
    description: 'Görevlerini yönet, vardiya aç/kapat, konumunu paylaş.',
    icon: Bike,
    highlight: 'Mobil dostu, gerçek zamanlı rota',
  },
] as const;

interface RoleOnboardingClientProps {
  email: string;
  initialRole: AppRoleMetadata;
}

export function RoleOnboardingClient({ email, initialRole }: RoleOnboardingClientProps) {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(() => {
    if (initialRole === 'vendor_admin_pending') {
      return 'İşletme başvurun alındı. Yönetici onayı sonrasında işletme paneline yönlendirileceksin.';
    }
    if (initialRole === 'courier_pending') {
      return 'Kurye başvurun alındı. Operasyon ekibi onayladıktan sonra kurye paneline erişebileceksin.';
    }
    return null;
  });

  const selectionDisabled = initialRole === 'vendor_admin_pending' || initialRole === 'courier_pending';

  async function handleSelection(roleId: string) {
    const normalizedRole = normalizeSelection(roleId);
    if (!normalizedRole || normalizedRole === 'admin') {
      setErrorMessage('Bu rol seçimine izin verilmiyor.');
      return;
    }

    if (selectionDisabled) {
      return;
    }

    setLoadingRole(roleId);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: normalizedRole }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.error === 'string' ? payload.error : 'Rol seçimi kaydedilemedi.';
        throw new Error(message);
      }

      const payload = (await response.json()) as { metadataRole?: string | null };
      const metadataRole = (payload.metadataRole ?? toPendingMetadata(normalizedRole)) as AppRoleMetadata;
      const { target } = resolveRoleRedirect(metadataRole);

      if (metadataRole === 'vendor_admin_pending') {
        setInfoMessage('İşletme başvurun alındı. Yönetici onayı sonrasında işletme paneline yönlendirileceksin.');
      }

      if (metadataRole === 'courier_pending') {
        setInfoMessage('Kurye başvurun alındı. Operasyon ekibi onayladıktan sonra kurye paneline erişebileceksin.');
      }

      router.push(target);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.');
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="w-full max-w-3xl space-y-8">
      <header className="text-center">
        <p className="text-sm font-medium text-orange-600">Merhaba {email}</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Nasıl devam etmek istersin?</h1>
        <p className="mt-2 text-sm text-gray-600">
          Rolünü seçerek sana özel deneyimimizi etkinleştirebilirsin. Vendor veya kurye rolünü seçersen
          başvurun ek onaya tabi olacaktır.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {infoMessage ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700" role="status">
          {infoMessage}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        {ROLE_CARDS.map((card) => {
          const Icon = card.icon;
          const busy = loadingRole != null;
          const isLoading = loadingRole === card.id;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleSelection(card.id)}
              disabled={busy || selectionDisabled}
              className="group flex h-full flex-col justify-between rounded-2xl border border-orange-100 bg-white/90 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
                  {card.highlight}
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{card.title}</h2>
                  <p className="mt-2 text-sm text-gray-600">{card.description}</p>
                </div>
              </div>

              <span className="mt-6 inline-flex items-center text-sm font-semibold text-orange-600">
                {isLoading ? 'Yükleniyor…' : 'Bu rolü seç'}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
