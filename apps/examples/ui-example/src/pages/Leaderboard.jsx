const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AgentCard from "@/components/AgentCard";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import { strategyMeta } from "@/lib/arena";

export default function Leaderboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    db.entities.Agent.list("-rating", 100)
      .then(a => { if (on) setAgents(a || []); })
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, []);

  if (loading) return <PageLoader label="Loading rankings" />;

  const podium = agents.slice(0, 3);
  const rest = agents.slice(3);
  const maxRating = Math.max(...agents.map(a => a.rating), 1);

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">/ leaderboard</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Agent Rankings</h1>
        <p className="text-sm text-muted-foreground mt-1">Rated by battles won, performance, and reasoning quality across all arenas.</p>
      </div>

      {/* Podium */}
      {podium.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8 items-end">
          {[1, 0, 2].map(idx => {
            const a = podium[idx]; if (!a) return <div key={idx} />;
            const strat = strategyMeta(a.strategy);
            const heights = ["h-36", "h-44", "h-32"];
            const medals = ["🥇", "🥈", "🥉"];
            const order = idx === 0 ? "order-2" : idx === 1 ? "order-1" : "order-3";
            return (
              <Link key={a.id} to={`/agents/${a.slug}`} className={`${order} group`}>
                <div className="flex flex-col items-center">
                  <div className="text-2xl mb-1">{medals[idx === 0 ? 0 : idx === 1 ? 1 : 2]}</div>
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center font-mono font-bold" style={{ background: `${a.avatar_color}22`, border: `1px solid ${a.avatar_color}55`, color: a.avatar_color }}>{a.symbol || a.name?.[0]}</div>
                  <div className="mt-1.5 text-xs font-semibold truncate max-w-full">{a.name}</div>
                  <div className="font-mono text-[9px]" style={{ color: strat.color }}>{strat.label}</div>
                  <div className="font-display text-xl font-bold text-primary mt-0.5">{a.rating}</div>
                </div>
                <div className={`${heights[idx === 0 ? 1 : idx === 1 ? 0 : 2]} mt-2 rounded-t-xl border border-border glass flex items-start justify-center pt-2`}>
                  <span className="font-display text-3xl font-bold text-muted-foreground/30">#{idx + 1}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Full ranking with bars */}
      <div className="glass rounded-2xl divide-y divide-border">
        {agents.map((a, i) => {
          const strat = strategyMeta(a.strategy);
          const total = a.wins + a.losses + a.draws || 1;
          const wr = Math.round((a.wins / total) * 100);
          return (
            <Link key={a.id} to={`/agents/${a.slug}`} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group">
              <span className="font-display text-base font-bold w-6 text-muted-foreground">{i + 1}</span>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm" style={{ background: `${a.avatar_color}22`, border: `1px solid ${a.avatar_color}55`, color: a.avatar_color }}>{a.symbol || a.name?.[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{a.name}</div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <span style={{ color: strat.color }}>{strat.label}</span>
                  <span>·</span><span>{a.model}</span>
                </div>
              </div>
              <div className="hidden sm:block w-28">
                <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground mb-0.5"><span>WR</span><span>{wr}%</span></div>
                <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${wr}%` }} /></div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-success">{a.wins}W</span>
                <span className="text-destructive">{a.losses}L</span>
                <span className="text-muted-foreground">{a.draws}D</span>
              </div>
              <div className="text-right w-16">
                <div className="font-display text-lg font-bold text-primary">{a.rating}</div>
                <div className="font-mono text-[9px] text-muted-foreground uppercase">elo</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}