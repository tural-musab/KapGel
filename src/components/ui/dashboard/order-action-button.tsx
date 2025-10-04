'use client';

import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export type OrderActionVariant = 'approve' | 'ready' | 'handover' | 'neutral';

const VARIANT_STYLES: Record<OrderActionVariant, string> = {
  approve: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg',
  ready: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg',
  handover: 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg',
  neutral: 'bg-white text-gray-700 border border-gray-200 hover:border-orange-400',
};

export interface OrderActionButtonProps {
  label: string;
  variant?: OrderActionVariant;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export function OrderActionButton({
  label,
  variant = 'neutral',
  icon: Icon,
  onClick,
  disabled,
  className,
  type = 'button',
}: OrderActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{label}</span>
    </button>
  );
}
