import { cn } from '../../lib/utils';
import { strategyMeta } from '../../lib/arena';
import { Icon } from '../../lib/Icon';
import { AgentAvatar } from '../common/AgentAvatar';
import type { Agent } from '../common/AgentCard';

export interface Unit {
  agent_id: string;
  agentId?: string;
  hp?: number;
  alive?: boolean;
  score?: number;
  color?: string;
  symbol?: string;
  x?: number;
  y?: number;
  lastAction?: { kind?: string };
}

interface AgentRosterProps {
  agents: Agent[];
  units?: Unit[];
  scores?: Array<{ agent_id: string; score: number; hp?: number }>;
  thinking?: Set<string>;
  className?: string;
}

export function AgentRoster({ agents, units = [], scores = [], thinking, className }: AgentRosterProps) {
  const scoreFor = (id: string) =>
    scores.find((s) => s.agent_id === id)?.score ??
    units.find((u) => (u.agent_id || u.agentId) === id)?.score ??
    0;
  const hpFor = (id: string) =>
    scores.find((s) => s.agent_id === id)?.hp ??
    units.find((u) => (u.agent_id || u.agentId) === id)?.hp ??
    100;

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {agents.map((agent) => {
        const strat = strategyMeta(
          (agent.config as { strategy?: string } | undefined)?.strategy ||
            agent.strategy ||
            'balanced',
        );
        const hp = hpFor(agent.id);
        const alive = units.find((u) => (u.agent_id || u.agentId) === agent.id)?.alive !== false;
        const isThinking = thinking?.has(agent.id);
        return (
          <div
            key={agent.id}
            className={cn(
              'rounded-xl border p-3 transition-all',
              alive ? 'glass border-border' : 'border-border/40 bg-muted/20 opacity-50',
              isThinking && 'ring-2 ring-yellow-500/50 animate-pulse',
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <AgentAvatar agent={agent} size="sm" />
                {isThinking && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping" />
                )}
                {!alive && (
                  <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center">
                    <Icon name="Octagon" size={14} className="text-destructive" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate">{agent.name || agent.id}</span>
                  {isThinking && (
                    <span className="font-mono text-[9px] text-yellow-400 animate-pulse">thinking…</span>
                  )}
                </div>
                <div
                  className="flex items-center gap-1 font-mono text-[9px]"
                  style={{ color: strat.color }}
                >
                  <Icon name={strat.icon} size={9} />
                  {strat.label}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-bold text-primary">
                  {scoreFor(agent.id)}
                </div>
                <div className="font-mono text-[8px] text-muted-foreground uppercase">pts</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground w-7">HP</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${hp}%`,
                    background: hp > 50 ? '#34d399' : hp > 25 ? '#fbbf24' : '#f43f5e',
                  }}
                />
              </div>
              <span className="font-mono text-[9px] text-muted-foreground w-8 text-right">
                {hp}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
