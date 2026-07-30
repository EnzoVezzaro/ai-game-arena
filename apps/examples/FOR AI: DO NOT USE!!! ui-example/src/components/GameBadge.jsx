import React from "react";
import { cn } from "@/lib/utils";

export default function GameBadge({ game, className, onClick }) {
  return (
    <div onClick={onClick} className={cn("flex items-center gap-2.5 rounded-xl border border-border bg-card/50 px-3 py-2", onClick && "cursor-pointer hover:border-primary/40 transition-colors", className)}>
      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-base">{game.icon || "🎯"}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{game.name}</div>
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{game.renderAdapter || 'web'} · {game.grid_size || 8}×{game.grid_size || 8}</div>
      </div>
    </div>
  );
}