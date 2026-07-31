import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { strategyMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { PageLoader } from '../components/common/PageLoader';
import type { Agent } from '../components/common/AgentCard';
import { AgentAvatar } from '../components/common/AgentAvatar';

interface AgentApi {
  id: string;
  name?: string;
  config?: Record<string, unknown>;
}

interface LeaderboardRow {
  agentId: string;
  battles: number;
  wins: number;
  totalScore: number;
  bestScore: number;
  updatedAt: number;
}

const mapAgent = (a: AgentApi): Agent => {
  const cfg = (a.config || {}) as { strategy?: string; model?: string };
  return {
    id: a.id,
    slug: a.id,
    name: a.name,
    strategy: cfg.strategy,
    model: cfg.model,
    rating: 1200,
    config: a.config,
  };
};

export function Leaderboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    Promise.all([
      fetch('/api/agents')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/scoreboard/leaderboard')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([agentList, rows]: [AgentApi[], LeaderboardRow[]]) => {
        if (!on) return;
        const byId = new Map<string, LeaderboardRow>();
        for (const row of rows || []) byId.set(row.agentId, row);
        setAgents((agentList || []).map((a) => {
          const base = mapAgent(a);
          const row = byId.get(a.id);
          if (!row) return base;
          const battles = row.battles || 0;
          const wins = row.wins || 0;
          // No loss/draw distinction is recorded by the scoreboard, so
          // derive losses/draws as zero — rating is derived from wins/score.
          const rating = 1200 + wins * 25 + Math.round(row.totalScore / 5);
          return {
            ...base,
            rating,
            wins,
            losses: 0,
            draws: Math.max(0, battles - wins),
          };
        }));
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  if (loading) return <PageLoader label="Loading rankings" />;

  const ranked = [...agents].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const podium = ranked.slice(0, 3);

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          / leaderboard
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Agent Rankings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rated by battles won, performance, and reasoning quality across all arenas.
        </p>
      </div>

      {podium.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8 items-end">
          {[1, 0, 2].map((idx) => {
            const a = podium[idx];
            if (!a) return <div key={idx} />;
            const strat = strategyMeta(a.strategy || 'balanced');
            const heights = ['h-36', 'h-44', 'h-32'];
            const medals = ['🥇', '🥈', '🥉'];
            const order = idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3';
            return (
              <Link key={a.id} to={`/agents/${a.slug || a.id}`} className={`${order} group`}>
                <div className="flex flex-col items-center">
                  <div className="text-2xl mb-1">{medals[idx === 0 ? 0 : idx === 1 ? 1 : 2]}</div>
                  <AgentAvatar agent={a} size="md" />
                  <div className="mt-1.5 text-xs font-semibold truncate max-w-full">
                    {a.name || a.id}
                  </div>
                  <div className="font-mono text-[9px]" style={{ color: strat.color }}>
                    {strat.label}
                  </div>
                  <div className="font-display text-xl font-bold text-primary mt-0.5">
                    {a.rating ?? 1200}
                  </div>
                </div>
                <div
                  className={`${heights[idx === 0 ? 1 : idx === 1 ? 0 : 2]} mt-2 rounded-t-xl border border-border glass flex items-start justify-center pt-2`}
                >
                  <span className="font-display text-3xl font-bold text-muted-foreground/30">
                    #{idx + 1}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="glass rounded-2xl divide-y divide-border">
        {ranked.map((a, i) => {
          const strat = strategyMeta(a.strategy || 'balanced');
          const wins = a.wins ?? 0;
          const losses = a.losses ?? 0;
          const draws = a.draws ?? 0;
          const total = wins + losses + draws || 1;
          const wr = Math.round((wins / total) * 100);
          return (
            <Link
              key={a.id}
              to={`/agents/${a.slug || a.id}`}
              className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group"
            >
              <span className="font-display text-base font-bold w-6 text-muted-foreground">
                {i + 1}
              </span>
              <AgentAvatar agent={a} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                  {a.name || a.id}
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <span style={{ color: strat.color }}>{strat.label}</span>
                  <span>·</span>
                  <span>{a.model || 'unknown'}</span>
                </div>
              </div>
              <div className="hidden sm:block w-28">
                <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground mb-0.5">
                  <span>WR</span>
                  <span>{wr}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${wr}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-success">{wins}W</span>
                <span className="text-destructive">{losses}L</span>
                <span className="text-muted-foreground">{draws}D</span>
              </div>
              <div className="text-right w-16">
                <div className="font-display text-lg font-bold text-primary">
                  {a.rating ?? 1200}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground uppercase">elo</div>
              </div>
            </Link>
          );
        })}
        {ranked.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Icon name="Trophy" size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No ranked agents yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
