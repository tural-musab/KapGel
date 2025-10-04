import { Users, Store, Bike, ShieldCheck } from 'lucide-react';

import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';
import { DashboardStatCardProps } from '@/components/ui/dashboard';
import { createAdminClient } from 'lib/supabase/admin';
import { requireRole } from 'lib/auth/server-guard';

import type { AdminDashboardClientProps } from '@/components/admin/AdminDashboardClient';

function normaliseUser(row: any) {
  return {
    id: row.id as string,
    email: (row.email ?? null) as string | null,
    role: (row.role ?? 'pending') as AdminDashboardClientProps['users'][number]['role'],
    createdAt: (row.created_at ?? null) as string | null,
  } satisfies AdminDashboardClientProps['users'][number];
}

function normaliseVendorApplication(row: any) {
  const userRow = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id as string,
    type: 'vendor' as const,
    businessName: (row.business_name ?? null) as string | null,
    status: (row.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
    createdAt: (row.created_at ?? null) as string | null,
    updatedAt: (row.updated_at ?? null) as string | null,
    user: userRow ? normaliseUser(userRow) : null,
  } satisfies AdminDashboardClientProps['vendorApplications'][number];
}

function normaliseCourierApplication(row: any) {
  const userRow = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id as string,
    type: 'courier' as const,
    vehicleType: (row.vehicle_type ?? null) as string | null,
    status: (row.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
    createdAt: (row.created_at ?? null) as string | null,
    updatedAt: (row.updated_at ?? null) as string | null,
    user: userRow ? normaliseUser(userRow) : null,
  } satisfies AdminDashboardClientProps['courierApplications'][number];
}

function countNewUsersToday(users: AdminDashboardClientProps['users']) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return users.filter((user) => {
    if (!user.createdAt) return false;
    const created = new Date(user.createdAt);
    return created >= today;
  }).length;
}

export default async function AdminDashboardPage() {
  await requireRole(['admin']);

  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error('Supabase service role anahtarı yapılandırılmamış.');
  }

  const [vendorApplicationsResult, courierApplicationsResult, usersResult] = await Promise.all([
    adminClient
      .from('vendor_applications')
      .select('id,business_name,status,created_at,updated_at,users(id,email,role,created_at)')
      .order('created_at', { ascending: true }),
    adminClient
      .from('courier_applications')
      .select('id,vehicle_type,status,created_at,updated_at,users(id,email,role,created_at)')
      .order('created_at', { ascending: true }),
    adminClient
      .from('users')
      .select('id,email,role,created_at')
      .order('created_at', { ascending: true }),
  ]);

  if (vendorApplicationsResult.error) {
    console.error('Vendor applications fetch error', vendorApplicationsResult.error);
  }

  if (courierApplicationsResult.error) {
    console.error('Courier applications fetch error', courierApplicationsResult.error);
  }

  if (usersResult.error) {
    console.error('Users fetch error', usersResult.error);
  }

  const vendorApplications = (vendorApplicationsResult.data ?? []).map(normaliseVendorApplication);
  const courierApplications = (courierApplicationsResult.data ?? []).map(normaliseCourierApplication);
  const allUsers = (usersResult.data ?? []).map(normaliseUser);

  const totalUsers = allUsers.length;
  const pendingVendor = vendorApplications.filter((app) => app.status === 'pending').length;
  const pendingCourier = courierApplications.filter((app) => app.status === 'pending').length;
  const newToday = countNewUsersToday(allUsers);

  const stats: DashboardStatCardProps[] = [
    {
      title: 'Toplam Kullanıcı',
      value: totalUsers.toString(),
      changeLabel: `${pendingVendor + pendingCourier} bekleyen başvuru`,
      trend: 'up',
      icon: Users,
      accentGradient: 'from-orange-500 to-red-500',
      backgroundGradient: 'from-orange-50 to-red-50',
    },
    {
      title: 'Bekleyen İşletme Başvurusu',
      value: pendingVendor.toString(),
      changeLabel: 'Vendor admin onayı bekliyor',
      trend: pendingVendor > 0 ? 'up' : 'down',
      icon: Store,
      accentGradient: 'from-amber-500 to-orange-600',
      backgroundGradient: 'from-amber-50 to-orange-50',
    },
    {
      title: 'Bekleyen Kurye Başvurusu',
      value: pendingCourier.toString(),
      changeLabel: 'Operasyon onayı bekliyor',
      trend: pendingCourier > 0 ? 'up' : 'down',
      icon: Bike,
      accentGradient: 'from-sky-500 to-blue-600',
      backgroundGradient: 'from-sky-50 to-blue-50',
    },
    {
      title: 'Bugün Katılanlar',
      value: newToday.toString(),
      changeLabel: 'Son 24 saat',
      trend: newToday > 0 ? 'up' : 'neutral',
      icon: ShieldCheck,
      accentGradient: 'from-emerald-500 to-green-600',
      backgroundGradient: 'from-emerald-50 to-green-50',
    },
  ];

  return (
    <AdminDashboardClient
      stats={stats}
      vendorApplications={vendorApplications}
      courierApplications={courierApplications}
      users={allUsers}
    />
  );
}
