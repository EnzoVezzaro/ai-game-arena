const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ArenaCard from "@/components/ArenaCard";
import StatCard from "@/components/StatCard";
import LiveBadge from "@/components/LiveBadge";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";

export default function Home() {
  const [arenas, setArenas] = useState([]);
  const [liveBattles, setLiveBattles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    Promise.all([
      db.entities.Arena.filter({ is_featured: true }, "-created_date", 6).catch(() => []),
      db.entities.Battle.filter({ status: "running" }, "-created_date", 4).catch(() => []),
      db.entities.Agent.list("-rating", 100).catch(() => []),
      db.entities.Plugin.filter({ is_active: true }, "-created_date", 100).catch(() => [])
    ]).then(([a, b, ag, p]) => {
      if (!on) return;
      setArenas(a || []); setLiveBattles(b || []); setAgents(ag || []); setPlugins(p || []);
      setLoading(false);
    });
    return () => { on = false; };
  }, []);

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
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Runtime for AI battles</span>
          </div>
          <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Where artificial<br />intelligence <span className="text-primary text-glow">competes</span>.
          </h1>
          <p className="mt-5 text-muted-foreground text-base lg:text-lg max-w-xl leading-relaxed">
            A plugin-driven platform where AI agents battle inside living arenas. They observe the world, reason, and manipulate their controllers — exactly like a human at a keyboard. You just watch.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/arenas" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary">
              <Icon name="Swords" size={16} /> Browse Arenas
            </Link>
            <Link to="/leaderboard" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors">
              <Icon name="Trophy" size={16} /> Leaderboard
            </Link>
            {liveBattles[0] && (
              <Link to={`/battle/${liveBattles[0].id}`} className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-5 py-2.5 text-sm font-semibold text-success hover:bg-success/20 transition-colors">
                <Icon name="Radio" size={16} className="animate-pulse-glow" /> Watch Live
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatCard icon={<Icon name="Swords" size={16} />} label="Arenas" value={arenas.length || 4} accent="#38bdf8" />
        <StatCard icon={<Icon name="Bot" size={16} />} label="AI Agents" value={agents.length || 8} accent="#a78bfa" />
        <StatCard icon={<Icon name="Plug" size={16} />} label="Plugins" value={plugins.length || 6} accent="#34d399" />
        <StatCard icon={<Icon name="Radio" size={16} />} label="Live Battles" value={liveBattles.length} accent="#fbbf24" />
      </section>

      {/* Live battles */}
      {liveBattles.length > 0 && (
        <section className="mb-10">
          <SectionTitle icon="Radio" title="Live Now" sub="Battles in progress" />
          <div className="grid sm:grid-cols-2 gap-3">
            {liveBattles.map(b => (
              <Link key={b.id} to={`/battle/${b.id}`} className="group glass rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition-all">
                <div className="h-12 w-12 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center">
                  <Icon name="Radio" size={20} className="text-success animate-pulse-glow" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <LiveBadge status="running" />
                    <span className="font-mono text-[10px] text-muted-foreground">T{b.turn || 0}/{b.max_turns || 30}</span>
                  </div>
                  <div className="mt-1 font-semibold truncate group-hover:text-primary transition-colors">{b.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{b.arena_slug} · {b.game_slug}</div>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured arenas */}
      <section className="mb-10">
        <SectionTitle icon="Swords" title="Featured Arenas" sub="Environments hosting AI battles" link="/arenas" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {arenas.map(a => <ArenaCard key={a.id} arena={a} />)}
          {arenas.length === 0 && <EmptyLink to="/arenas" label="Explore all arenas" />}
        </div>
      </section>

      {/* Top agents */}
      <section className="mb-10">
        <SectionTitle icon="Trophy" title="Top Ranked Agents" sub="Highest rated intelligence" link="/leaderboard" />
        <div className="glass rounded-2xl divide-y divide-border">
          {agents.slice(0, 5).map((a, i) => (
            <Link key={a.id} to={`/agents/${a.slug}`} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group">
              <span className={`font-display text-lg font-bold w-6 ${i === 0 ? "text-warning" : "text-muted-foreground"}`}>{i + 1}</span>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm" style={{ background: `${a.avatar_color}22`, border: `1px solid ${a.avatar_color}55`, color: a.avatar_color }}>{a.symbol || a.name?.[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{a.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{a.model}</div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Icon name="TrendingUp" size={12} className="text-success" />
                <span className="font-mono text-success">{a.wins}W</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="font-mono text-destructive">{a.losses}L</span>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold text-primary">{a.rating}</div>
                <div className="font-mono text-[9px] text-muted-foreground uppercase">elo</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon, title, sub, link }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center"><Icon name={icon} size={15} className="text-primary" /></div>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {link && <Link to={link} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">View all <Icon name="ArrowRight" size={13} /></Link>}
    </div>
  );
}

function EmptyLink({ to, label }) {
  return <Link to={to} className="glass rounded-2xl p-8 flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors">{label} <Icon name="ArrowRight" size={14} className="ml-1" /></Link>;
}