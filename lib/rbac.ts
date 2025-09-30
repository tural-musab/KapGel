import type { SupabaseClient } from '@supabase/supabase-js';

export type Role = 'customer'|'vendor_admin'|'courier'|'admin'|null|undefined;
export type Action = 'read'|'create'|'update'|'delete'|'transition';

type OrderRes = { type:'order'; ownerUserId:string; vendorId?:string|null; courierId?:string|null };

type CanAccessParams = {
  role: Role;
  userId?: string;
  vendorIds?: string[];
  resource: OrderRes; // şimdilik sipariş odağı
  action: Action;
};

function normalizeIds(ids?: string[] | null): string[] {
  if (!Array.isArray(ids)) return [];
  const set = new Set<string>();
  for (const id of ids) {
    if (typeof id === 'string' && id.trim()) {
      set.add(id);
    }
  }
  return [...set];
}

function includesVendorId(vendorIds: string[] | undefined, vendorId: string | null | undefined): boolean {
  if (!vendorId) return false;
  const normalized = normalizeIds(vendorIds ?? []);
  return normalized.includes(vendorId);
}

export function canAccess(p: CanAccessParams): boolean {
  const { role, userId, resource, action, vendorIds } = p;
  if (role === 'admin') return true;
  if (!role) return false;

  if (resource.type === 'order') {
    if (role === 'customer') {
      // müşteri kendi siparişini görebilir, oluşturabilir
      if (action === 'create') return true;
      if (action === 'read') return resource.ownerUserId === userId;
      return false;
    }
    if (role === 'vendor_admin') {
      const allowedActions: Action[] = ['read', 'transition', 'update'];
      if (!allowedActions.includes(action)) return false;
      return includesVendorId(vendorIds, resource.vendorId ?? null);
    }
    if (role === 'courier') {
      // sadece atandığı siparişi günceller/okur
      const assigned = resource.courierId && userId && resource.courierId === userId;
      if (action === 'read') return !!assigned;
      if (action === 'update' || action === 'transition') return !!assigned;
      return false;
    }
  }
  return false;
}

type VendorAuthClaims = Record<string, unknown> | null | undefined;

function coerceVendorIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return normalizeIds(value.filter((item): item is string => typeof item === 'string'));
}

function extractVendorIdsFromClaims(claims: VendorAuthClaims): string[] {
  if (!claims || typeof claims !== 'object') return [];
  const candidateObjects: Record<string, unknown>[] = [];
  candidateObjects.push(claims as Record<string, unknown>);

  const metadataLike = ['app_metadata', 'appMetadata', 'user_metadata', 'userMetadata'];
  for (const key of metadataLike) {
    const value = (claims as Record<string, unknown>)[key];
    if (value && typeof value === 'object') {
      candidateObjects.push(value as Record<string, unknown>);
    }
  }

  const vendorKeys = ['vendor_ids', 'vendorIds', 'vendors', 'https://kapgel.com/vendor_ids'];
  for (const obj of candidateObjects) {
    for (const key of vendorKeys) {
      const maybe = obj[key];
      const parsed = coerceVendorIds(maybe);
      if (parsed.length) return parsed;
    }
  }

  return [];
}

export type VendorAuthContextOptions = {
  jwtClaims?: VendorAuthClaims;
  supabase?: Pick<SupabaseClient, 'from'>;
  userId?: string | null;
};

type SupabaseRow = Record<string, unknown>;

export async function getVendorAuthContext(options: VendorAuthContextOptions = {}): Promise<{ vendorIds: string[] }> {
  const { jwtClaims, supabase, userId } = options;
  const fromClaims = extractVendorIdsFromClaims(jwtClaims);
  if (fromClaims.length) {
    return { vendorIds: fromClaims };
  }

  if (supabase && userId) {
    try {
      const query = supabase
        .from('vendors')
        .select('id')
        .eq('owner_user_id', userId);
      const { data, error } = await query as unknown as { data?: SupabaseRow[] | null; error?: unknown };
      if (!error && Array.isArray(data)) {
        const vendorIds = data
          .map((row) => row?.id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0);
        return { vendorIds: normalizeIds(vendorIds) };
      }
    } catch (error) {
      // ignore and fall through to empty vendor list
    }
  }

  return { vendorIds: [] };
}
