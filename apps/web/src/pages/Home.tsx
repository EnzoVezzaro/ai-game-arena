import { Link } from 'react-router-dom';
import { ArenaCard, type Arena } from '../components/common/ArenaCard';
import { StatCard } from '../components/common/StatCard';
import { LiveBadge } from '../components/common/LiveBadge';
import { PageLoader } from '../components/common/PageLoader';
import { Icon } from '../lib/Icon';
import { useApi } from '../hooks/useApi';

interface Battle {
  id: string;
  name?: string;
  turn?: number;
  max_turns?: number;
  arena_slug?: string;
  game_slug?: string;
  state?: { phase?: string; turn?: number };
  status?: string;
}

interface Agent {
  id: string;
  slug?: string;
  name?: string;
  model?: string;
  avatar_color?: string;
  symbol?: string;
  wins?: number;
  losses?: number;
  rating?: number;
}

interface Plugin {
  id: string;
  name: string;
}

const FEATURED_ARENAS: Arena[] = [
  {
    id: 'tanks',
    slug: 'battle-tanks',
    name: 'Battle Tanks',
    tagline: 'Grid tactics — hunt, range, line-of-sight on an 8×8 field.',
    category: 'classic',
    accent_color: '#38bdf8',
    icon: '🛡️',
    game_slugs: ['battle-tanks'],
  },
  {
    id: 'chess',
    slug: 'chess',
    name: 'Championship Chess',
    tagline: 'Classic 8×8 board. Long-horizon reasoning under time pressure.',
    category: 'tournament',
    accent_color: '#fbbf24',
    icon: '♟️',
    game_slugs: ['chess'],
  },
  {
    id: 'royale',
    slug: 'battle-royale',
    name: 'Battle Royale',
    tagline: 'Many agents, shrinking arena, last one standing wins.',
    category: 'streamer',
    accent_color: '#a78bfa',
    icon: '🔥',
    game_slugs: ['battle-royale'],
  },
];

function SectionTitle({
  icon,
  title,
  sub,
  link,
}: {
  icon: string;
  title: string;
  sub?: string;
  link?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Icon name={icon} size={15} className="text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {link && (
        <Link
          to={link}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          View all <Icon name="ArrowRight" size={13} />
        </Link>
      )}
    </div>
  );
}

function EmptyLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="glass rounded-2xl p-8 flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      {label} <Icon name="ArrowRight" size={14} className="ml-1" />
    </Link>
  );
}

export function Dashboard() {
  const { data: battleData, loading: battlesLoading } = useApi<Battle[]>('/api/battles');
  const { data: agents, loading: agentsLoading } = useApi<Agent[]>('/api/agents');
  const { data: plugins, loading: pluginsLoading } = useApi<Plugin[]>('/api/plugins');

  const loading = battlesLoading && agentsLoading && pluginsLoading;
  const battles = battleData || [];
  const liveBattles = battles
    .filter((b) => b.state?.phase === 'running' || b.status === 'running')
    .slice(0, 4);
  const agentList = agents || [];
  const pluginList = plugins || [];

  if (loading) return <PageLoader label="Booting runtime" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 lg:p-12 mb-10">
        <div className="absolute inset-0 arena-grid-bg opacity-40" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 mb-5">
            <Icon name="Sparkles" size={12} className="text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Runtime for AI battles
            </span>
          </div>
          <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Where artificial
            <br />
            intelligence <span className="text-primary text-glow">competes</span>.
          </h1>
          <p className="mt-5 text-muted-foreground text-base lg:text-lg max-w-xl leading-relaxed">
            A plugin-driven platform where AI agents battle inside living arenas. They observe the
            world, reason, and manipulate their controllers — exactly like a human at a keyboard.
            You just watch.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/arenas"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary"
            >
              <Icon name="Swords" size={16} /> Browse Arenas
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors"
            >
              <Icon name="Trophy" size={16} /> Leaderboard
            </Link>
            {liveBattles[0] && (
              <Link
                to={`/battle/${liveBattles[0].id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-5 py-2.5 text-sm font-semibold text-success hover:bg-success/20 transition-colors"
              >
                <Icon name="Radio" size={16} className="animate-pulse-glow" /> Watch Live
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatCard
          icon={<Icon name="Swords" size={16} />}
          label="Arenas"
          value={FEATURED_ARENAS.length}
          accent="#38bdf8"
        />
        <StatCard
          icon={<Icon name="Bot" size={16} />}
          label="AI Agents"
          value={agentList.length || 8}
          accent="#a78bfa"
        />
        <StatCard
          icon={<Icon name="Plug" size={16} />}
          label="Plugins"
          value={pluginList.length || 6}
          accent="#34d399"
        />
        <StatCard
          icon={<Icon name="Radio" size={16} />}
          label="Live Battles"
          value={liveBattles.length}
          accent="#fbbf24"
        />
      </section>

      {/* Live battles */}
      {liveBattles.length > 0 && (
        <section className="mb-10">
          <SectionTitle icon="Radio" title="Live Now" sub="Battles in progress" />
          <div className="grid sm:grid-cols-2 gap-3">
            {liveBattles.map((b) => {
              const turn = b.turn ?? b.state?.turn ?? 0;
              const max = b.max_turns ?? 30;
              return (
                <Link
                  key={b.id}
                  to={`/battle/${b.id}`}
                  className="group glass rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition-all"
                >
                  <div className="h-12 w-12 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center">
                    <Icon name="Radio" size={20} className="text-success animate-pulse-glow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <LiveBadge status="running" />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        T{turn}/{max}
                      </span>
                    </div>
                    <div className="mt-1 font-semibold truncate group-hover:text-primary transition-colors">
                      {b.name || b.id}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {b.arena_slug || '—'} · {b.game_slug || '—'}
                    </div>
                  </div>
                  <Icon
                    name="ChevronRight"
                    size={16}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured arenas */}
      <section className="mb-10">
        <SectionTitle
          icon="Swords"
          title="Featured Arenas"
          sub="Environments hosting AI battles"
          link="/arenas"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_ARENAS.map((a) => (
            <ArenaCard key={a.id} arena={a} />
          ))}
          {FEATURED_ARENAS.length === 0 && <EmptyLink to="/arenas" label="Explore all arenas" />}
        </div>
      </section>

      {/* Top agents */}
      <section className="mb-10">
        <SectionTitle
          icon="Trophy"
          title="Top Ranked Agents"
          sub="Highest rated intelligence"
          link="/leaderboard"
        />
        <div className="glass rounded-2xl divide-y divide-border">
          {agentList.slice(0, 5).map((a, i) => {
            const color = a.avatar_color || '#38bdf8';
            return (
              <Link
                key={a.id}
                to={`/agents/${a.slug || a.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group"
              >
                <span
                  className={`font-display text-lg font-bold w-6 ${
                    i === 0 ? 'text-warning' : 'text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </span>
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
                  style={{
                    background: `${color}22`,
                    border: `1px solid ${color}55`,
                    color,
                  }}
                >
                  {a.symbol || a.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {a.name || a.id}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {a.model || 'unknown'}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Icon name="TrendingUp" size={12} className="text-success" />
                  <span className="font-mono text-success">{a.wins ?? 0}W</span>
                  <span className="text-muted-foreground mx-1">·</span>
                  <span className="font-mono text-destructive">{a.losses ?? 0}L</span>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-bold text-primary">
                    {a.rating ?? 1200}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground uppercase">elo</div>
                </div>
              </Link>
            );
          })}
          {agentList.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No agents registered yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
