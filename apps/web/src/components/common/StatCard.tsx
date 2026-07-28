import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = '#38bdf8',
  className,
}: StatCardProps) {
  return (
    <div className={cn('glass rounded-2xl p-4 relative overflow-hidden', className)}>
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-30"
        style={{ background: accent }}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div
        className="mt-2 font-display text-2xl font-bold tracking-tight"
        style={{ color: accent }}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default StatCard;
