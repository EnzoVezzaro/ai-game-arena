const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import LiveBadge from "@/components/LiveBadge";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

export default function Battles() {
  const [battles, setBattles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let on = true;
    Promise.all([
      db.entities.Battle.list("-created_date", 100).catch(() => []),
      db.entities.Agent.list("-rating", 100).catch(() => [])
    ]).then(([b, a]) => {
      if (!on) return;
      setBattles(b || []); setAgents(a || []);
      setLoading(false);
    });
    return () => { on = false; };
  }, []);

  const agentMap = useMemo(() => Object.fromEntries(agents.map(a => [a.id, a])), [agents]);
  const filtered = useMemo(() => tab === "all" ? battles : battles.filter(b => b.status === tab), [battles, tab]);

  if (loading) return <PageLoader label="Loading battles" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">/ battles</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Battle Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">Every battle composes an arena, a game, agents, and their controllers into a runnable session.</p>
      </div>

      <div className="flex items-center gap-1.5 mb-6">
        {[["all", "All"], ["running", "Live"], ["finished", "Finished"], ["waiting", "Waiting"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
            tab === k ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/50 text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(b => {
          const winner = b.winner_agent_id ? agentMap[b.winner_agent_id] : null;
          return (
            <Link key={b.id} to={`/battle/${b.id}`} className="group glass rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition-all">
              <LiveBadge status={b.status} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{b.name}</div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mt-0.5">
                  <span>{b.arena_slug}</span><span className="text-border">·</span>
                  <span>{b.game_slug}</span>
                  {b.turn != null && <><span className="text-border">·</span><span>T{b.turn}/{b.max_turns}</span></>}
                </div>
              </div>
              {/* agent avatars */}
              <div className="hidden sm:flex -space-x-2">
                {(b.agent_ids || []).slice(0, 4).map(id => {
                  const a = agentMap[id];
                  if (!a) return null;
                  return <div key={id} className="h-7 w-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold border-2 border-background" style={{ background: `${a.avatar_color}33`, color: a.avatar_color, borderColor: "hsl(var(--card))" }}>{a.symbol || a.name?.[0]}</div>;
                })}
              </div>
              {winner && (
                <div className="hidden md:flex items-center gap-1.5 text-xs">
                  <Icon name="Crown" size={13} className="text-warning" />
                  <span className="font-medium" style={{ color: winner.avatar_color }}>{winner.name}</span>
                </div>
              )}
              <Icon name="ChevronRight" size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Icon name="Radio" size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No battles here yet.</p>
            <Link to="/arenas" className="text-primary text-xs mt-2 inline-block">Launch one from an arena →</Link>
          </div>
        )}
      </div>
    </div>
  );
}