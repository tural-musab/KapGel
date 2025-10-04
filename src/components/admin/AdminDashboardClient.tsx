'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bike,
  CalendarClock,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Store,
  Users,
  XCircle,
} from 'lucide-react';

import {
  approveCourierApplication,
  approveVendorApplication,
  rejectCourierApplication,
  rejectVendorApplication,
  updateUserRole,
  type AdminActionError,
  type AdminActionResult,
} from '@/app/admin/actions';
import { DashboardStatCard } from '@/components/ui/dashboard';
import type { DashboardTrend } from '@/components/ui/dashboard';
import type { AppRoleMetadata } from 'lib/auth/roles';

type ActionResponse = AdminActionResult | AdminActionError;

type RoleOption = {
  value: AppRoleMetadata;
  label: string;
};

const ICON_MAP = {
  users: Users,
  store: Store,
  bike: Bike,
  shield: ShieldCheck,
} as const;

type IconId = keyof typeof ICON_MAP;

type AdminUser = {
  id: string;
  email: string | null;
  role: AppRoleMetadata;
  createdAt: string | null;
};

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

type ApplicationRowBase = {
  id: string;
  status: ApplicationStatus;
  createdAt: string | null;
  updatedAt: string | null;
  user: AdminUser | null;
};

type VendorApplicationRow = ApplicationRowBase & {
  type: 'vendor';
  businessName: string | null;
};

type CourierApplicationRow = ApplicationRowBase & {
  type: 'courier';
  vehicleType: string | null;
};

type AdminStatCard = {
  title: string;
  value: string | number;
  changeLabel?: string;
  trend?: DashboardTrend;
  iconId?: IconId;
  accentGradient?: string;
  backgroundGradient?: string;
  description?: string;
};

export type AdminDashboardClientProps = {
  stats: AdminStatCard[];
  vendorApplications: VendorApplicationRow[];
  courierApplications: CourierApplicationRow[];
  users: AdminUser[];
};

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'vendor_admin', label: 'Vendor Admin' },
  { value: 'vendor_admin_pending', label: 'Vendor Admin (Beklemede)' },
  { value: 'courier', label: 'Kurye' },
  { value: 'courier_pending', label: 'Kurye (Beklemede)' },
  { value: 'customer', label: 'Müşteri' },
  { value: 'pending', label: 'Bekliyor' },
] as const;

function formatDateInput(iso: string | null): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}

function badgeClass(status: ApplicationStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-200';
    default:
      return 'bg-orange-50 text-orange-700 border border-orange-200';
  }
}

function statusLabel(status: ApplicationStatus): string {
  switch (status) {
    case 'approved':
      return 'Onaylandı';
    case 'rejected':
      return 'Reddedildi';
    default:
      return 'Beklemede';
  }
}

function roleLabel(role: AppRoleMetadata): string {
  const option = ROLE_OPTIONS.find((item) => item.value === role);
  return option?.label ?? '—';
}

function createFormData(payload: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.set(key, value);
  });
  return formData;
}

