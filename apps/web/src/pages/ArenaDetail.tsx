import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { categoryMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { LiveBadge } from '../components/common/LiveBadge';
import { PageLoader } from '../components/common/PageLoader';
import type { PluginDetailed } from '../components/common/PluginCard';
import type { Arena } from '../components/common/ArenaCard';

interface ArenaApi {
  id: string;
  name?: string;
  description?: string;
  minPlayers?: number;
  maxPlayers?: number;
  config?: Record<string, unknown>;
}

interface BattleApi {
  id: string;
  arenaId: string;
  state?: { phase?: string; currentTurn?: number };
  status?: string;
  createdAt?: string;
  agents?: Array<{ id: string; name?: string }>;
}

function Section({
  icon,
  title,
  sub,
  children,
}: {
  icon: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Icon name={icon} size={13} className="text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm">{title}</h3>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground py-2">{label}</div>;
}

export function ArenaDetail() {
  const { id } = useParams();
  const [arena, setArena] = useState<ArenaApi | null>(null);
  const [battles, setBattles] = useState<BattleApi[]>([]);
  const [plugins, setPlugins] = useState<PluginDetailed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [arenaRes, battlesRes, pluginsRes] = await Promise.all([
          fetch(`/api/arenas/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch('/api/battles')
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
          fetch('/api/plugins')
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);
        if (!on) return;
        setArena(arenaRes as ArenaApi | null);
        setBattles((battlesRes as BattleApi[]).filter((b) => b.arenaId === id).slice(0, 5));
        const allPlugins = pluginsRes as PluginDetailed[];
        const related = allPlugins.filter((p) => {
          const contribs = (p.contributions as { arenas?: string[] } | undefined)?.arenas;
          return Array.isArray(contribs) && contribs.includes(id || '');
        });
        setPlugins(related.length ? related : allPlugins.slice(0, 4));
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [id]);

  if (loading) return <PageLoader label="Loading arena" />;
  if (!arena)
    return (
      <div className="text-center py-24 text-muted-foreground">
        <Icon name="Circle" size={28} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Arena not found.</p>
      </div>
    );

  const cfg = (arena.config || {}) as {
    category?: string;
    accent_color?: string;
    icon?: string;
    tagline?: string;
    features?: string[];
    game_slugs?: string[];
    plugins?: string[];
  };
  const cat = categoryMeta(cfg.category || 'classic');
  const accent = cfg.accent_color || cat.color;
  const arenaCard: Arena = {
    id: arena.id,
    slug: arena.id,
    name: arena.name || arena.id,
    tagline: cfg.tagline || arena.description || '',
    category: cfg.category || 'classic',
    accent_color: accent,
    icon: cfg.icon || '🎮',
    game_slugs: cfg.game_slugs || [],
  };
  const featured = cfg.game_slugs || arenaCard.game_slugs || [];
  const capacity =
    (arena.maxPlayers ?? 4) - (arena.minPlayers ?? 1) >= 0 ? (arena.maxPlayers ?? 4) : 4;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      <Link
        to="/arenas"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-4"
      >
        <Icon name="ArrowLeft" size={13} /> All arenas
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 mb-8">
        <div className="absolute inset-0 arena-grid-bg opacity-40" />
        <div
          className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl opacity-30"
          style={{ background: accent }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl shrink-0"
            style={{
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 30px -6px ${accent}`,
            }}
          >
            {cfg.icon || '🎮'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                style={{ color: cat.color, background: `${cat.color}1a` }}
              >
                <Icon name={cat.icon} size={10} />
                {cat.label} Arena
              </span>
              <LiveBadge status="running" label={`${capacity} SLOTS`} />
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">
              {arena.name || arena.id}
            </h1>
            <p className="mt-2 text-muted-foreground max-w-xl">
              {arena.description || arenaCard.tagline}
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <Link
              to={`/battle?arena=${arena.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary"
            >
              <Icon name="Radio" size={16} /> Launch Battle
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground">
              composes arena + agents
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section icon="Gamepad2" title="Hosted Games" sub="Games mounted in this arena">
            {featured.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {featured.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-xs"
                  >
                    <Icon name="Gamepad2" size={12} className="text-primary" /> {g}
                  </span>
                ))}
              </div>
            ) : (
              <Empty label="No games registered" />
            )}
          </Section>

          <Section icon="ListTree" title="Arena Features" sub="Capabilities of this environment">
            <div className="flex flex-wrap gap-2">
              {cfg.features && cfg.features.length > 0 ? (
                cfg.features.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-xs"
                  >
                    <Icon name="Check" size={12} className="text-success" /> {f}
                  </span>
                ))
              ) : (
                <Empty label="No features declared" />
              )}
            </div>
          </Section>

          <Section icon="Radio" title="Recent Battles" sub="Matches hosted in this arena">
            {battles.length > 0 ? (
              <div className="space-y-2">
                {battles.map((b) => {
                  const status = b.status || b.state?.phase || 'waiting';
                  return (
                    <Link
                      key={b.id}
                      to={`/battle/${b.id}`}
                      className="w-full flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 hover:border-primary/40 transition-colors text-left"
                    >
                      <LiveBadge status={status} />
                      <span className="text-sm font-medium truncate flex-1">{b.id}</span>
                      {(b.state?.currentTurn ?? 0) > 0 && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          T{b.state?.currentTurn}
                        </span>
                      )}
                      <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Empty label="No battles recorded yet" />
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon="Plug" title="Loaded Plugins" sub={`${plugins.length} plugins`}>
            <div className="space-y-2">
              {plugins.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 p-2.5"
                >
                  <span className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center text-sm">
                    🔌
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="font-mono text-[9px] text-muted-foreground uppercase">
                      {p.category || 'plugin'}
                    </div>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
                </div>
              ))}
              {plugins.length === 0 && <Empty label="No plugins loaded" />}
            </div>
          </Section>

          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="CircuitBoard" size={14} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Manifest
              </span>
            </div>
            <pre className="font-mono text-[10px] text-muted-foreground overflow-x-auto leading-relaxed">{`{
  "id": "${arena.id}",
  "category": "${cfg.category || 'classic'}",
  "plugins": [${(cfg.plugins || []).map((p) => `"${p}"`).join(', ')}],
  "games": [${featured.map((g) => `"${g}"`).join(', ')}],
  "capacity": ${capacity}
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArenaDetail;
