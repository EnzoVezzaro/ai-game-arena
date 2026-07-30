import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { strategyMeta, providerMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { AgentAvatar } from '../components/common/AgentAvatar';
import { PageLoader } from '../components/common/PageLoader';
import { LiveBadge } from '../components/common/LiveBadge';
import { StatCard } from '../components/common/StatCard';
import type { Agent } from '../components/common/AgentCard';

interface BattleApi {
  id: string;
  arenaId: string;
  state?: { phase?: string; currentTurn?: number };
  status?: string;
  agents?: Array<{ id: string; name?: string }>;
}

interface AgentApi {
  id: string;
  name?: string;
  config?: Record<string, unknown>;
}

function BehaviorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px]" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [battles, setBattles] = useState<BattleApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthResult, setHealthResult] = useState<{
    ok: boolean;
    error?: string;
    providerType?: string;
    response?: string;
  } | null>(null);
  const [testingHealth, setTestingHealth] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!id) return;
    setTestingHealth(true);
    setHealthResult(null);
    try {
      const res = await fetch('/api/agents-health/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentIds: [id] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        ok: boolean;
        results: Array<{
          agentId: string;
          ok: boolean;
          error?: string;
          providerType?: string;
          response?: string;
        }>;
      };
      const r = data.results[0];
      if (r) {
        setHealthResult({ ok: r.ok, error: r.error, providerType: r.providerType, response: r.response });
      }
    } catch (err) {
      setHealthResult({ ok: false, error: (err as Error).message });
    } finally {
      setTestingHealth(false);
    }
  }, [id]);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [agentRes, battlesRes] = await Promise.all([
          fetch(`/api/agents/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch('/api/battles')
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);
        if (!on) return;
        if (agentRes) {
          const a = agentRes as AgentApi;
          const cfg = (a.config || {}) as {
            strategy?: string;
            model?: string;
            provider?: string;
            backstory?: string;
          };
          setAgent({
            id: a.id,
            slug: a.id,
            name: a.name,
            strategy: cfg.strategy,
            model: cfg.model,
            provider: cfg.provider,
            description: cfg.backstory,
            config: a.config,
          });
        }
        const allBattles = (battlesRes as BattleApi[]).filter((b) =>
          (b.agents || []).some((aa) => aa.id === id),
        );
        setBattles(allBattles);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [id]);

  if (loading) return <PageLoader label="Loading agent" />;
  if (!agent)
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p className="text-sm">Agent not found.</p>
      </div>
    );

  const strat = strategyMeta(agent.strategy || 'balanced');
  const providerKey = agent.provider || 'base44';
  const provider = providerMeta(providerKey) ?? {
    label: 'Custom',
    color: '#a78bfa',
    icon: 'CircuitBoard',
  };

  return (
    <div className="px-4 lg:px-8 py-8 max-w-5xl mx-auto">
      <Link
        to="/agents"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-4"
      >
        <Icon name="ArrowLeft" size={13} /> All agents
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 mb-8">
        <div className="absolute inset-0 arena-grid-bg opacity-40" />
        <div
          className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl opacity-25"
          style={{ background: agent.avatar_color || '#38bdf8' }}
        />
        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          <AgentAvatar agent={agent} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                style={{ color: strat.color, background: `${strat.color}1a` }}
              >
                <Icon name={strat.icon} size={10} />
                {strat.label}
              </span>
              <LiveBadge status="running" label="ACTIVE" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {agent.name || agent.id}
            </h1>
            {agent.description && (
              <p className="text-sm text-muted-foreground/80 mt-3 max-w-lg leading-relaxed">
                {agent.description}
              </p>
            )}
            <div className="mt-4 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/40 px-2 py-1"
                style={{ color: provider.color }}
              >
                <Icon name={provider.icon} size={11} /> {provider.label}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="Cpu" size={13} className="text-primary" />
                <span>
                  model: <span className="text-foreground/80">{agent.model || '—'}</span>
                </span>
              </span>
              <button
                type="button"
                onClick={checkHealth}
                disabled={testingHealth}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/40 px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
                title="Test provider connectivity"
              >
                <Icon
                  name={testingHealth ? 'Loader' : 'Play'}
                  size={11}
                  className={testingHealth ? 'animate-spin' : ''}
                />
                {testingHealth ? 'Testing…' : 'Test'}
              </button>
            </div>
            {healthResult && (
              <div
                className={`mt-2 text-[11px] font-mono flex items-start gap-1.5 ${healthResult.ok ? 'text-success' : 'text-destructive'}`}
              >
                <Icon name={healthResult.ok ? 'Circle' : 'X'} size={11} className="mt-0.5 shrink-0" />
                <span className="flex-1">
                  {healthResult.ok
                    ? healthResult.response
                      ? `Response: "${healthResult.response}"`
                      : 'Provider reachable'
                    : `${healthResult.providerType ? `${healthResult.providerType}: ` : ''}${healthResult.error}`}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-display text-4xl font-bold text-primary text-glow">
              {agent.rating ?? 1200}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              elo rating
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={<Icon name="Trophy" size={16} />}
          label="Wins"
          value={agent.wins ?? 0}
          accent="#34d399"
        />
        <StatCard
          icon={<Icon name="Octagon" size={16} />}
          label="Losses"
          value={agent.losses ?? 0}
          accent="#f43f5e"
        />
        <StatCard
          icon={<Icon name="Scale" size={16} />}
          label="Draws"
          value={agent.draws ?? 0}
          accent="#fb7185"
          sub="—"
        />
        <StatCard
          icon={<Icon name="Activity" size={16} />}
          label="Elo"
          value={agent.rating ?? 1200}
          accent="#38bdf8"
        />
      </div>

      <div className="glass rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <Icon name="BrainCircuit" size={15} className="text-accent" />
          <h3 className="font-display font-bold text-sm">Controller Behavior</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <BehaviorBar
            label="Aggression"
            value={agent.strategy === 'aggressive' ? 90 : agent.strategy === 'balanced' ? 55 : 30}
            color="#f43f5e"
          />
          <BehaviorBar
            label="Defense"
            value={agent.strategy === 'defensive' ? 88 : agent.strategy === 'balanced' ? 55 : 35}
            color="#38bdf8"
          />
          <BehaviorBar
            label="Exploration"
            value={agent.strategy === 'scout' ? 92 : agent.strategy === 'llm' ? 60 : 50}
            color="#a78bfa"
          />
          <BehaviorBar
            label="Reasoning"
            value={agent.strategy === 'llm' ? 95 : agent.strategy === 'balanced' ? 70 : 45}
            color="#34d399"
          />
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
          <Icon name="Radio" size={15} className="text-primary" /> Battle History
        </h3>
        <div className="space-y-2">
          {battles.map((b) => {
            const status = b.status || b.state?.phase || 'waiting';
            return (
              <Link
                key={b.id}
                to={`/battle/${b.id}`}
                className="group glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-all"
              >
                <LiveBadge status={status} />
                <span className="text-sm font-medium truncate flex-1 group-hover:text-primary transition-colors">
                  {b.id}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                  {b.arenaId}
                </span>
              </Link>
            );
          })}
          {battles.length === 0 && (
            <div className="text-xs text-muted-foreground py-4">No battles recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentDetail;
