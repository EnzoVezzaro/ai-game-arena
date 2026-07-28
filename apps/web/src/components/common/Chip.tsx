import { cn } from '../../lib/utils';
import { Icon } from '../../lib/Icon';

interface ChipProps {
  label: string;
  icon?: string;
  color?: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, icon, color, count, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30',
      )}
    >
      {icon && <Icon name={icon} size={12} style={color ? { color } : undefined} />}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'font-mono text-[9px] rounded px-1',
            active ? 'bg-primary/20' : 'bg-muted/60',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default Chip;
