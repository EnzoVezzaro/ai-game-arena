import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { strategyMeta } from "@/lib/arena";
import AgentAvatar from "@/components/AgentAvatar";
import Icon from "@/components/Icon";

export default function AgentCard({ agent, rank, className }) {
  const strat = strategyMeta(agent.strategy);
  return (
    <Link to={`/agents/${agent.slug}`} className={cn("group relative block rounded-2xl glass p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40", className)}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <AgentAvatar agent={agent} size="md" />
          {rank && (
            <span className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center font-mono text-[10px] font-bold text-primary">{rank}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate">{agent.name}</h4>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px]" style={{ color: strat.color, background: `${strat.color}1a` }}>
              <Icon name={strat.icon} size={9} />
              {strat.label}
            </span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground truncate">{agent.model}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-primary">{agent.rating}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">rating</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-sm font-bold text-success">{agent.wins}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">wins</div>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-sm font-bold text-destructive">{agent.losses}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">losses</div>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-sm font-bold text-muted-foreground">{agent.draws}</div>
          <div className="font-mono text-[9px] text-muted-foreground uppercase">draws</div>
        </div>
      </div>
    </Link>
  );
}