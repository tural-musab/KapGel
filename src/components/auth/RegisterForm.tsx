'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from 'lib/supabase/client';

type FormState = {
  fullName: string;
  email: string;
  password: string;
};

type Props = {
  supabaseReady: boolean;
};

export function RegisterForm({ supabaseReady }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ fullName: '', email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const disabled = !supabaseReady || submitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const client = createClient();
    if (!client) {
      setErrorMessage('Supabase yapılandırması eksik olduğu için kayıt oluşturulamıyor.');
      return;
    }

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setErrorMessage('Tüm alanlar zorunludur.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await client.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setErrorMessage(error.message ?? 'Kayıt olurken bir hata oluştu.');
        return;
      }

      if (data.user?.identities?.length === 0) {
        setErrorMessage('Bu e-posta adresi zaten kayıtlı görünüyor.');
        return;
      }

      setSuccessMessage('Kayıt başarılı! E-posta kutunu kontrol et ve doğrulama sonrası giriş yap.');
      setForm({ fullName: '', email: '', password: '' });
      setTimeout(() => {
        router.push('/login');
      }, 4000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white/90 p-8 shadow-lg">
      <header className="mb-6 text-center">
        <p className="text-sm font-medium text-orange-600">KapGel</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Kayıt Ol</h1>
        <p className="mt-2 text-sm text-gray-600">
          Zaten hesabın var mı?{' '}
          <Link className="font-medium text-orange-600" href="/login">
            Giriş Yap
          </Link>
        </p>
      </header>

      {!supabaseReady ? (
        <p className="mb-4 rounded-lg border border-dashed border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          Supabase anahtarları tanımlanmadığı için kayıt devre dışı.
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} aria-label="Kayıt formu">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="fullName">
            Ad Soyad
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            placeholder="Adınız Soyadınız"
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            placeholder="ornek@kapgel.com"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="password">
            Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            placeholder="En az 6 karakter"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            disabled={disabled}
            minLength={6}
            required
          />
        </div>
        {errorMessage ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-sm text-green-600" role="status">
            {successMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Kayıt oluşturuluyor…' : 'Kayıt Ol'}
        </button>
      </form>
    </div>
  );
}
