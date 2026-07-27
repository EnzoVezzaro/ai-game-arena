import React from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

export default function TurnTimeline({ turn, maxTurns, className }) {
  const pct = Math.min(100, (turn / maxTurns) * 100);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Icon name="Timer" size={12} className="text-primary" />
        <span>TURN</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden relative">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="font-mono text-xs font-bold text-foreground">
        <span className="text-primary">{turn}</span>
        <span className="text-muted-foreground">/{maxTurns}</span>
      </div>
    </div>
  );
}