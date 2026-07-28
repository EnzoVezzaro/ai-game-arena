import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { Icon } from '../lib/Icon';
import { LiveBadge } from '../components/common/LiveBadge';
import { PageLoader } from '../components/common/PageLoader';
import { CreateBattleModal, type CreatedBattle } from '../components/common/CreateBattleModal';

interface BattleAgent {
  id: string;
  name?: string;
}

interface Battle {
  id: string;
  arenaId: string;
  agents: BattleAgent[];
  state: { phase?: string; currentTurn?: number };
  createdAt?: string;
  status?: string;
}

type Tab = 'all' | 'running' | 'finished' | 'waiting';

const phaseToStatus = (b: Battle): string => {
  if (b.status) return b.status;
  const p = b.state?.phase;
  if (p === 'running') return 'running';
  if (p === 'completed' || p === 'finished') return 'finished';
  return 'waiting';
};

export function Battles() {
  const { data: battles, loading, refetch } = useApi<Battle[]>('/api/battles');
  const [tab, setTab] = useState<Tab>('all');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(
    () => (battles || []).filter((b) => tab === 'all' || phaseToStatus(b) === tab),
    [battles, tab],
  );

  if (loading) return <PageLoader label="Loading battles" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
            / battles
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Battle Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every battle composes an arena, a game, agents, and their controllers into a runnable
            session. Create one below and run it live.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary shrink-0"
        >
          <Icon name="Plus" size={16} /> New Battle
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-6">
        {(
          [
            ['all', 'All'],
            ['running', 'Live'],
            ['finished', 'Finished'],
            ['waiting', 'Waiting'],
          ] as Array<[Tab, string]>
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              tab === k
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card/50 text-muted-foreground hover:text-foreground',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((b) => {
          const status = phaseToStatus(b);
          const turn = b.state?.currentTurn ?? 0;
          return (
            <Link
              key={b.id}
              to={`/battle/${b.id}`}
              className="group glass rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition-all"
            >
              <LiveBadge status={status} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {b.agents.map((a) => a.name || a.id).join(' vs ') || 'Untitled battle'}
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mt-0.5">
                  <span>{b.arenaId}</span>
                  <span className="text-border">·</span>
                  <span>{b.agents.length} agents</span>
                  {turn > 0 && (
                    <>
                      <span className="text-border">·</span>
                      <span>T{turn}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex -space-x-2">
                {b.agents.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className="h-7 w-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold border-2 border-background bg-muted/60 text-foreground"
                    title={a.name || a.id}
                  >
                    {(a.name || a.id)[0]}
                  </div>
                ))}
              </div>
              <Icon
                name="ChevronRight"
                size={16}
                className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Icon name="Radio" size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No battles here yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-primary text-xs mt-2 inline-block hover:underline"
            >
              Create a new battle →
            </button>
          </div>
        )}
      </div>

      <CreateBattleModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(battle: CreatedBattle) => {
          setShowCreate(false);
          refetch();
          navigate(`/battle/${battle.id}`);
        }}
      />
    </div>
  );
}

export default Battles;
