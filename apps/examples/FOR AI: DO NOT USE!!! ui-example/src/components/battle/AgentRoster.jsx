import React from "react";
import { cn } from "@/lib/utils";
import { strategyMeta } from "@/lib/arena";
import AgentAvatar from "@/components/AgentAvatar";
import Icon from "@/components/Icon";

export default function AgentRoster({ agents, units = [], scores = [], className }) {
  const scoreFor = (id) => scores.find(s => s.agent_id === id)?.score ?? units.find(u => u.agent_id === id)?.score ?? 0;
  return (
    <div className={cn("space-y-2", className)}>
      {agents.map(agent => {
        const unit = units.find(u => u.agent_id === agent.id) || { hp: 100, maxHp: 100, alive: true };
        const strat = strategyMeta(agent.strategy);
        const alive = unit.alive !== false;
        const score = scoreFor(agent.id);
        return (
          <div key={agent.id} className={cn("rounded-xl border p-3 transition-all", alive ? "glass border-border" : "border-border/40 bg-muted/20 opacity-50")}>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <AgentAvatar agent={agent} size="sm" />
                {!alive && <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center"><Icon name="Octagon" size={14} className="text-destructive" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate">{agent.name}</div>
                <div className="flex items-center gap-1 font-mono text-[9px]" style={{ color: strat.color }}>
                  <Icon name={strat.icon} size={9} />{strat.label}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-bold text-primary">{score}</div>
                <div className="font-mono text-[8px] text-muted-foreground uppercase">pts</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground w-7">HP</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${unit.hp}%`, background: unit.hp > 50 ? "#34d399" : unit.hp > 25 ? "#fbbf24" : "#f43f5e" }} />
              </div>
              <span className="font-mono text-[9px] text-muted-foreground w-8 text-right">{unit.hp}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}