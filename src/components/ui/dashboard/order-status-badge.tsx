import clsx from 'clsx';
import {
  Bike,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type OrderStatusVariant =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'en_route'
  | 'delivered'
  | 'cancelled';

export interface OrderStatusBadgeConfig {
  label?: string;
  icon?: LucideIcon;
  className?: string;
}

export interface OrderStatusBadgeProps {
  status: OrderStatusVariant | string;
  overrides?: Partial<Record<string, OrderStatusBadgeConfig>>;
  children?: ReactNode;
  className?: string;
}

const BASE_CONFIG: Record<OrderStatusVariant, Required<OrderStatusBadgeConfig>> = {
  pending: {
    label: 'Beklemede',
    icon: Clock,
    className: 'bg-orange-100 text-orange-700',
  },
  preparing: {
    label: 'Hazırlanıyor',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-700',
  },
  ready: {
    label: 'Hazır',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700',
  },
  en_route: {
    label: 'Yolda',
    icon: Bike,
    className: 'bg-indigo-100 text-indigo-700',
  },
  delivered: {
    label: 'Teslim edildi',
    icon: CheckCircle2,
    className: 'bg-gray-100 text-gray-700',
  },
  cancelled: {
    label: 'İptal edildi',
    icon: XCircle,
    className: 'bg-red-100 text-red-700',
  },
};

export function OrderStatusBadge({ status, overrides, children, className }: OrderStatusBadgeProps) {
  const defaultConfig = BASE_CONFIG[status as OrderStatusVariant];
  const customConfig = overrides?.[status];

  const label = children ?? customConfig?.label ?? defaultConfig?.label ?? status;
  const Icon = customConfig?.icon ?? defaultConfig?.icon ?? MapPin;
  const badgeClass = clsx(
    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
    customConfig?.className ?? defaultConfig?.className ?? 'bg-gray-100 text-gray-700',
    className,
  );

  return (
    <span className={badgeClass}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}
