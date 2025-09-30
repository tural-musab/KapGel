export type Role = 'customer'|'vendor_admin'|'courier'|'admin'|null|undefined;
export type Action = 'read'|'create'|'update'|'delete'|'transition';

type OrderRes = { type:'order'; ownerUserId:string; vendorId?:string|null; courierId?:string|null };

export function canAccess(p: {
  role: Role;
  userId?: string;
  courierId?: string;
  resource: OrderRes; // şimdilik sipariş odağı
  action: Action;
}): boolean {
  const { role, userId, courierId, resource, action } = p;
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
      // detaylı vendor eşlemesi ileride eklenecek
      return action === 'read' || action === 'transition' || action === 'update';
    }
    if (role === 'courier') {
      // sadece atandığı siparişi günceller/okur
      const assigned =
        resource.courierId && courierId && resource.courierId === courierId;
      if (action === 'read') return !!assigned;
      if (action === 'update' || action === 'transition') return !!assigned;
      return false;
    }
  }
  return false;
}
