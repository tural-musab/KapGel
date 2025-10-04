import clsx from 'clsx';
import type { ReactNode } from 'react';

export type TimelineState = 'complete' | 'current' | 'upcoming';

export interface OrderTimelineStep {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  state: TimelineState;
  timestamp?: ReactNode;
}

export interface OrderTimelineProps {
  steps: OrderTimelineStep[];
  className?: string;
  showIndices?: boolean;
}

export function OrderTimeline({ steps, className, showIndices = false }: OrderTimelineProps) {
  return (
    <ol className={clsx('relative border-l border-gray-200', className)}>
      {steps.map((step, index) => {
        const markerClass = clsx('flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold', {
          'border-green-500 bg-green-500 text-white': step.state === 'complete',
          'border-blue-500 bg-blue-500 text-white': step.state === 'current',
          'border-gray-300 bg-white text-gray-500': step.state === 'upcoming',
        });

        const labelClass = clsx('text-lg font-semibold', {
          'text-green-600': step.state === 'complete',
          'text-blue-600': step.state === 'current',
          'text-gray-800': step.state === 'upcoming',
        });

        const timestampClass = clsx('text-xs', {
          'text-green-600': step.state === 'complete',
          'text-blue-600': step.state === 'current',
          'text-gray-500': step.state === 'upcoming',
        });

        return (
          <li key={step.id} className="mb-10 ml-6 last:mb-0">
            <span className={clsx('absolute -left-3', { 'animate-pulse': step.state === 'current' })}>
              <span className={markerClass}>{step.state === 'complete' ? '✓' : showIndices ? index + 1 : ''}</span>
            </span>
            <h3 className={labelClass}>{step.title}</h3>
            {step.timestamp ? <p className={timestampClass}>{step.timestamp}</p> : null}
            {step.description ? <p className="mt-1 text-sm text-gray-600">{step.description}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
