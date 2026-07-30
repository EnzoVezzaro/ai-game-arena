const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import AgentAvatar from "@/components/AgentAvatar";
import StatCard from "@/components/StatCard";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import LiveBadge from "@/components/LiveBadge";
import AgentSettingsModal from "@/components/AgentSettingsModal";
import { strategyMeta, providerMeta } from "@/lib/arena";

export default function AgentDetail() {
  const { slug } = useParams();
  const [agent, setAgent] = useState(null);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const list = await db.entities.Agent.filter({ slug }, "-rating", 1);
        if (!on || !list?.length) { setLoading(false); return; }
        const a = list[0]; setAgent(a);
        const all = await db.entities.Battle.list("-created_date", 100).catch(() => []);
        if (!on) return;
        setBattles((all || []).filter(b => (b.agent_ids || []).includes(a.id)));
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [slug]);

  if (loading) return <PageLoader label="Loading agent" />;
  if (!agent) return <div className="text-center py-24 text-muted-foreground"><p className="text-sm">Agent not found.</p></div>;

  const strat = strategyMeta(agent.strategy);
  const total = agent.wins + agent.losses + agent.draws || 1;
  const wr = Math.round((agent.wins / total) * 100);

  return (
    <div className="px-4 lg:px-8 py-8 max-w-5xl mx-auto">
      <Link to="/agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-4">
        <Icon name="ArrowLeft" size={13} /> All agents
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 mb-8">
        <div className="absolute inset-0 arena-grid-bg opacity-40" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl opacity-25" style={{ background: agent.avatar_color }} />
        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          <AgentAvatar agent={agent} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: strat.color, background: `${strat.color}1a` }}>
                <Icon name={strat.icon} size={10} />{strat.label}
              </span>
              {agent.is_active && <LiveBadge status="running" label="ACTIVE" />}
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{agent.name}</h1>
            <p className="text-muted-foreground mt-1">{agent.tagline}</p>
            <p className="text-sm text-muted-foreground/80 mt-3 max-w-lg leading-relaxed">{agent.description}</p>
            <div className="mt-4 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/40 px-2 py-1" style={{ color: providerMeta(agent.provider).color }}>
                <Icon name={providerMeta(agent.provider).icon} size={11} /> {providerMeta(agent.provider).label}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="Cpu" size={13} className="text-primary" />
                <span>model: <span className="text-foreground/80">{agent.model || "—"}</span></span>
              </span>
            </div>
            <div className="mt-3">
              <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary px-3 py-2 text-xs font-semibold hover:bg-primary/20 transition-colors">
                <Icon name="Settings" size={13} /> Agent Settings
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl font-bold text-primary text-glow">{agent.rating}</div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">elo rating</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard icon={<Icon name="Trophy" size={16} />} label="Wins" value={agent.wins} accent="#34d399" />
        <StatCard icon={<Icon name="Octagon" size={16} />} label="Losses" value={agent.losses} accent="#f43f5e" />
        <StatCard icon={<Icon name="Scale" size={16} />} label="Win Rate" value={`${wr}%`} accent="#fbbf24" sub={`${agent.draws} draws`} />
        <StatCard icon={<Icon name="Activity" size={16} />} label="Avg Latency" value={`${agent.avg_latency_ms}ms`} accent="#38bdf8" sub={`${agent.avg_tokens} tok`} />
      </div>

      {/* Strategy breakdown */}
      <div className="glass rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <Icon name="BrainCircuit" size={15} className="text-accent" />
          <h3 className="font-display font-bold text-sm">Controller Behavior</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <BehaviorBar label="Aggression" value={agent.strategy === "aggressive" ? 90 : agent.strategy === "balanced" ? 55 : 30} color="#f43f5e" />
          <BehaviorBar label="Defense" value={agent.strategy === "defensive" ? 88 : agent.strategy === "balanced" ? 55 : 35} color="#38bdf8" />
          <BehaviorBar label="Exploration" value={agent.strategy === "scout" ? 92 : agent.strategy === "llm" ? 60 : 50} color="#a78bfa" />
          <BehaviorBar label="Reasoning" value={agent.strategy === "llm" ? 95 : agent.strategy === "balanced" ? 70 : 45} color="#34d399" />
        </div>
      </div>

      {/* Battle history */}
      <div>
        <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2"><Icon name="Radio" size={15} className="text-primary" /> Battle History</h3>
        <div className="space-y-2">
          {battles.map(b => {
            const won = b.winner_agent_id === agent.id;
            return (
              <Link key={b.id} to={`/battle/${b.id}`} className="group glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-all">
                <LiveBadge status={b.status} />
                <span className="text-sm font-medium truncate flex-1 group-hover:text-primary transition-colors">{b.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">{b.arena_slug} · {b.game_slug}</span>
                {b.status === "finished" && (
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{won ? "WIN" : "LOSS"}</span>
                )}
              </Link>
            );
          })}
          {battles.length === 0 && <div className="text-xs text-muted-foreground py-4">No battles recorded yet.</div>}
        </div>
      </div>

      <AgentSettingsModal open={settingsOpen} agent={agent} onClose={() => setSettingsOpen(false)}
        onSave={async (data) => {
          await db.entities.Agent.update(agent.id, data);
          setAgent(prev => ({ ...prev, ...data }));
        }} />
    </div>
  );
}

function BehaviorBar({ label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px]" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}