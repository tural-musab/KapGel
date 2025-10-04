import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createAdminClient } from 'lib/supabase/admin';
import { requireRole } from 'lib/auth/server-guard';
import type { PrimaryRole } from 'lib/auth/roles';

const transitionPayloadSchema = z.object({
  status: z.enum([
    'CONFIRMED',
    'PREPARING',
    'PICKED_UP',
    'ON_ROUTE',
    'DELIVERED',
    'REJECTED',
    'CANCELED_BY_VENDOR',
  ]),
  note: z.string().trim().max(500).optional(),
});

type OrderRow = {
  id: string;
  status: string;
  customer_id: string | null;
  courier_id: string | null;
  branch_id: string | null;
  created_at: string | null;
};

type TransitionMatrix = Record<PrimaryRole, Partial<Record<string, readonly string[]>>>;

const allowedTransitions: TransitionMatrix = {
  admin: {
    NEW: ['CONFIRMED', 'REJECTED', 'CANCELED_BY_VENDOR'],
    CONFIRMED: ['PREPARING', 'REJECTED', 'CANCELED_BY_VENDOR'],
    PREPARING: ['PICKED_UP', 'CANCELED_BY_VENDOR'],
    PICKED_UP: ['ON_ROUTE', 'DELIVERED'],
    ON_ROUTE: ['DELIVERED'],
    DELIVERED: [],
    REJECTED: [],
    CANCELED_BY_VENDOR: [],
  },
  vendor_admin: {
    NEW: ['CONFIRMED', 'REJECTED'],
    CONFIRMED: ['PREPARING', 'CANCELED_BY_VENDOR'],
    PREPARING: ['PICKED_UP', 'CANCELED_BY_VENDOR'],
    PICKED_UP: ['ON_ROUTE'],
    ON_ROUTE: ['DELIVERED'],
    DELIVERED: [],
    REJECTED: [],
    CANCELED_BY_VENDOR: [],
  },
  courier: {
    PREPARING: ['PICKED_UP'],
    PICKED_UP: ['ON_ROUTE', 'DELIVERED'],
    ON_ROUTE: ['DELIVERED'],
    NEW: [],
    CONFIRMED: [],
    DELIVERED: [],
    REJECTED: [],
    CANCELED_BY_VENDOR: [],
  },
  customer: {},
};

function canTransition(currentStatus: string, nextStatus: string, role: PrimaryRole) {
  if (role === 'admin') {
    return true;
  }

  const allowed = allowedTransitions[role]?.[currentStatus] ?? [];
  return allowed.includes(nextStatus);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const { supabase, role } = await requireRole(['vendor_admin', 'courier', 'admin']);

  const parseResult = transitionPayloadSchema.safeParse(await request.json());
  if (!parseResult.success) {
    const message = parseResult.error.issues[0]?.message ?? 'Geçersiz istek gövdesi';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const nextStatus = parseResult.data.status;

  const { data: order, error } = await supabase
    .from('orders')
    .select('id,status,courier_id,branch_id,customer_id,created_at')
    .eq('id', id)
    .maybeSingle<OrderRow>();

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Sipariş okunamadı.' }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
  }

  if (!canTransition(order.status ?? 'NEW', nextStatus, role)) {
    return NextResponse.json({ error: 'Bu statüye geçiş için yetkiniz yok.' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Supabase yönetici istemcisi yapılandırılmamış.' }, { status: 500 });
  }

  const { error: updateError, data: updatedOrders } = await adminClient
    .from('orders')
    .update({ status: nextStatus })
    .eq('id', id)
    .select('id,status,courier_id,branch_id,customer_id,created_at');

  if (updateError) {
    return NextResponse.json({ error: updateError.message ?? 'Sipariş güncellenemedi.' }, { status: 500 });
  }

  const updatedOrder = updatedOrders?.[0] ?? null;

  return NextResponse.json({ order: updatedOrder });
}
