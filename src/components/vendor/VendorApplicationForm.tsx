'use client';

import Link from 'next/link';
import { useState, useTransition, type SVGProps } from 'react';
import { useRouter } from 'next/navigation';

type VendorApplicationFormProps = {
  initialBusinessName?: string | null;
  initialBusinessType?: string | null;
  initialContactPhone?: string | null;
  status: 'none' | 'pending' | 'approved' | 'rejected';
};

type BusinessTypeOption = {
  value: string;
  label: string;
  available: boolean;
  hint?: string;
};

const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  { value: 'restaurant', label: 'Restoran', available: true },
  { value: 'cafe', label: 'Cafe', available: true },
  { value: 'market', label: 'Market', available: false, hint: 'Çok yakında' },
  { value: 'grocery', label: 'Bakkal', available: false, hint: 'Çok yakında' },
  { value: 'pharmacy', label: 'Eczane', available: false, hint: 'Çok yakında' },
];

export function VendorApplicationForm({
  initialBusinessName,
  initialBusinessType,
  initialContactPhone,
  status,
}: VendorApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [businessName, setBusinessName] = useState(initialBusinessName ?? '');
  const [businessType, setBusinessType] = useState(initialBusinessType ?? 'restaurant');
  const [contactPhone, setContactPhone] = useState(initialContactPhone ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const applicationLocked = status === 'pending' || status === 'approved';

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/vendor/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName,
            businessType,
            contactPhone,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message = typeof payload?.error === 'string' ? payload.error : 'Başvuru tamamlanamadı.';
          setErrorMessage(message);
          return;
        }

        setSuccessMessage('Başvurun alındı. Yönetici onayından sonra e-posta ile bilgilendirileceksin.');
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.');
      }
    });
  }

  return (
    <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-orange-100 bg-white/90 p-8 shadow-lg backdrop-blur">
      <header className="space-y-4 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white">
          KB
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">İşletme Başvurusu</h1>
          <p className="text-sm text-gray-600">
            KapGel işletme paneline erişmek için aşağıdaki bilgileri doldur. Onay süreci sonrası vendor paneli açılacaktır.
          </p>
        </div>
        <StatusBanner status={status} />
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="businessName">
            İşletme Adı
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            placeholder="Örn. KapGel Burger Ataşehir"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
            disabled={applicationLocked || isSubmitting}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-gray-500 disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="businessType">
            İşletme Türü
          </label>
          <select
            id="businessType"
            name="businessType"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            disabled={applicationLocked || isSubmitting}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-60"
          >
            {BUSINESS_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} disabled={!option.available}>
                {option.label}
                {!option.available && option.hint ? ` – ${option.hint}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="contactPhone">
            İletişim Telefonu
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            placeholder="+90 5xx xxx xx xx"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            disabled={applicationLocked || isSubmitting}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-gray-500 disabled:opacity-60"
          />
          <p className="text-xs text-gray-500">Destek ekibimizin sana ulaşması için kullanılacak.</p>
        </div>

        {errorMessage ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-sm font-medium text-emerald-600" role="status">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={applicationLocked || isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {applicationLocked
            ? status === 'approved'
              ? 'Başvurun onaylandı'
              : 'Başvuru incelemede'
            : isSubmitting
              ? 'Başvuru gönderiliyor…'
              : 'Başvuruyu Gönder'}
        </button>
      </form>
    </div>
  );
}

function StatusBanner({ status }: { status: 'none' | 'pending' | 'approved' | 'rejected' }) {
  if (status === 'approved') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        <CheckCircleIcon className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Başvurun onaylandı!</p>
          <p className="mt-1">
            Vendor paneline giriş yaparak menünü yönetmeye başlayabilirsin.
            {' '}
            <Link href="/vendor" className="font-semibold text-emerald-900 underline">
              Paneli aç
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
        <PendingIcon className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Başvurun incelemede</p>
          <p className="mt-1">Onaylandığında e-posta bildirimi alacaksın. Destek ekibimiz genellikle 24 saat içinde dönüş yapıyor.</p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <RejectIcon className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">Başvurun reddedildi</p>
          <p className="mt-1">Bilgilerini güncelleyip tekrar gönderebilirsin. Yardım için <a href="mailto:support@kapgel.com" className="font-semibold underline">support@kapgel.com</a> ile iletişime geç.</p>
        </div>
      </div>
    );
  }

  return null;
}

function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function PendingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function RejectIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
