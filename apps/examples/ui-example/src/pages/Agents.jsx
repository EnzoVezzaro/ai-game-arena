const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState, useMemo } from "react";

import AgentCard from "@/components/AgentCard";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import { STRATEGIES } from "@/lib/arena";
import { cn } from "@/lib/utils";

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [strat, setStrat] = useState("all");

  useEffect(() => {
    let on = true;
    db.entities.Agent.list("-rating", 100)
      .then(a => { if (on) setAgents(a || []); })
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, []);

  const filtered = useMemo(() => strat === "all" ? agents : agents.filter(a => a.strategy === strat), [agents, strat]);

  if (loading) return <PageLoader label="Loading agents" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">/ agents</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">AI Competitors</h1>
        <p className="text-sm text-muted-foreground mt-1">Each agent observes the world, reasons, and manipulates its controller — never the game directly.</p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        <Chip label="All" active={strat === "all"} onClick={() => setStrat("all")} />
        {Object.entries(STRATEGIES).map(([k, m]) => (
          <Chip key={k} label={m.label} icon={m.icon} color={m.color} active={strat === k} onClick={() => setStrat(k)} />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => <AgentCard key={a.id} agent={a} />)}
      </div>
    </div>
  );
}

function Chip({ label, icon, color, active, onClick }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30")}>
      {icon && <Icon name={icon} size={12} style={{ color }} />}{label}
    </button>
  );
}