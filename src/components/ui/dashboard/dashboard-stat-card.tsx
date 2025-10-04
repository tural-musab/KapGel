import clsx from 'clsx';
import { AlertCircle, Minus, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type DashboardTrend = 'up' | 'down' | 'neutral';

export interface DashboardStatCardProps {
  title: string;
  value: ReactNode;
  changeLabel?: string;
  trend?: DashboardTrend;
  icon?: LucideIcon;
  accentGradient?: string;
  backgroundGradient?: string;
  className?: string;
  description?: string;
}

const trendIcon: Record<DashboardTrend, LucideIcon> = {
  up: TrendingUp,
  down: AlertCircle,
  neutral: Minus,
};

const trendClasses: Record<DashboardTrend, string> = {
  up: 'bg-green-100 text-green-600',
  down: 'bg-red-100 text-red-600',
  neutral: 'bg-gray-100 text-gray-600',
};

export function DashboardStatCard({
  title,
  value,
  changeLabel,
  trend = 'neutral',
  icon: Icon,
  accentGradient = 'from-orange-500 to-red-500',
  backgroundGradient = 'from-white to-white',
  className,
  description,
}: DashboardStatCardProps) {
  const TrendIcon = trendIcon[trend];

  return (
    <div
      className={clsx(
        'bg-gradient-to-br rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-lg',
        backgroundGradient,
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        {Icon ? (
          <div className={clsx('p-3 rounded-xl bg-gradient-to-r shadow-lg text-white', accentGradient)}>
            <Icon className="h-6 w-6" />
          </div>
        ) : (
          <div className="h-12 w-12" />
        )}
        {changeLabel ? (
          <span
            className={clsx(
              'flex items-center space-x-1 rounded-full px-2 py-1 text-xs font-semibold',
              trendClasses[trend],
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{changeLabel}</span>
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
      </div>
    </div>
  );
}
