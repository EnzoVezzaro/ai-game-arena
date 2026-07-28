interface TurnTimelineProps {
  currentTurn: number;
  maxTurns: number;
}

export function TurnTimeline({ currentTurn, maxTurns }: TurnTimelineProps) {
  const pct = Math.min(100, maxTurns > 0 ? (currentTurn / maxTurns) * 100 : 0);
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">TURN</span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden relative">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="font-mono text-sm font-bold">
        <span className="text-primary">{currentTurn}</span>
        <span className="text-muted-foreground">/{maxTurns}</span>
      </div>
    </div>
  );
}
