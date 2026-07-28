import { cn } from '../../lib/utils';

interface LiveBadgeProps {
  status?: 'running' | 'paused' | 'finished' | 'waiting' | 'aborted' | string;
  label?: string;
  className?: string;
}

type BadgeEntry = { dot: string; text: string; label: string };

const DEFAULT_ENTRY: BadgeEntry = {
  dot: 'bg-muted-foreground',
  text: 'text-muted-foreground',
  label: 'WAITING',
};

const MAP: Record<string, BadgeEntry> = {
  running: { dot: 'bg-success', text: 'text-success', label: 'LIVE' },
  paused: { dot: 'bg-warning', text: 'text-warning', label: 'PAUSED' },
  finished: { dot: 'bg-primary', text: 'text-primary', label: 'FINISHED' },
  waiting: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'WAITING' },
  aborted: { dot: 'bg-destructive', text: 'text-destructive', label: 'ABORTED' },
};

export function LiveBadge({ status = 'running', label, className }: LiveBadgeProps) {
  const m: BadgeEntry = MAP[status] ?? DEFAULT_ENTRY;
  const resolvedLabel = label || m.label;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider',
        m.text,
        className,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          m.dot,
          status === 'running' && 'animate-pulse-glow',
        )}
      />
      {resolvedLabel}
    </span>
  );
}

export default LiveBadge;
