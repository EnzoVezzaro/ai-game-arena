const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { categoryMeta } from "@/lib/arena";
import Icon from "@/components/Icon";
import GameBadge from "@/components/GameBadge";
import LiveBadge from "@/components/LiveBadge";
import PageLoader from "@/components/PageLoader";

export default function ArenaDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [arena, setArena] = useState(null);
  const [games, setGames] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const arenas = await db.entities.Arena.filter({ slug }, "-created_date", 1);
        if (!on || !arenas?.length) { setLoading(false); return; }
        const ar = arenas[0];
        setArena(ar);
        const [g, p, b] = await Promise.all([
          db.entities.Game.list("-created_date", 100).catch(() => []),
          db.entities.Plugin.list("-created_date", 100).catch(() => []),
          db.entities.Battle.filter({ arena_slug: slug }, "-created_date", 5).catch(() => [])
        ]);
        if (!on) return;
        const arenaGames = (g || []).filter(gx => (ar.game_slugs || []).includes(gx.slug));
        setGames(arenaGames.length ? arenaGames : (g || []));
        setPlugins((p || []).filter(pl => (ar.plugins || []).includes(pl.slug) || (ar.plugins || []).includes(pl.name)));
        setBattles(b || []);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [slug]);

  if (loading) return <PageLoader label="Loading arena" />;
  if (!arena) return <NotFound label="Arena not found" />;

  const cat = categoryMeta(arena.category);
  const accent = arena.accent_color || cat.color;
  const launchGame = (arena.game_slugs || [])[0] || games[0]?.slug;

  const launch = () => nav(`/battle?arena=${arena.slug}&game=${launchGame}`);

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 mb-8">
        <div className="absolute inset-0 arena-grid-bg opacity-40" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl opacity-30" style={{ background: accent }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl shrink-0" style={{ background: `${accent}22`, border: `1px solid ${accent}55`, boxShadow: `0 0 30px -6px ${accent}` }}>
            {arena.icon || "🎮"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: cat.color, background: `${cat.color}1a` }}>
                <Icon name={cat.icon} size={10} />{cat.label} Arena
              </span>
              <LiveBadge status="running" label={`${arena.capacity || 4} SLOTS`} />
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">{arena.name}</h1>
            <p className="mt-2 text-muted-foreground max-w-xl">{arena.description}</p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <button onClick={launch} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary">
              <Icon name="Radio" size={16} /> Launch Battle
            </button>
            <span className="font-mono text-[10px] text-muted-foreground">composes arena + game + agents</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section icon="Gamepad2" title="Hosted Games" sub="Games this arena can mount">
            <div className="grid sm:grid-cols-2 gap-3">
              {games.map(g => (
                <GameBadge key={g.id} game={g} onClick={() => nav(`/battle?arena=${arena.slug}&game=${g.slug}`)} />
              ))}
              {games.length === 0 && <Empty label="No games registered" />}
            </div>
          </Section>

          <Section icon="ListTree" title="Arena Features" sub="Capabilities of this environment">
            <div className="flex flex-wrap gap-2">
              {(arena.features || []).map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-xs">
                  <Icon name="Check" size={12} className="text-success" /> {f}
                </span>
              ))}
              {(arena.features || []).length === 0 && <Empty label="No features declared" />}
            </div>
          </Section>

          {battles.length > 0 && (
            <Section icon="Radio" title="Recent Battles" sub="Matches hosted in this arena">
              <div className="space-y-2">
                {battles.map(b => (
                  <button key={b.id} onClick={() => nav(`/battle/${b.id}`)} className="w-full flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 hover:border-primary/40 transition-colors text-left">
                    <LiveBadge status={b.status} />
                    <span className="text-sm font-medium truncate flex-1">{b.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{b.game_slug}</span>
                    <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section icon="Plug" title="Loaded Plugins" sub={`${plugins.length} plugins active`}>
            <div className="space-y-2">
              {plugins.map(p => (
                <div key={p.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 p-2.5">
                  <span className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center text-sm">{p.icon || "🔌"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="font-mono text-[9px] text-muted-foreground uppercase">{p.category}</div>
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
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Manifest</span>
            </div>
            <pre className="font-mono text-[10px] text-muted-foreground overflow-x-auto leading-relaxed">{`{
  "id": "${arena.slug}",
  "category": "${arena.category}",
  "plugins": [${(arena.plugins || []).map(p => `"${p}"`).join(", ")}],
  "game": "${launchGame}",
  "capacity": ${arena.capacity || 4}
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, sub, children }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center"><Icon name={icon} size={13} className="text-primary" /></div>
        <div>
          <h3 className="font-display font-bold text-sm">{title}</h3>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
function Empty({ label }) { return <div className="text-xs text-muted-foreground py-2">{label}</div>; }
function NotFound({ label }) { return <div className="text-center py-24 text-muted-foreground"><Icon name="Circle" size={28} className="mx-auto mb-3 opacity-40" /><p className="text-sm">{label}</p></div>; }