import React from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

export default function BattleControls({ status, speed, onPlay, onPause, onStep, onReset, onSpeedChange, className }) {
  const running = status === "running";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {running ? (
        <button onClick={onPause} className="flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/20 transition-colors">
          <Icon name="Pause" size={14} /> Pause
        </button>
      ) : (
        <button onClick={onPlay} className="flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors">
          <Icon name="Play" size={14} /> Play
        </button>
      )}
      <button onClick={onStep} disabled={running} className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <Icon name="StepForward" size={14} /> Step
      </button>
      <button onClick={onReset} className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium hover:border-primary/40 transition-colors">
        <Icon name="RotateCcw" size={14} /> Reset
      </button>
      <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2 py-1.5">
        <Icon name="Zap" size={12} className="text-primary" />
        {[1, 2, 4].map(s => (
          <button key={s} onClick={() => onSpeedChange(s)} className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors", speed === s ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}