export function AdminDashboardClient({
  stats,
  vendorApplications,
  courierApplications,
  users,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRoleMetadata | ''>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedRoles(
      users.reduce<Record<string, AppRoleMetadata | ''>>((acc, user) => {
        acc[user.id] = user.role ?? 'pending';
        return acc;
      }, {}),
    );
  }, [users]);

  const handleAction = (key: string, action: (formData: FormData) => Promise<ActionResponse>, payload: Record<string, string>) => {
    setFeedback(null);
    setActiveAction(key);

    startTransition(async () => {
      try {
        const result = await action(createFormData(payload));
        if (result.ok) {
          setFeedback({ type: 'success', message: result.message ?? 'İşlem tamamlandı.' });
          router.refresh();
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      } catch (error) {
        console.error('Admin action failed', error);
        setFeedback({ type: 'error', message: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' });
      } finally {
        setActiveAction(null);
      }
    });
  };

  const pendingVendorApps = useMemo(
    () => vendorApplications.filter((item) => item.status === 'pending'),
    [vendorApplications],
  );

  const pendingCourierApps = useMemo(
    () => courierApplications.filter((item) => item.status === 'pending'),
    [courierApplications],
  );

  const roleSummary = useMemo(() => {
    return users.reduce<Record<string, number>>((acc, user) => {
      const key = user.role ?? 'pending';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [users]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 pb-24 pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <header className="mb-10 flex flex-col gap-4">
          <nav className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600">Yönetim Merkezi</p>
                <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">Platform Kontrol Paneli</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
              >
                Ana Sayfa
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
              >
                Oturum Değiştir
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

          <p className="text-sm text-gray-600">
            Başvuruları yönetin, kullanıcı rollerini güncelleyin ve platform sağlığını tek ekrandan takip edin.
          </p>
        </header>

        {feedback ? (
          <div
            className={`mb-8 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
            role={feedback.type === 'success' ? 'status' : 'alert'}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <AlertCircle className="mt-0.5 h-5 w-5" />}
            <div>
              <p className="font-semibold">{feedback.type === 'success' ? 'İşlem başarılı' : 'İşlem başarısız'}</p>
              <p className="mt-1 text-sm">{feedback.message}</p>
            </div>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => {
            const Icon = card.iconId ? ICON_MAP[card.iconId] : undefined;
            return (
              <DashboardStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                changeLabel={card.changeLabel}
                trend={card.trend}
                icon={Icon}
                accentGradient={card.accentGradient}
                backgroundGradient={card.backgroundGradient}
                description={card.description}
              />
            );
          })}
        </section>

        <section className="mt-12 grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-6 backdrop-blur-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Bekleyen İşletme Başvuruları</h2>
                  <p className="text-sm text-gray-600">Vendor admin taleplerini onaylayarak işletme panellerini açabilirsiniz.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                  <Store className="h-4 w-4" /> {pendingVendorApps.length} beklemede
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left">İşletme / Kullanıcı</th>
                      <th className="px-6 py-3 text-left">Durum</th>
                      <th className="px-6 py-3 text-left">Başvuru Tarihi</th>
                      <th className="px-6 py-3 text-left">E-posta</th>
                      <th className="px-6 py-3 text-left">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {vendorApplications.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={5}>
                          Kayıtlı işletme başvurusu bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      vendorApplications.map((application) => {
                        const userEmail = application.user?.email ?? '—';
                        const keyApprove = `vendor-approve-${application.id}`;
                        const keyReject = `vendor-reject-${application.id}`;
                        const busyApprove = isPending && activeAction === keyApprove;
                        const busyReject = isPending && activeAction === keyReject;

                        return (
                          <tr key={application.id} className="hover:bg-orange-50/60">
                            <td className="px-6 py-4 align-top">
                              <p className="font-semibold text-gray-900">{application.businessName ?? 'İşletme adı bekleniyor'}</p>
                              <p className="text-xs text-gray-500">{application.user?.id}</p>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(application.status)}`}>
                                {statusLabel(application.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top text-xs text-gray-600">
                              {formatDateInput(application.createdAt)}
                            </td>
                            <td className="px-6 py-4 align-top text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                {userEmail}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    application.user &&
                                    handleAction(keyApprove, approveVendorApplication, {
                                      applicationId: application.id,
                                      userId: application.user.id,
                                    })
                                  }
                                  disabled={busyApprove || !application.user}
                                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  {busyApprove ? 'Onaylanıyor…' : 'Onayla'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    application.user &&
                                    handleAction(keyReject, rejectVendorApplication, {
                                      applicationId: application.id,
                                      userId: application.user.id,
                                    })
                                  }
                                  disabled={busyReject || !application.user}
                                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <XCircle className="h-4 w-4" />
                                  {busyReject ? 'İptal ediliyor…' : 'Reddet'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white/90 p-6 backdrop-blur-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Bekleyen Kurye Başvuruları</h2>
                  <p className="text-sm text-gray-600">Operasyon ekipleri için kurye erişimlerini buradan yönetebilirsiniz.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                  <Bike className="h-4 w-4" /> {pendingCourierApps.length} beklemede
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left">Kurye / Kullanıcı</th>
                      <th className="px-6 py-3 text-left">Durum</th>
                      <th className="px-6 py-3 text-left">Başvuru Tarihi</th>
                      <th className="px-6 py-3 text-left">E-posta</th>
                      <th className="px-6 py-3 text-left">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {courierApplications.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={5}>
                          Kayıtlı kurye başvurusu bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      courierApplications.map((application) => {
                        const userEmail = application.user?.email ?? '—';
                        const keyApprove = `courier-approve-${application.id}`;
                        const keyReject = `courier-reject-${application.id}`;
                        const busyApprove = isPending && activeAction === keyApprove;
                        const busyReject = isPending && activeAction === keyReject;

                        return (
                          <tr key={application.id} className="hover:bg-sky-50/60">
                            <td className="px-6 py-4 align-top">
                              <p className="font-semibold text-gray-900">{application.user?.id ?? 'Kurye kaydı bekleniyor'}</p>
                              <p className="text-xs text-gray-500">
                                {application.vehicleType ? `Araç türü: ${application.vehicleType}` : 'Araç türü belirtilmedi'}
                              </p>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(application.status)}`}>
                                {statusLabel(application.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top text-xs text-gray-600">{formatDateInput(application.createdAt)}</td>
                            <td className="px-6 py-4 align-top text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                {userEmail}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    application.user &&
                                    handleAction(keyApprove, approveCourierApplication, {
                                      applicationId: application.id,
                                      userId: application.user.id,
                                    })
                                  }
                                  disabled={busyApprove || !application.user}
                                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  {busyApprove ? 'Onaylanıyor…' : 'Onayla'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    application.user &&
                                    handleAction(keyReject, rejectCourierApplication, {
                                      applicationId: application.id,
                                      userId: application.user.id,
                                    })
                                  }
                                  disabled={busyReject || !application.user}
                                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <XCircle className="h-4 w-4" />
                                  {busyReject ? 'İptal ediliyor…' : 'Reddet'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white/90 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-gray-900">Rol Dağılımı</h3>
              <p className="mt-1 text-xs text-gray-500">Toplam {users.length} kullanıcı.</p>
              <dl className="mt-4 space-y-3 text-sm text-gray-700">
                {ROLE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <dt className="font-medium text-gray-800">{option.label}</dt>
                    <dd className="font-semibold text-gray-900">{roleSummary[option.value ?? 'pending'] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/70 p-6 text-sm text-orange-700">
              <p className="font-semibold text-orange-800">İpucu</p>
              <p className="mt-2">
                Rol değişimi yaptığınızda hem `auth.users` metadata kaydı hem de `public.users` tablosu otomatik olarak
                güncellenir. Vendor/kurye başvurularının durumu rol seçiminize göre senkronize edilir.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-12 rounded-2xl border border-gray-100 bg-white/90 p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Kullanıcı & Rol Yönetimi</h2>
              <p className="text-sm text-gray-600">Platformdaki tüm kullanıcıların rollerini tek noktadan güncelleyin.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              {users.length} kullanıcı
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">Kullanıcı</th>
                  <th className="px-6 py-3 text-left">Mevcut Rol</th>
                  <th className="px-6 py-3 text-left">Kayıt Tarihi</th>
                  <th className="px-6 py-3 text-left">Rol Değiştir</th>
                  <th className="px-6 py-3 text-left">Kaydet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {users.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={5}>
                      Henüz kullanıcı kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const selectedRole = selectedRoles[user.id] ?? '';
                    const keyUpdate = `user-role-${user.id}`;
                    const busy = isPending && activeAction === keyUpdate;
                    const isDirty = selectedRole !== (user.role ?? 'pending');

                    return (
                      <tr key={user.id} className="hover:bg-orange-50/40">
                        <td className="px-6 py-4 align-top">
                          <p className="font-semibold text-gray-900">{user.email ?? 'E-posta tanımlı değil'}</p>
                          <p className="text-xs text-gray-500">{user.id}</p>
                        </td>
                        <td className="px-6 py-4 align-top text-sm font-medium text-gray-800">{roleLabel(user.role ?? 'pending')}</td>
                        <td className="px-6 py-4 align-top text-xs text-gray-600">{formatDateInput(user.createdAt)}</td>
                        <td className="px-6 py-4 align-top">
                          <select
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                            value={selectedRole ?? ''}
                            onChange={(event) =>
                              setSelectedRoles((prev) => ({
                                ...prev,
                                [user.id]: event.target.value as AppRoleMetadata,
                              }))
                            }
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value ?? 'null'} value={option.value ?? ''}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <button
                            type="button"
                            onClick={() =>
                              selectedRole &&
                              handleAction(keyUpdate, updateUserRole, {
                                userId: user.id,
                                role: selectedRole,
                              })
                            }
                            disabled={busy || !selectedRole || !isDirty}
                            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {busy ? 'Güncelleniyor…' : 'Güncelle'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4 text-xs text-gray-600">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-orange-500" />
              Rol değişimleri Supabase ile otomatik senkronize edilir.
            </div>
            <div className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-gray-400" />
              Kullanıcı başvurularının tarihçesi `vendor_applications` ve `courier_applications` tablolarında tutulur.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
