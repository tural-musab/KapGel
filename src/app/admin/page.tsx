import { Users, Store, Bike, ShieldCheck } from 'lucide-react';

import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';
import { DashboardStatCardProps } from '@/components/ui/dashboard';
import { createAdminClient } from 'lib/supabase/admin';
import { requireRole } from 'lib/auth/server-guard';

import type { AdminDashboardClientProps } from '@/components/admin/AdminDashboardClient';

type SupabaseUserRow = {
  id: string;
  email: string | null;
  role: string | null;
  created_at: string | null;
};

type VendorApplicationRow = {
  id: string;
  business_name: string | null;
  status: 'pending' | 'approved' | 'rejected' | null;
  created_at: string | null;
  updated_at: string | null;
  users: SupabaseUserRow[] | SupabaseUserRow | null;
};

type CourierApplicationRow = {
  id: string;
  vehicle_type: string | null;
  status: 'pending' | 'approved' | 'rejected' | null;
  created_at: string | null;
  updated_at: string | null;
  users: SupabaseUserRow[] | SupabaseUserRow | null;
};

function normaliseUser(row: SupabaseUserRow) {
  return {
    id: row.id,
    email: row.email ?? null,
    role: (row.role ?? 'pending') as AdminDashboardClientProps['users'][number]['role'],
    createdAt: row.created_at ?? null,
  } satisfies AdminDashboardClientProps['users'][number];
}

function takeFirstUser(users: SupabaseUserRow[] | SupabaseUserRow | null) {
  if (!users) return null;
  if (Array.isArray(users)) {
    return users[0] ?? null;
  }
  return users;
}

function normaliseVendorApplication(row: VendorApplicationRow) {
  const userRow = takeFirstUser(row.users);
  return {
    id: row.id,
    type: 'vendor' as const,
    businessName: row.business_name ?? null,
    status: (row.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    user: userRow ? normaliseUser(userRow) : null,
  } satisfies AdminDashboardClientProps['vendorApplications'][number];
}

function normaliseCourierApplication(row: CourierApplicationRow) {
  const userRow = takeFirstUser(row.users);
  return {
    id: row.id,
    type: 'courier' as const,
    vehicleType: row.vehicle_type ?? null,
    status: (row.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
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

  const vendorApplicationsRaw = (vendorApplicationsResult.data ?? []) as VendorApplicationRow[];
  const courierApplicationsRaw = (courierApplicationsResult.data ?? []) as CourierApplicationRow[];
  const allUsersRaw = (usersResult.data ?? []) as SupabaseUserRow[];

  const vendorApplications = vendorApplicationsRaw.map(normaliseVendorApplication);
  const courierApplications = courierApplicationsRaw.map(normaliseCourierApplication);
  const allUsers = allUsersRaw.map(normaliseUser);

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
