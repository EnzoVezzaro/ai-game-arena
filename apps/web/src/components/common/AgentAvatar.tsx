import { cn } from '../../lib/utils';
import { initials } from '../../lib/arena';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

interface AgentLike {
  avatar_color?: string;
  symbol?: string;
  name?: string;
}

interface AgentAvatarProps {
  agent?: AgentLike;
  size?: AvatarSize;
  symbol?: string;
  className?: string;
}

const AGENT_PALETTE = [
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f43f5e',
  '#fb7185',
  '#22d3ee',
  '#facc15',
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AGENT_PALETTE[h % AGENT_PALETTE.length];
}

export function AgentAvatar({ agent, size = 'md', symbol, className }: AgentAvatarProps) {
  const color = agent?.avatar_color || colorFor(agent?.name || 'AI');
  const sym = symbol || agent?.symbol || initials(agent?.name || 'AI');
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl font-mono font-bold shrink-0',
        SIZES[size],
        className,
      )}
      style={{
        background: `linear-gradient(140deg, ${color}33, ${color}11)`,
        border: `1px solid ${color}66`,
        color,
        boxShadow: `0 0 18px -6px ${color}99`,
      }}
    >
      {sym}
    </div>
  );
}

export default AgentAvatar;
