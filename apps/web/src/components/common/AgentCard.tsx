import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { strategyMeta } from '../../lib/arena';
import { AgentAvatar } from './AgentAvatar';
import { Icon } from '../../lib/Icon';

export interface Agent {
  id: string;
  slug?: string;
  name?: string;
  model?: string;
  avatar_color?: string;
  symbol?: string;
  strategy?: string;
  rating?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  is_active?: boolean;
  tagline?: string;
  description?: string;
  provider?: string;
  avg_latency_ms?: number;
  avg_tokens?: number;
  config?: Record<string, unknown>;
  blocked?: { error: string; turn: number } | null;
}

interface AgentCardProps {
  agent: Agent;
  rank?: number;
  className?: string;
}

export function AgentCard({ agent, rank, className }: AgentCardProps) {
  const strat = strategyMeta(agent.strategy || '');
  const typed = (agent.config as { strategy?: string } | undefined)?.strategy;
  const stratLabel = agent.strategy || typed || 'balanced';
  const stratResolved = strategyMeta(stratLabel);
  const hasHealthIssue = agent.blocked != null && agent.blocked.error != null;
  return (
    <Link
      to={`/agents/${agent.slug || agent.id}`}
      className={cn(
        'group relative block rounded-2xl glass p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40',
        hasHealthIssue ? 'border-destructive/30' : '',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <AgentAvatar agent={agent} size="md" />
          {rank && (
            <span className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center font-mono text-[10px] font-bold text-primary">
              {rank}
            </span>
          )}
          {hasHealthIssue && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive border-2 border-background flex items-center justify-center">
              <Icon name="Dot" size={8} className="text-destructive-foreground" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate">{agent.name || agent.id}</h4>
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px]"
              style={{ color: stratResolved.color, background: `${stratResolved.color}1a` }}
            >
              <Icon name={strat.icon} size={9} />
              {stratResolved.label}
            </span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground truncate">
            {agent.model || 'unknown model'}
          </div>
          {hasHealthIssue && (
            <div className="font-mono text-[9px] text-destructive mt-0.5 truncate">
              {agent.blocked?.error}
            </div>
          )}
          {agent.blocked?.error && (
            <div className="font-mono text-[9px] text-destructive mt-0.5 truncate">
              Blocked: {agent.blocked.error}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-primary">{agent.rating ?? 1200}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">rating</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-sm font-bold text-success">{agent.wins ?? 0}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">wins</div>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-sm font-bold text-destructive">{agent.losses ?? 0}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">losses</div>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-sm font-bold text-muted-foreground">{agent.draws ?? 0}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">draws</div>
        </div>
      </div>
    </Link>
  );
}

export default AgentCard;
