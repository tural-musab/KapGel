'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from 'lib/supabase/client';
import { extractRoleMetadata, resolveRoleRedirect } from 'lib/auth/roles';

type FormState = {
  email: string;
  password: string;
};

type Props = {
  supabaseReady: boolean;
};

export function LoginForm({ supabaseReady }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const disabled = !supabaseReady || submitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const client = createClient();
    if (!client) {
      setErrorMessage('Supabase yapılandırması eksik olduğu için giriş yapılamıyor.');
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setErrorMessage('E-posta ve şifre zorunludur.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        setErrorMessage(error.message ?? 'Giriş yapılırken bir hata oluştu.');
        return;
      }

      const roleMetadata = extractRoleMetadata(data.user);

      try {
        await fetch('/api/auth/sync', { method: 'POST' });
      } catch (syncError) {
        console.warn('Kullanıcı profili senkronizasyonu başarısız oldu', syncError);
      }

      const { target } = resolveRoleRedirect(roleMetadata);

      router.push(target);
      router.refresh();
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
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Giriş Yap</h1>
        <p className="mt-2 text-sm text-gray-600">
          Hesabın yok mu?{' '}
          <Link className="font-medium text-orange-600" href="/register">
            Kayıt Ol
          </Link>
        </p>
      </header>

      {!supabaseReady ? (
        <p className="mb-4 rounded-lg border border-dashed border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          Supabase anahtarları tanımlanmadığı için giriş devre dışı.
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} aria-label="Giriş formu">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-gray-500"
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
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-gray-500"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            disabled={disabled}
            required
          />
        </div>
        {errorMessage ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
